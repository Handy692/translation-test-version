# 英语翻译练习应用

一个功能完善的英语翻译练习应用，支持多种导入方式、主题切换、翻译历史、AI评估和加密API调用。

## 功能特性

### 核心功能
- ✅ **Excel/CSV文件导入** - 支持批量导入词汇表进行练习
- ✅ **主题切换** - 支持亮色/暗色主题切换
- ✅ **翻译历史** - 查看和管理翻译历史记录
- ✅ **AI评估** - 智能评估翻译质量并提供改进建议
- ✅ **详细评价** - 查看翻译详情和AI评语

### 安全特性
- 🔒 **AES-256-GCM加密** - 应用层加密保护API通信
- 🔒 **PBKDF2密钥派生** - 安全的密钥管理
- 🔒 **HTTPS/TLS 1.3** - 传输层加密
- 🔒 **环境变量管理** - 避免敏感信息泄露
- 🔒 **密钥轮换** - 支持定期密钥更新

### 技术特性
- 🚀 **高性能缓存** - 减少API调用次数
- 🚀 **并发处理** - 支持多用户并发访问
- 🚀 **响应式设计** - 适配不同屏幕尺寸
- 🚀 **跨平台支持** - Windows/Linux/macOS

## 快速开始

### 环境要求

- Python 3.8+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
- OpenSSL 1.1.1+

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/你的用户名/translation-practice.git
cd translation-practice
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入腾讯云API密钥：
```env
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
```

4. **生成HTTPS证书（可选）**
```bash
python generate-https-certificate.py
```

5. **启动服务器**

HTTP模式：
```bash
python secure-translation-proxy.py
```

HTTPS模式：
```bash
python secure-translation-proxy.py --https
```

6. **打开应用**
在浏览器中打开 `index.html`

## 🌐 在线部署

### 免费云平台部署

我们提供多种免费部署方案：

| 方案 | 平台 | 成本 | 难度 | 推荐度 |
|------|------|------|------|--------|
| **方案一** | Render + GitHub Pages | 免费 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **方案二** | Railway + GitHub Pages | 免费 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **方案三** | Vercel + Cloudflare Workers | 免费 | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### 快速部署步骤

**方案一：Render + GitHub Pages（推荐）**

1. **部署后端到Render**
   - 注册 [Render](https://render.com) 账号
   - 创建Web Service，连接GitHub仓库
   - 配置环境变量：
     ```
     TENCENT_SECRET_ID = 您的腾讯云Secret ID
     TENCENT_SECRET_KEY = 您的腾讯云Secret Key
     ENCRYPTION_KEY = 任意32位随机字符串
     ```
   - 等待部署完成，记下API地址

2. **部署前端到GitHub Pages**
   - 修改 `config.js` 中的 `API_BASE_URL`
   - 在GitHub仓库设置中启用Pages
   - 选择GitHub Actions作为部署方式
   - 提交代码，自动部署

3. **完成！**
   - 访问GitHub Pages地址
   - 所有人都可以使用您的网站了！

详细步骤请查看 [QUICK_START.md](QUICK_START.md)

### 成本估算

- **后端API**：免费（Render/Railway免费额度）
- **前端托管**：免费（GitHub Pages）
- **腾讯云API**：约5元/百万字符
- **总计**：个人使用基本免费

## 使用说明

### 导入词汇表

1. 点击"导入Excel/CSV"按钮
2. 选择Excel（.xlsx, .xls）或CSV文件
3. 系统自动解析并添加到词汇表

### 主题切换

点击页面右上角的主题按钮切换亮色/暗色主题

### 查看翻译历史

1. 进入"历史记录"页面
2. 点击"查看详情"查看完整翻译信息
3. 查看AI评估和改进建议

### 启用加密

在 `tencent-translation.js` 中启用加密模式：
```javascript
const translationDict = new TencentTranslationDictionary();
await translationDict.enableEncryption();
```

## 项目结构

```
translation/
├── config/                      # 配置文件
│   └── encryption-config.json  # 加密配置
├── secure/                      # 安全文件
│   ├── certificates/           # HTTPS证书
│   └── keys/                    # 密钥存储
├── logs/                        # 日志文件
├── encryption.js               # 前端加密模块
├── key_manager.py              # 密钥管理模块
├── secure-translation-proxy.py # 安全代理服务器
├── https_server_config.py      # HTTPS配置
├── generate-https-certificate.py # 证书生成脚本
├── tencent-translation.js      # 翻译客户端
├── script.js                   # 核心应用逻辑
├── styles.css                  # 样式文件
└── *.html                      # 页面文件
```

## 配置说明

详细的配置说明请参考 [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md)

主要配置文件：
- `.env` - 环境变量配置
- `config/encryption-config.json` - 加密配置

## 安全测试

完整的安全测试报告请参考 [SECURITY_TEST_REPORT.md](SECURITY_TEST_REPORT.md)

测试结果：
- ✅ 加密算法实现正确
- ✅ 密钥管理安全
- ✅ 数据传输加密有效
- ✅ API兼容性良好
- ✅ 性能影响可接受（<15%）

## API文档

### 翻译API

**请求示例**：
```javascript
const translationDict = new TencentTranslationDictionary();
const result = await translationDict.translate('Hello World', 'en', 'zh');
console.log(result); // "你好世界"
```

**参数说明**：
- `text`: 待翻译文本
- `source`: 源语言（en, zh, ja, ko等）
- `target`: 目标语言

## 故障排除

### 常见问题

1. **服务器启动失败**
   - 检查端口是否被占用
   - 检查环境变量是否正确配置

2. **翻译API调用失败**
   - 检查腾讯云API密钥是否正确
   - 检查API配额是否用完
   - 查看日志文件获取详细错误信息

3. **HTTPS连接失败**
   - 检查证书文件是否存在
   - 在浏览器中接受自签名证书警告

更多故障排除方法请参考 [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md)

## 开发指南

### 添加新功能

1. 在 `script.js` 中添加业务逻辑
2. 在 `styles.css` 中添加样式
3. 更新相关HTML页面

### 测试

```bash
# 运行测试（如果有）
python -m pytest
```

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- 腾讯云机器翻译API
- Web Crypto API
- Python cryptography库

## 联系方式

如有问题或建议，请提交Issue或联系维护者。

## 更新日志

### v1.0.0 (2025-12-31)
- ✨ 初始版本发布
- ✅ 支持Excel/CSV导入
- ✅ 主题切换功能
- ✅ 翻译历史记录
- ✅ AI评估功能
- ✅ 腾讯翻译API加密
- ✅ HTTPS支持
- ✅ 完整的安全测试
- ✅ 详细的配置文档

---

**注意**: 请勿将 `.env` 文件、密钥文件和证书文件提交到版本控制系统。这些文件已在 `.gitignore` 中排除。
