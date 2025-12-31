#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import hashlib
import hmac
import json
import time
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import secrets
import logging
from typing import Tuple, Optional
from key_manager import KeyManager, EnvironmentKeyManager

sys.stdout.reconfigure(line_buffering=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/security.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DEBUG_FILE = 'debug.log'

def debug_log(message):
    with open(DEBUG_FILE, 'a', encoding='utf-8') as f:
        f.write(message + '\n')
    logger.debug(message)

class ServerEncryptionManager:
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager
        self.backend = default_backend()
        self.encryption_key = None
        self._load_encryption_key()
    
    def _load_encryption_key(self):
        try:
            env_key_manager = EnvironmentKeyManager()
            self.encryption_key = env_key_manager.get_encryption_key()
            logger.info("加密密钥加载成功")
        except Exception as e:
            logger.warning(f"无法从环境变量加载加密密钥: {e}, 生成新密钥")
            self.encryption_key = self.key_manager.generate_key()
            logger.info("已生成新的加密密钥")
    
    def encrypt_data(self, data: str) -> dict:
        iv = os.urandom(12)
        aesgcm = AESGCM(self.encryption_key)
        
        data_bytes = data.encode('utf-8')
        encrypted = aesgcm.encrypt(iv, data_bytes, None)
        
        return {
            'iv': base64.b64encode(iv).decode('utf-8'),
            'data': base64.b64encode(encrypted).decode('utf-8')
        }
    
    def decrypt_data(self, encrypted_data: dict) -> str:
        try:
            iv = base64.b64decode(encrypted_data['iv'])
            encrypted = base64.b64decode(encrypted_data['data'])
            
            aesgcm = AESGCM(self.encryption_key)
            decrypted = aesgcm.decrypt(iv, encrypted, None)
            
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"解密失败: {e}")
            raise ValueError("解密失败，数据可能已损坏")
    
    def encrypt_object(self, obj: dict) -> dict:
        json_str = json.dumps(obj, ensure_ascii=False)
        return self.encrypt_data(json_str)
    
    def decrypt_object(self, encrypted_data: dict) -> dict:
        json_str = self.decrypt_data(encrypted_data)
        return json.loads(json_str)

