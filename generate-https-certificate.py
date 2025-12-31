#!/usr/bin/env python3
"""
HTTPS证书生成脚本
用于开发和测试环境的自签名证书生成
"""

import os
import sys
import subprocess
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CertificateGenerator:
    """证书生成器"""
    
    def __init__(self, config_path='./config/encryption-config.json'):
        self.config_path = config_path
        self.config = self._load_config()
        self.cert_dir = Path('./secure/certificates')
        self.cert_dir.mkdir(parents=True, exist_ok=True)
        
    def _load_config(self):
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"配置文件未找到: {self.config_path}, 使用默认配置")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            logger.error(f"配置文件解析失败: {e}")
            raise
            
    def _get_default_config(self):
        """获取默认配置"""
        return {
            "encryption": {
                "transport": {
                    "protocol": "HTTPS",
                    "tlsVersion": "TLS 1.3"
                }
            },
            "certificate": {
                "commonName": "localhost",
                "organization": "Translation Practice",
                "validityDays": 365,
                "keySize": 2048
            }
        }
        
    def generate_self_signed_certificate(self, domain='localhost'):
        """生成自签名证书"""
        try:
            cert_config = self.config.get('certificate', {})
            common_name = cert_config.get('commonName', domain)
            organization = cert_config.get('organization', 'Translation Practice')
            validity_days = cert_config.get('validityDays', 365)
            key_size = cert_config.get('keySize', 2048)
            
            cert_file = self.cert_dir / f"{domain}.crt"
            key_file = self.cert_dir / f"{domain}.key"
            csr_file = self.cert_dir / f"{domain}.csr"
            
            logger.info(f"开始为域名 {domain} 生成自签名证书...")
            
            # 生成私钥
            logger.info("生成私钥...")
            self._generate_private_key(key_file, key_size)
            
            # 生成证书签名请求
            logger.info("生成证书签名请求...")
            self._generate_csr(csr_file, key_file, common_name, organization)
            
            # 生成自签名证书
            logger.info("生成自签名证书...")
            self._generate_self_signed_cert(cert_file, csr_file, key_file, validity_days)
            
            # 清理CSR文件
            if csr_file.exists():
                csr_file.unlink()
                
            logger.info(f"证书生成成功!")
            logger.info(f"证书文件: {cert_file}")
            logger.info(f"私钥文件: {key_file}")
            
            # 验证证书
            self._verify_certificate(cert_file, key_file)
            
            return {
                'cert_file': str(cert_file),
                'key_file': str(key_file),
                'valid_until': (datetime.now() + timedelta(days=validity_days)).strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            logger.error(f"生成证书失败: {e}")
            raise
            
    def _generate_private_key(self, key_file, key_size):
        """生成私钥"""
        cmd = [
            'openssl', 'genrsa',
            '-out', str(key_file),
            str(key_size)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"生成私钥失败: {result.stderr}")
            
    def _generate_csr(self, csr_file, key_file, common_name, organization):
        """生成证书签名请求"""
        config_file = self.cert_dir / 'openssl.cnf'
        self._create_openssl_config(config_file, common_name, organization)
        
        cmd = [
            'openssl', 'req',
            '-new',
            '-key', str(key_file),
            '-out', str(csr_file),
            '-config', str(config_file),
            '-batch'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"生成CSR失败: {result.stderr}")
            
    def _generate_self_signed_cert(self, cert_file, csr_file, key_file, validity_days):
        """生成自签名证书"""
        cmd = [
            'openssl', 'x509',
            '-req',
            '-days', str(validity_days),
            '-in', str(csr_file),
            '-signkey', str(key_file),
            '-out', str(cert_file),
            '-extensions', 'v3_req',
            '-extfile', str(self.cert_dir / 'openssl.cnf')
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"生成自签名证书失败: {result.stderr}")
            
    def _create_openssl_config(self, config_file, common_name, organization):
        """创建OpenSSL配置文件"""
        config_content = f"""[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = CN
ST = Guangdong
L = Guangzhou
O = {organization}
OU = Development
CN = {common_name}

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = {common_name}
DNS.2 = localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"""
        
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(config_content)
            
    def _verify_certificate(self, cert_file, key_file):
        """验证证书"""
        logger.info("验证证书...")
        
        cmd = [
            'openssl', 'x509',
            '-in', str(cert_file),
            '-noout',
            '-text'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("证书验证通过")
            logger.info("\n证书信息:")
            logger.info(result.stdout)
        else:
            logger.warning(f"证书验证失败: {result.stderr}")
            
    def generate_pem_bundle(self, domain='localhost'):
        """生成PEM打包文件"""
        cert_file = self.cert_dir / f"{domain}.crt"
        key_file = self.cert_dir / f"{domain}.key"
        pem_file = self.cert_dir / f"{domain}.pem"
        
        if not cert_file.exists() or not key_file.exists():
            raise FileNotFoundError("证书或私钥文件不存在")
            
        with open(pem_file, 'wb') as pem:
            with open(cert_file, 'rb') as cert:
                pem.write(cert.read())
            with open(key_file, 'rb') as key:
                pem.write(key.read())
                
        logger.info(f"PEM打包文件已生成: {pem_file}")
        return str(pem_file)
        
    def generate_pkcs12_bundle(self, domain='localhost', password=''):
        """生成PKCS12打包文件"""
        cert_file = self.cert_dir / f"{domain}.crt"
        key_file = self.cert_dir / f"{domain}.key"
        p12_file = self.cert_dir / f"{domain}.p12"
        
        if not cert_file.exists() or not key_file.exists():
            raise FileNotFoundError("证书或私钥文件不存在")
            
        cmd = [
            'openssl', 'pkcs12',
            '-export',
            '-out', str(p12_file),
            '-inkey', str(key_file),
            '-in', str(cert_file),
            '-passout', f'pass:{password}'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"生成PKCS12文件失败: {result.stderr}")
            
        logger.info(f"PKCS12打包文件已生成: {p12_file}")
        return str(p12_file)
        
    def check_openssl_installed(self):
        """检查OpenSSL是否已安装"""
        try:
            result = subprocess.run(['openssl', 'version'], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"OpenSSL版本: {result.stdout.strip()}")
                return True
            else:
                return False
        except FileNotFoundError:
            logger.error("OpenSSL未安装，请先安装OpenSSL")
            return False


def main():
    """主函数"""
    print("=" * 60)
    print("HTTPS证书生成工具")
    print("=" * 60)
    
    try:
        generator = CertificateGenerator()
        
        if not generator.check_openssl_installed():
            print("\n错误: OpenSSL未安装")
            print("请访问 https://www.openssl.org/ 下载并安装OpenSSL")
            sys.exit(1)
            
        print("\n选择操作:")
        print("1. 生成自签名证书 (localhost)")
        print("2. 生成自签名证书 (自定义域名)")
        print("3. 生成PEM打包文件")
        print("4. 生成PKCS12打包文件")
        print("5. 全部生成")
        print("0. 退出")
        
        choice = input("\n请选择 (0-5): ").strip()
        
        if choice == '0':
            print("退出程序")
            sys.exit(0)
        elif choice == '1':
            result = generator.generate_self_signed_certificate('localhost')
            print(f"\n证书有效期至: {result['valid_until']}")
        elif choice == '2':
            domain = input("请输入域名: ").strip()
            result = generator.generate_self_signed_certificate(domain)
            print(f"\n证书有效期至: {result['valid_until']}")
        elif choice == '3':
            domain = input("请输入域名 (默认: localhost): ").strip() or 'localhost'
            pem_file = generator.generate_pem_bundle(domain)
            print(f"\nPEM文件: {pem_file}")
        elif choice == '4':
            domain = input("请输入域名 (默认: localhost): ").strip() or 'localhost'
            password = input("请输入密码 (可选): ").strip()
            p12_file = generator.generate_pkcs12_bundle(domain, password)
            print(f"\nPKCS12文件: {p12_file}")
        elif choice == '5':
            domain = input("请输入域名 (默认: localhost): ").strip() or 'localhost'
            result = generator.generate_self_signed_certificate(domain)
            print(f"\n证书有效期至: {result['valid_until']}")
            
            pem_file = generator.generate_pem_bundle(domain)
            print(f"PEM文件: {pem_file}")
            
            password = input("请输入PKCS12密码 (可选): ").strip()
            p12_file = generator.generate_pkcs12_bundle(domain, password)
            print(f"PKCS12文件: {p12_file}")
        else:
            print("无效的选择")
            sys.exit(1)
            
        print("\n" + "=" * 60)
        print("操作完成!")
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"程序执行失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
