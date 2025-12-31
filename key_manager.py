#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import secrets
import hashlib
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from typing import Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeyManager:
    def __init__(self, config_path: str = './config/encryption-config.json'):
        self.config = self._load_config(config_path)
        self.backend = default_backend()
        
    def _load_config(self, config_path: str) -> dict:
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"配置文件未找到: {config_path}, 使用默认配置")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            logger.error(f"配置文件解析错误: {e}")
            raise
    
    def _get_default_config(self) -> dict:
        return {
            "encryption": {
                "algorithm": "AES-256-GCM",
                "keyDerivation": {
                    "algorithm": "PBKDF2",
                    "iterations": 100000,
                    "saltLength": 16,
                    "hashAlgorithm": "SHA-256"
                }
            }
        }
    
    def generate_key(self) -> bytes:
        return AESGCM.generate_key(bit_length=256)
    
    def derive_key(self, password: str, salt: Optional[bytes] = None) -> Tuple[bytes, bytes]:
        if salt is None:
            salt = os.urandom(16)
        
        kdf_config = self.config['encryption']['keyDerivation']
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=kdf_config['iterations'],
            backend=self.backend
        )
        
        key = kdf.derive(password.encode('utf-8'))
        return key, salt
    
    def encrypt_key(self, key: bytes, master_password: str) -> Tuple[str, str]:
        salt = os.urandom(16)
        nonce = os.urandom(12)
        
        derived_key, _ = self.derive_key(master_password, salt)
        
        aesgcm = AESGCM(derived_key)
        encrypted_key = aesgcm.encrypt(nonce, key, None)
        
        encrypted_key_b64 = base64.b64encode(encrypted_key).decode('utf-8')
        salt_b64 = base64.b64encode(salt).decode('utf-8')
        nonce_b64 = base64.b64encode(nonce).decode('utf-8')
        
        combined = f"{salt_b64}:{nonce_b64}:{encrypted_key_b64}"
        return combined, hashlib.sha256(combined.encode()).hexdigest()
    
    def decrypt_key(self, encrypted_key_str: str, master_password: str) -> bytes:
        try:
            parts = encrypted_key_str.split(':')
            if len(parts) != 3:
                raise ValueError("Invalid encrypted key format")
            
            salt = base64.b64decode(parts[0])
            nonce = base64.b64decode(parts[1])
            encrypted_key = base64.b64decode(parts[2])
            
            derived_key, _ = self.derive_key(master_password, salt)
            
            aesgcm = AESGCM(derived_key)
            key = aesgcm.decrypt(nonce, encrypted_key, None)
            
            return key
        except Exception as e:
            logger.error(f"解密密钥失败: {e}")
            raise ValueError("解密密钥失败，请检查主密码")
    
    def save_key_to_file(self, key: bytes, file_path: str, master_password: str):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        encrypted_key, checksum = self.encrypt_key(key, master_password)
        
        key_data = {
            "encryptedKey": encrypted_key,
            "checksum": checksum,
            "algorithm": self.config['encryption']['algorithm'],
            "createdAt": int(os.time())
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(key_data, f, indent=2)
        
        logger.info(f"密钥已保存到: {file_path}")
    
    def load_key_from_file(self, file_path: str, master_password: str) -> bytes:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                key_data = json.load(f)
            
            encrypted_key = key_data['encryptedKey']
            checksum = key_data['checksum']
            
            new_checksum = hashlib.sha256(encrypted_key.encode()).hexdigest()
            if new_checksum != checksum:
                raise ValueError("密钥文件校验和不匹配，可能已损坏")
            
            key = self.decrypt_key(encrypted_key, master_password)
            logger.info(f"密钥已从文件加载: {file_path}")
            return key
        except FileNotFoundError:
            logger.error(f"密钥文件未找到: {file_path}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"密钥文件解析错误: {e}")
            raise
    
    def generate_api_key_hash(self, api_key: str) -> str:
        return hashlib.sha256(api_key.encode('utf-8')).hexdigest()
    
    def validate_key_strength(self, key: bytes) -> bool:
        if len(key) != 32:
            return False
        
        entropy = sum([bin(byte).count('1') for byte in key])
        if entropy < 128:
            return False
        
        return True

class EnvironmentKeyManager:
    def __init__(self):
        self.key_manager = KeyManager()
    
    def get_tencent_credentials(self) -> Tuple[str, str]:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        
        if not secret_id or not secret_key:
            raise ValueError("腾讯API凭证未在环境变量中设置")
        
        return secret_id, secret_key
    
    def get_encryption_key(self) -> bytes:
        env_key = os.getenv('ENCRYPTION_KEY')
        if env_key:
            return base64.b64decode(env_key)
        
        key_file = os.getenv('ENCRYPTION_KEY_FILE')
        if key_file:
            master_password = os.getenv('MASTER_PASSWORD')
            if not master_password:
                raise ValueError("MASTER_PASSWORD环境变量未设置")
            return self.key_manager.load_key_from_file(key_file, master_password)
        
        raise ValueError("未找到加密密钥配置")

if __name__ == '__main__':
    key_manager = KeyManager()
    
    print("=== 密钥管理测试 ===")
    
    master_password = "test_master_password_123"
    key = key_manager.generate_key()
    print(f"生成的密钥: {key.hex()}")
    
    encrypted_key, checksum = key_manager.encrypt_key(key, master_password)
    print(f"加密后的密钥: {encrypted_key[:50]}...")
    print(f"校验和: {checksum}")
    
    decrypted_key = key_manager.decrypt_key(encrypted_key, master_password)
    print(f"解密后的密钥: {decrypted_key.hex()}")
    print(f"密钥匹配: {key == decrypted_key}")
    
    print("\n=== 密钥强度验证 ===")
    print(f"密钥强度: {key_manager.validate_key_strength(key)}")