class SecureTencentTranslationProxy:
    def __init__(self, encryption_manager: ServerEncryptionManager):
        self.encryption_manager = encryption_manager
        self.env_key_manager = EnvironmentKeyManager()
        
        try:
            self.secret_id, self.secret_key = self.env_key_manager.get_tencent_credentials()
            logger.info("腾讯API凭证加载成功")
        except Exception as e:
            logger.error(f"腾讯API凭证加载失败: {e}")
            raise
        
        self.endpoint = 'tmt.tencentcloudapi.com'
        self.service = 'tmt'
        self.version = '2018-03-21'
        self.region = 'ap-guangzhou'
        self.action = 'TextTranslate'
    
    def sha256_hex(self, s):
        if isinstance(s, bytes):
            return hashlib.sha256(s).hexdigest()
        else:
            return hashlib.sha256(s.encode('utf-8')).hexdigest()
    
    def hmac_sha256(self, key, msg):
        if isinstance(key, bytes):
            if isinstance(msg, bytes):
                return hmac.new(key, msg, hashlib.sha256).digest()
            else:
                return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()
        else:
            if isinstance(msg, bytes):
                return hmac.new(key.encode('utf-8'), msg, hashlib.sha256).digest()
            else:
                return hmac.new(key.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).digest()
    
    def hmac_sha256_hex(self, key, msg):
        if isinstance(key, bytes):
            if isinstance(msg, bytes):
                return hmac.new(key, msg, hashlib.sha256).hexdigest()
            else:
                return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).hexdigest()
        else:
            if isinstance(msg, bytes):
                return hmac.new(key.encode('utf-8'), msg, hashlib.sha256).hexdigest()
            else:
                return hmac.new(key.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def generate_signature(self, payload):
        timestamp = int(time.time())
        date = time.strftime('%Y-%m-%d', time.gmtime(timestamp))
        
        http_request_method = 'POST'
        canonical_uri = '/'
        canonical_query_string = ''
        canonical_headers = 'content-type:application/json\nhost:tmt.tencentcloudapi.com\n'
        signed_headers = 'content-type;host'
        hashed_request_payload = self.sha256_hex(json.dumps(payload, separators=(',', ':')))
        
        canonical_request = (http_request_method + '\n' +
                            canonical_uri + '\n' +
                            canonical_query_string + '\n' +
                            canonical_headers + '\n' +
                            signed_headers + '\n' +
                            hashed_request_payload)
        
        credential_scope = date + '/' + self.service + '/tc3_request'
        hashed_canonical_request = self.sha256_hex(canonical_request)
        
        string_to_sign = ('TC3-HMAC-SHA256\n' +
                         str(timestamp) + '\n' +
                         credential_scope + '\n' +
                         hashed_canonical_request)
        
        secret_date = self.hmac_sha256(('TC3' + self.secret_key).encode('utf-8'), date.encode('utf-8'))
        secret_service = self.hmac_sha256(secret_date, self.service.encode('utf-8'))
        secret_signing = self.hmac_sha256(secret_service, b'tc3_request')
        signature = self.hmac_sha256_hex(secret_signing, string_to_sign)
        
        authorization = ('TC3-HMAC-SHA256 ' +
                        'Credential=' + self.secret_id + '/' + credential_scope + ', ' +
                        'SignedHeaders=' + signed_headers + ', ' +
                        'Signature=' + signature)
        
        debug_log('=== 调试信息 ===')
        debug_log('UTC日期: ' + date)
        debug_log('时间戳: ' + str(timestamp))
        debug_log('规范请求串:')
        debug_log(canonical_request)
        debug_log('待签名字符串:')
        debug_log(string_to_sign)
        debug_log('签名: ' + signature)
        debug_log('Authorization: ' + authorization)
        debug_log('================')
        
        return authorization, timestamp
    
    def translate(self, text, source='en', target='zh'):
        try:
            logger.info(f'开始翻译: text={text[:50]}..., source={source}, target={target}')
            authorization, timestamp = self.generate_signature({
                'SourceText': text,
                'Source': source,
                'Target': target,
                'ProjectId': 0
            })
            
            url = 'https://' + self.endpoint + '/'
            headers = {
                'Authorization': authorization,
                'Content-Type': 'application/json',
                'Host': self.endpoint,
                'X-TC-Action': self.action,
                'X-TC-Timestamp': str(timestamp),
                'X-TC-Version': self.version,
                'X-TC-Region': self.region
            }
            
            payload = {
                'SourceText': text,
                'Source': source,
                'Target': target,
                'ProjectId': 0
            }
            
            debug_log(f'发送请求到: {url}')
            debug_log(f'请求头: {headers}')
            debug_log(f'请求体: {json.dumps(payload)}')
            
            req = urllib.request.Request(url, data=json.dumps(payload, separators=(',', ':')).encode('utf-8'), headers=headers)
            
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                debug_log(f'响应数据: {data}')
                
                if 'Response' in data and 'Error' in data['Response']:
                    error_msg = data['Response']['Error'].get('Message', '翻译失败')
                    logger.error(f'翻译API错误: {error_msg}')
                    raise Exception(error_msg)
                
                if 'Response' in data and 'TargetText' in data['Response']:
                    result = data['Response']['TargetText']
                    logger.info(f'翻译成功: {result[:50]}...')
                    return result
                
                raise Exception('翻译响应格式错误')
                
        except urllib.error.HTTPError as e:
            error_msg = 'HTTP错误: ' + str(e.code)
            try:
                error_data = json.loads(e.read().decode('utf-8'))
                debug_log(f'HTTP错误详情: {error_data}')
                if 'Response' in error_data and 'Error' in error_data['Response']:
                    error_msg = error_data['Response']['Error'].get('Message', error_msg)
            except:
                pass
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            debug_log(f'翻译异常: {str(e)}')
            logger.error(f'翻译异常: {str(e)}')
            import traceback
            traceback.print_exc()
            raise Exception(str(e))

class SecureTranslationRequestHandler(BaseHTTPRequestHandler):
    encryption_manager = None
    proxy = None
    
    @classmethod
    def initialize(cls):
        key_manager = KeyManager()
        cls.encryption_manager = ServerEncryptionManager(key_manager)
        cls.proxy = SecureTencentTranslationProxy(cls.encryption_manager)
    
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Encrypted, X-Timestamp, X-Nonce')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'encrypted': True}).encode('utf-8'))
        else:
            self.send_response(404)
            self._set_cors_headers()
            self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            is_encrypted = request_data.get('encrypted', False)
            
            if is_encrypted:
                logger.info("收到加密请求")
                decrypted_data = self.encryption_manager.decrypt_object(request_data['data'])
                text = decrypted_data.get('text', '')
                source = decrypted_data.get('source', 'en')
                target = decrypted_data.get('target', 'zh')
            else:
                logger.info("收到普通请求")
                text = request_data.get('text', '')
                source = request_data.get('source', 'en')
                target = request_data.get('target', 'zh')
            
            if not text:
                self.send_response(400)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                error_response = {'error': '缺少翻译文本'}
                if is_encrypted:
                    encrypted_error = self.encryption_manager.encrypt_object(error_response)
                    self.wfile.write(json.dumps({'encrypted': True, 'data': encrypted_error}).encode('utf-8'))
                else:
                    self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            result = self.proxy.translate(text, source, target)
            
            self.send_response(200)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            response_data = {'result': result}
            if is_encrypted:
                encrypted_response = self.encryption_manager.encrypt_object(response_data)
                self.wfile.write(json.dumps({'encrypted': True, 'data': encrypted_response}).encode('utf-8'))
            else:
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            logger.error('翻译错误: ' + str(e))
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def log_message(self, format, *args):
        pass

def run_secure_proxy_server(port=8002, use_https=False, https_port=8443):
    os.makedirs('logs', exist_ok=True)
    SecureTranslationRequestHandler.initialize()
    
    if use_https:
        try:
            from https_server_config import HTTPSConfig
            https_config = HTTPSConfig()
            
            if not https_config.check_certificates_exist():
                logger.warning('HTTPS证书不存在，使用HTTP模式')
                logger.info('请运行 generate-https-certificate.py 生成HTTPS证书')
                server_address = ('', port)
                httpd = HTTPServer(server_address, SecureTranslationRequestHandler)
                logger.info(f'安全翻译代理服务器运行在 http://localhost:{port}')
            else:
                server_address = ('', https_port)
                httpd = https_config.create_https_server(SecureTranslationRequestHandler, '', https_port)
                logger.info(f'安全翻译代理服务器运行在 https://localhost:{https_port}')
                logger.info('HTTPS模式已启用，使用TLS加密')
        except ImportError:
            logger.warning('HTTPS配置模块未找到，使用HTTP模式')
            server_address = ('', port)
            httpd = HTTPServer(server_address, SecureTranslationRequestHandler)
            logger.info(f'安全翻译代理服务器运行在 http://localhost:{port}')
    else:
        server_address = ('', port)
        httpd = HTTPServer(server_address, SecureTranslationRequestHandler)
        logger.info(f'安全翻译代理服务器运行在 http://localhost:{port}')
    
    logger.info('加密模式已启用，支持AES-256-GCM加密')
    httpd.serve_forever()

if __name__ == '__main__':
    import sys
    use_https = '--https' in sys.argv
    https_port = 8443
    port = 8002
    
    if use_https:
        for arg in sys.argv:
            if arg.startswith('--https-port='):
                https_port = int(arg.split('=')[1])
    
    run_secure_proxy_server(port, use_https, https_port)
