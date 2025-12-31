# 腾讯翻译API加密方案 - 配置说明文档

## 文档信息
- **项目名称**: 英语翻译练习应用 - 腾讯翻译API加密实现
- **文档版本**: v1.0
- **更新日期**: 2025-12-31

---

## 目录
1. [系统要求](#1-系统要求)
2. [快速开始](#2-快速开始)
3. [环境配置](#3-环境配置)
4. [密钥管理](#4-密钥管理)
5. [HTTPS证书配置](#5-https证书配置)
6. [服务器配置](#6-服务器配置)
7. [客户端配置](#7-客户端配置)
8. [配置文件详解](#8-配置文件详解)
9. [故障排除](#9-故障排除)
10. [最佳实践](#10-最佳实践)

---

## 1. 系统要求

### 1.1 硬件要求
- **处理器**: Intel Core i5 / AMD Ryzen 5 或更高
- **内存**: 4GB RAM（推荐8GB）
- **存储**: 500MB可用空间

### 1.2 软件要求
- **操作系统**: Windows 10+, Linux, macOS
- **Python**: 3.8 或更高版本
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **OpenSSL**: 1.1.1 或更高版本

### 1.3 Python依赖
```bash
cryptography>=3.4.8
requests>=2.26.0
python-dotenv>=0.19.0
```

---

## 2. 快速开始

### 2.1 安装依赖
```bash
pip install -r requirements.txt
```

### 2.2 配置环境变量
复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入腾讯云API密钥：
```env
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
```

### 2.3 生成HTTPS证书
```bash
python generate-https-certificate.py
```

选择选项1生成localhost证书。

### 2.4 启动服务器
**HTTP模式**:
```bash
python secure-translation-proxy.py
```

**HTTPS模式**:
```bash
python secure-translation-proxy.py --https
```

### 2.5 配置客户端
在 `tencent-translation.js` 中启用加密：
```javascript
const translationDict = new TencentTranslationDictionary();
await translationDict.enableEncryption();
```

---

## 3. 环境配置

### 3.1 环境变量配置

#### 3.1.1 创建.env文件
在项目根目录创建 `.env` 文件：

```env
# 腾讯云API配置
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 加密密钥配置
ENCRYPTION_KEY=your_secure_encryption_key_here

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8002
HTTPS_PORT=8443

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/security.log
```

#### 3.1.2 环境变量说明

| 变量名 | 说明 | 必填 | 示例 |
|--------|------|------|------|
| TENCENT_SECRET_ID | 腾讯云API密钥ID | 是 | AKIDxxxxxxxx |
| TENCENT_SECRET_KEY | 腾讯云API密钥 | 是 | xxxxxxxx |
| ENCRYPTION_KEY | 加密密钥 | 是 | 32字节密钥 |
| SERVER_HOST | 服务器监听地址 | 否 | 0.0.0.0 |
| SERVER_PORT | HTTP端口 | 否 | 8002 |
| HTTPS_PORT | HTTPS端口 | 否 | 8443 |
| LOG_LEVEL | 日志级别 | 否 | INFO |
| LOG_FILE | 日志文件路径 | 否 | logs/security.log |

### 3.2 生成加密密钥

#### 3.2.1 使用Python生成密钥
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)
print(key.hex())
```

#### 3.2.2 使用命令行生成密钥
```bash
python -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; print(AESGCM.generate_key(bit_length=256).hex())"
```

### 3.3 目录结构
```
translation/
├── config/
│   └── encryption-config.json    # 加密配置文件
├── secure/
│   ├── certificates/              # HTTPS证书目录
│   │   ├── localhost.crt
│   │   ├── localhost.key
│   │   └── localhost.pem
│   └── keys/                     # 密钥存储目录
│       └── backup/               # 密钥备份目录
├── logs/                         # 日志目录
│   └── security.log
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量模板
├── encryption.js                 # 前端加密模块
├── key_manager.py               # 密钥管理模块
├── secure-translation-proxy.py  # 安全代理服务器
├── https_server_config.py      # HTTPS配置模块
├── generate-https-certificate.py # 证书生成脚本
└── tencent-translation.js      # 翻译客户端
```

---

## 4. 密钥管理

### 4.1 密钥存储

#### 4.1.1 环境变量存储（推荐）
```env
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### 4.1.2 文件存储
```python
from key_manager import KeyManager

key_manager = KeyManager()
key = key_manager.generate_key()
key_manager.save_key_to_file(key, './secure/keys/encryption.key', 'master_password')
```

### 4.2 密钥派生

#### 4.2.1 从密码派生密钥
```python
from key_manager import KeyManager

key_manager = KeyManager()
key, salt = key_manager.derive_key('your_password_here')
```

#### 4.2.2 密钥派生配置
在 `encryption-config.json` 中配置：
```json
{
  "encryption": {
    "keyDerivation": {
      "algorithm": "PBKDF2",
      "iterations": 100000,
      "saltLength": 16,
      "hashAlgorithm": "SHA-256"
    }
  }
}
```

### 4.3 密钥轮换

#### 4.3.1 手动密钥轮换
1. 生成新密钥
2. 更新环境变量或密钥文件
3. 重启服务器
4. 验证新密钥生效

#### 4.3.2 自动密钥轮换（推荐）
配置 `encryption-config.json`：
```json
{
  "encryption": {
    "keyManagement": {
      "rotationDays": 90,
      "backupEnabled": true,
      "backupLocation": "./secure/keys/backup"
    }
  }
}
```

### 4.4 密钥备份

#### 4.4.1 备份密钥
```python
from key_manager import KeyManager

key_manager = KeyManager()
key = key_manager.load_key_from_file('./secure/keys/encryption.key', 'master_password')
key_manager.backup_key(key, './secure/keys/backup/backup_20251231.key', 'backup_password')
```

#### 4.4.2 恢复密钥
```python
from key_manager import KeyManager

key_manager = KeyManager()
key = key_manager.restore_key('./secure/keys/backup/backup_20251231.key', 'backup_password')
```

---

## 5. HTTPS证书配置

### 5.1 生成自签名证书

#### 5.1.1 使用脚本生成
```bash
python generate-https-certificate.py
```

选择选项：
- 选项1: 生成localhost证书
- 选项2: 生成自定义域名证书
- 选项3: 生成PEM打包文件
- 选项4: 生成PKCS12打包文件
- 选项5: 全部生成

#### 5.1.2 使用OpenSSL生成
```bash
# 生成私钥
openssl genrsa -out secure/certificates/localhost.key 2048

# 生成证书签名请求
openssl req -new -key secure/certificates/localhost.key -out secure/certificates/localhost.csr

# 生成自签名证书
openssl x509 -req -days 365 -in secure/certificates/localhost.csr -signkey secure/certificates/localhost.key -out secure/certificates/localhost.crt
```

### 5.2 证书配置

#### 5.2.1 证书有效期配置
编辑 `encryption-config.json`：
```json
{
  "certificate": {
    "validityDays": 365
  }
}
```

#### 5.2.2 证书信息配置
```json
{
  "certificate": {
    "commonName": "localhost",
    "organization": "Translation Practice",
    "country": "CN",
    "state": "Guangdong",
    "locality": "Guangzhou"
  }
}
```

### 5.3 证书验证

#### 5.3.1 验证证书
```bash
openssl x509 -in secure/certificates/localhost.crt -text -noout
```

#### 5.3.2 检查证书有效期
```bash
openssl x509 -in secure/certificates/localhost.crt -noout -dates
```

### 5.4 证书更新

#### 5.4.1 更新证书
```bash
# 删除旧证书
rm secure/certificates/localhost.crt
rm secure/certificates/localhost.key

# 生成新证书
python generate-https-certificate.py
```

#### 5.4.2 自动更新（推荐）
设置定时任务定期更新证书：
```bash
# Linux crontab
0 0 1 * * cd /path/to/translation && python generate-https-certificate.py

# Windows Task Scheduler
# 创建每月1日0点运行的定时任务
```

---

## 6. 服务器配置

### 6.1 HTTP服务器配置

#### 6.1.1 基本配置
```bash
python secure-translation-proxy.py
```

默认配置：
- 监听地址: 0.0.0.0
- 端口: 8002
- 协议: HTTP

#### 6.1.2 自定义端口
```bash
python secure-translation-proxy.py --port 8080
```

### 6.2 HTTPS服务器配置

#### 6.2.1 基本配置
```bash
python secure-translation-proxy.py --https
```

默认配置：
- 监听地址: 0.0.0.0
- HTTPS端口: 8443
- 协议: HTTPS/TLS 1.3

#### 6.2.2 自定义HTTPS端口
```bash
python secure-translation-proxy.py --https --https-port=9443
```

### 6.3 服务器日志配置

#### 6.3.1 日志级别
在 `encryption-config.json` 中配置：
```json
{
  "security": {
    "logging": {
      "enabled": true,
      "level": "INFO",
      "logSensitiveData": false,
      "logFilePath": "./logs/security.log"
    }
  }
}
```

#### 6.3.2 日志级别说明
- **DEBUG**: 详细的调试信息
- **INFO**: 一般信息
- **WARNING**: 警告信息
- **ERROR**: 错误信息
- **CRITICAL**: 严重错误

### 6.4 性能配置

#### 6.4.1 缓存配置
```json
{
  "performance": {
    "cacheEnabled": true,
    "cacheSize": 200,
    "cacheTTL": 3600
  }
}
```

#### 6.4.2 限流配置
```json
{
  "security": {
    "rateLimiting": {
      "enabled": true,
      "requestsPerMinute": 100,
      "burstSize": 10
    }
  }
}
```

---

## 7. 客户端配置

### 7.1 前端加密配置

#### 7.1.1 引入加密模块
在HTML文件中引入：
```html
<script src="encryption.js"></script>
<script src="tencent-translation.js"></script>
```

#### 7.1.2 启用加密模式
```javascript
const translationDict = new TencentTranslationDictionary();

// 启用加密
await translationDict.enableEncryption();

// 执行翻译
try {
    const result = await translationDict.translate('Hello World', 'en', 'zh');
    console.log('翻译结果:', result);
} catch (error) {
    console.error('翻译失败:', error);
}
```

### 7.2 禁用加密模式

#### 7.2.1 禁用加密
```javascript
const translationDict = new TencentTranslationDictionary();

// 禁用加密
await translationDict.disableEncryption();

// 执行翻译（非加密模式）
const result = await translationDict.translate('Hello World', 'en', 'zh');
```

### 7.3 HTTPS客户端配置

#### 7.3.1 更新代理URL
```javascript
const translationDict = new TencentTranslationDictionary();

// 使用HTTPS
translationDict.proxyUrl = 'https://localhost:8443';

// 启用加密
await translationDict.enableEncryption();
```

#### 7.3.2 处理自签名证书
在浏览器中访问 `https://localhost:8443`，接受自签名证书警告。

---

## 8. 配置文件详解

### 8.1 encryption-config.json

#### 8.1.1 完整配置示例
```json
{
  "encryption": {
    "algorithm": "AES-256-GCM",
    "keyDerivation": {
      "algorithm": "PBKDF2",
      "iterations": 100000,
      "saltLength": 16,
      "hashAlgorithm": "SHA-256"
    },
    "transport": {
      "protocol": "HTTPS",
      "tlsVersion": "TLS 1.3",
      "cipherSuites": [
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "TLS_AES_128_GCM_SHA256"
      ]
    },
    "keyManagement": {
      "storage": "environment",
      "rotationDays": 90,
      "backupEnabled": true,
      "backupLocation": "./secure/keys/backup"
    },
    "api": {
      "tencent": {
        "secretId": "${TENCENT_SECRET_ID}",
        "secretKey": "${TENCENT_SECRET_KEY}",
        "endpoint": "tmt.tencentcloudapi.com",
        "region": "ap-guangzhou",
        "version": "2018-03-21"
      }
    }
  },
  "security": {
    "maxRetries": 3,
    "timeout": 30,
    "rateLimiting": {
      "enabled": true,
      "requestsPerMinute": 100,
      "burstSize": 10
    },
    "logging": {
      "enabled": true,
      "level": "INFO",
      "logSensitiveData": false,
      "logFilePath": "./logs/security.log"
    },
    "validation": {
      "maxTextLength": 2000,
      "allowedLanguages": ["en", "zh", "ja", "ko", "fr", "de", "es", "ru"],
      "sanitizationEnabled": true
    }
  },
  "performance": {
    "cacheEnabled": true,
    "cacheSize": 200,
    "cacheTTL": 3600,
    "compressionEnabled": true
  }
}
```

#### 8.1.2 配置项说明

**encryption**
- `algorithm`: 加密算法，支持AES-256-GCM
- `keyDerivation`: 密钥派生配置
- `transport`: 传输层安全配置
- `keyManagement`: 密钥管理配置
- `api`: API配置

**security**
- `maxRetries`: 最大重试次数
- `timeout`: 超时时间（秒）
- `rateLimiting`: 限流配置
- `logging`: 日志配置
- `validation`: 输入验证配置

**performance**
- `cacheEnabled`: 是否启用缓存
- `cacheSize`: 缓存大小
- `cacheTTL`: 缓存过期时间（秒）
- `compressionEnabled`: 是否启用压缩

### 8.2 .env文件

#### 8.2.1 完整配置示例
```env
# 腾讯云API配置
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 加密密钥配置
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8002
HTTPS_PORT=8443

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/security.log
```

---

## 9. 故障排除

### 9.1 常见问题

#### 9.1.1 证书生成失败
**问题**: 运行证书生成脚本失败

**解决方案**:
1. 检查OpenSSL是否已安装
```bash
openssl version
```

2. 如果未安装，访问 https://www.openssl.org/ 下载安装

#### 9.1.2 服务器启动失败
**问题**: 服务器无法启动

**解决方案**:
1. 检查端口是否被占用
```bash
# Windows
netstat -ano | findstr :8002

# Linux/macOS
lsof -i :8002
```

2. 更换端口或终止占用端口的进程

#### 9.1.3 加密请求失败
**问题**: 加密请求返回错误

**解决方案**:
1. 检查环境变量是否正确配置
```bash
# Windows
echo %ENCRYPTION_KEY%

# Linux/macOS
echo $ENCRYPTION_KEY
```

2. 检查密钥长度是否为32字节（64个十六进制字符）

#### 9.1.4 HTTPS连接失败
**问题**: 无法建立HTTPS连接

**解决方案**:
1. 检查证书文件是否存在
```bash
ls secure/certificates/
```

2. 检查证书是否有效
```bash
openssl x509 -in secure/certificates/localhost.crt -text -noout
```

3. 在浏览器中接受自签名证书警告

#### 9.1.5 翻译API调用失败
**问题**: 翻译请求返回错误

**解决方案**:
1. 检查腾讯云API密钥是否正确
2. 检查API配额是否用完
3. 查看日志文件获取详细错误信息
```bash
cat logs/security.log
```

### 9.2 调试模式

#### 9.2.1 启用调试日志
在 `encryption-config.json` 中设置：
```json
{
  "security": {
    "logging": {
      "level": "DEBUG"
    }
  }
}
```

#### 9.2.2 查看调试日志
```bash
tail -f logs/security.log
```

### 9.3 性能问题

#### 9.3.1 响应时间过长
**解决方案**:
1. 启用缓存
2. 增加缓存大小
3. 检查网络延迟

#### 9.3.2 内存占用过高
**解决方案**:
1. 减小缓存大小
2. 清理旧缓存
3. 重启服务器

---

## 10. 最佳实践

### 10.1 安全最佳实践

#### 10.1.1 密钥管理
- ✅ 使用环境变量存储密钥
- ✅ 定期轮换密钥（建议90天）
- ✅ 使用强密码派生密钥
- ✅ 备份密钥到安全位置
- ❌ 不要将密钥硬编码在代码中
- ❌ 不要将密钥提交到版本控制系统

#### 10.1.2 证书管理
- ✅ 使用TLS 1.3或更高版本
- ✅ 定期更新证书（建议365天）
- ✅ 使用强加密算法
- ✅ 监控证书过期时间
- ❌ 不要使用过期证书
- ❌ 不要共享证书私钥

#### 10.1.3 网络安全
- ✅ 启用HTTPS加密
- ✅ 使用防火墙限制访问
- ✅ 定期更新依赖库
- ✅ 监控安全日志
- ❌ 不要在公网暴露HTTP端口
- ❌ 不要禁用安全验证

### 10.2 性能最佳实践

#### 10.2.1 缓存策略
- ✅ 启用翻译结果缓存
- ✅ 设置合理的缓存过期时间
- ✅ 监控缓存命中率
- ❌ 不要缓存敏感数据

#### 10.2.2 并发处理
- ✅ 使用连接池
- ✅ 设置合理的限流策略
- ✅ 监控并发请求数
- ❌ 不要过度并发

### 10.3 运维最佳实践

#### 10.3.1 监控
- ✅ 监控服务器性能
- ✅ 监控API调用次数
- ✅ 监控错误率
- ✅ 设置告警规则

#### 10.3.2 日志管理
- ✅ 定期清理旧日志
- ✅ 使用日志轮转
- ✅ 备份重要日志
- ❌ 不要记录敏感信息

#### 10.3.3 备份
- ✅ 定期备份配置文件
- ✅ 定期备份密钥
- ✅ 定期备份证书
- ✅ 测试恢复流程

---

## 附录

### A. 端口使用说明

| 端口 | 协议 | 用途 | 默认值 |
|------|------|------|--------|
| 8002 | HTTP | 翻译代理服务器 | 是 |
| 8443 | HTTPS | 安全翻译代理服务器 | 是 |

### B. 文件权限

**Linux/macOS**:
```bash
# 设置密钥文件权限
chmod 600 secure/keys/*
chmod 700 secure/keys/

# 设置证书文件权限
chmod 644 secure/certificates/*.crt
chmod 600 secure/certificates/*.key
```

**Windows**:
使用文件属性设置适当的访问权限。

### C. 参考资源

- [腾讯云机器翻译API文档](https://cloud.tencent.com/document/product/551/15619)
- [NIST加密标准](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [TLS 1.3 RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446)
- [OWASP安全指南](https://owasp.org/www-project-top-ten/)

---

**文档结束**
