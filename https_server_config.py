"""
HTTPS服务器配置模块
用于配置和使用HTTPS证书
"""

import os
import ssl
import json
from pathlib import Path
from http.server import HTTPServer
from typing import Optional, Tuple


class HTTPSConfig:
    """HTTPS配置类"""
    
    def __init__(self, config_path: str = './config/encryption-config.json'):
        self.config_path = config_path
        self.config = self._load_config()
        self.cert_dir = Path('./secure/certificates')
        self.cert_dir.mkdir(parents=True, exist_ok=True)
        
    def _load_config(self) -> dict:
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"配置文件未找到: {self.config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"配置文件解析失败: {e}")
            
    def get_certificate_paths(self, domain: str = 'localhost') -> Tuple[str, str]:
        """获取证书和私钥路径"""
        cert_file = self.cert_dir / f"{domain}.crt"
        key_file = self.cert_dir / f"{domain}.key"
        
        if not cert_file.exists():
            raise FileNotFoundError(f"证书文件不存在: {cert_file}")
        if not key_file.exists():
            raise FileNotFoundError(f"私钥文件不存在: {key_file}")
            
        return str(cert_file), str(key_file)
        
    def create_ssl_context(self, domain: str = 'localhost') -> ssl.SSLContext:
        """创建SSL上下文"""
        cert_file, key_file = self.get_certificate_paths(domain)
        
        transport_config = self.config.get('encryption', {}).get('transport', {})
        tls_version = transport_config.get('tlsVersion', 'TLS 1.3')
        
        # 根据TLS版本选择协议
        if 'TLS 1.3' in tls_version:
            protocol = ssl.PROTOCOL_TLS_SERVER
        elif 'TLS 1.2' in tls_version:
            protocol = ssl.PROTOCOL_TLSv1_2
        else:
            protocol = ssl.PROTOCOL_TLS_SERVER
            
        context = ssl.SSLContext(protocol)
        
        # 加载证书和私钥
        context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        
        # 设置密码套件
        cipher_suites = transport_config.get('cipherSuites', [])
        if cipher_suites:
            context.set_ciphers(':'.join(cipher_suites))
            
        # 启用证书验证
        context.verify_mode = ssl.CERT_NONE  # 自签名证书不需要验证客户端
        
        return context
        
    def create_https_server(self, handler_class, host: str = '0.0.0.0', port: int = 8443, domain: str = 'localhost') -> HTTPServer:
        """创建HTTPS服务器"""
        ssl_context = self.create_ssl_context(domain)
        
        server = HTTPServer((host, port), handler_class)
        server.socket = ssl_context.wrap_socket(server.socket, server_side=True)
        
        return server
        
    def check_certificates_exist(self, domain: str = 'localhost') -> bool:
        """检查证书是否存在"""
        cert_file = self.cert_dir / f"{domain}.crt"
        key_file = self.cert_dir / f"{domain}.key"
        
        return cert_file.exists() and key_file.exists()
        
    def get_certificate_info(self, domain: str = 'localhost') -> dict:
        """获取证书信息"""
        import subprocess
        from datetime import datetime
        
        cert_file = self.cert_dir / f"{domain}.crt"
        
        if not cert_file.exists():
            raise FileNotFoundError(f"证书文件不存在: {cert_file}")
            
        cmd = [
            'openssl', 'x509',
            '-in', str(cert_file),
            '-noout',
            '-subject',
            '-issuer',
            '-dates',
            '-serial'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"获取证书信息失败: {result.stderr}")
            
        info = {}
        for line in result.stdout.strip().split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                info[key.strip()] = value.strip()
                
        return info


class HTTPSServer:
    """HTTPS服务器包装类"""
    
    def __init__(self, handler_class, host: str = '0.0.0.0', port: int = 8443, domain: str = 'localhost'):
        self.handler_class = handler_class
        self.host = host
        self.port = port
        self.domain = domain
        self.https_config = HTTPSConfig()
        self.server = None
        
    def start(self):
        """启动HTTPS服务器"""
        if not self.https_config.check_certificates_exist(self.domain):
            raise FileNotFoundError(
                f"HTTPS证书不存在，请先运行 generate-https-certificate.py 生成证书\n"
                f"证书目录: {self.https_config.cert_dir}"
            )
            
        self.server = self.https_config.create_https_server(
            self.handler_class,
            self.host,
            self.port,
            self.domain
        )
        
        print(f"\n{'=' * 60}")
        print(f"HTTPS服务器已启动")
        print(f"{'=' * 60}")
        print(f"监听地址: https://{self.host}:{self.port}")
        print(f"域名: {self.domain}")
        print(f"{'=' * 60}\n")
        
        try:
            self.server.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
            self.server.shutdown()
            
    def stop(self):
        """停止HTTPS服务器"""
        if self.server:
            self.server.shutdown()
            print("HTTPS服务器已停止")


def create_https_server(handler_class, host: str = '0.0.0.0', port: int = 8443, domain: str = 'localhost') -> HTTPSServer:
    """创建HTTPS服务器的便捷函数"""
    return HTTPSServer(handler_class, host, port, domain)
