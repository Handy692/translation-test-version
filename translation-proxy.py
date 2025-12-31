#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import hashlib
import hmac
import json
import time
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error

sys.stdout.reconfigure(line_buffering=True)

DEBUG_FILE = 'debug.log'

def debug_log(message):
    with open(DEBUG_FILE, 'a', encoding='utf-8') as f:
        f.write(message + '\n')
    print(message)

class TencentTranslationProxy:
    def __init__(self):
        self.secret_id = os.getenv('TENCENT_SECRET_ID')
        self.secret_key = os.getenv('TENCENT_SECRET_KEY')
        
        if not self.secret_id or not self.secret_key:
            raise ValueError(
                '腾讯云API密钥未配置！\n'
                '请设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY\n'
                '或在 .env 文件中配置这些变量'
            )
        
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
            debug_log(f'开始翻译: text={text}, source={source}, target={target}')
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
                    raise Exception(data['Response']['Error'].get('Message', '翻译失败'))
                
                if 'Response' in data and 'TargetText' in data['Response']:
                    return data['Response']['TargetText']
                
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
            raise Exception(error_msg)
        except Exception as e:
            debug_log(f'翻译异常: {str(e)}')
            import traceback
            traceback.print_exc()
            raise Exception(str(e))

class TranslationRequestHandler(BaseHTTPRequestHandler):
    proxy = TencentTranslationProxy()
    
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            text = data.get('text', '')
            source = data.get('source', 'en')
            target = data.get('target', 'zh')
            
            debug_log(f'收到翻译请求: text={text}, source={source}, target={target}')
            
            if not text:
                self.send_response(400)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'error': '缺少翻译文本'}).encode('utf-8'))
                return
            
            result = self.proxy.translate(text, source, target)
            
            self.send_response(200)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'result': result}).encode('utf-8'))
            
        except Exception as e:
            debug_log('翻译错误: ' + str(e))
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def log_message(self, format, *args):
        pass

def run_proxy_server(port=8002):
    server_address = ('', port)
    httpd = HTTPServer(server_address, TranslationRequestHandler)
    print('翻译代理服务器运行在 http://localhost:' + str(port))
    httpd.serve_forever()

if __name__ == '__main__':
    run_proxy_server()
