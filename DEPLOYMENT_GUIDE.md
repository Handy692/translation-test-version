# 部署指南

本指南将帮助您将英语翻译练习应用部署到云端，让所有人都可以使用。

## 📋 部署方案概览

我们提供以下几种部署方案：

### 方案对比

| 方案 | 成本 | 难度 | 推荐度 | 说明 |
|------|------|------|--------|------|
| **Render + GitHub Pages** | 免费（有限额） | ⭐⭐ | ⭐⭐⭐⭐⭐ | 最推荐，完全免费，适合个人使用 |
| **Railway + GitHub Pages** | 免费（有限额） | ⭐⭐ | ⭐⭐⭐⭐⭐ | 同样优秀，性能稳定 |
| **Vercel + Cloudflare Workers** | 免费（有限额） | ⭐⭐⭐ | ⭐⭐⭐⭐ | 适合有Cloudflare经验的用户 |
| **自己的服务器** | 需付费 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 适合有服务器的用户 |
| **Docker + 云服务器** | 需付费 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 适合企业级部署 |

---

## 🚀 方案一：Render + GitHub Pages（推荐）

这是最简单且完全免费的方案。

### 步骤1：部署后端API到Render

1. **注册Render账号**
   - 访问 [https://render.com](https://render.com)
   - 使用GitHub账号登录

2. **创建新的Web服务**
   - 点击 "New +" → "Web Service"
   - 连接您的GitHub仓库
   - 配置以下信息：
     ```
     Name: translation-practice-api
     Runtime: Python 3
     Build Command: pip install -r requirements.txt
     Start Command: python secure-translation-proxy.py --https --https-port=8443
     ```

3. **配置环境变量**
   在Environment Variables中添加：
   ```
   TENCENT_SECRET_ID = 您的腾讯云Secret ID
   TENCENT_SECRET_KEY = 您的腾讯云Secret Key
   ENCRYPTION_KEY = 任意32位随机字符串（用于加密）
   ```

4. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成（约2-5分钟）
   - 记下API地址，例如：`https://translation-practice-api.onrender.com`

### 步骤2：部署前端到GitHub Pages

1. **配置config.js**
   打开 [config.js](file:///d:\英语翻译练习\translation\config.js)，修改生产环境配置：
   ```javascript
   production: {
       API_BASE_URL: 'https://translation-practice-api.onrender.com',
       USE_ENCRYPTION: true
   }
   ```

2. **启用GitHub Pages**
   - 进入GitHub仓库
   - Settings → Pages
   - Source选择：GitHub Actions
   - 保存设置

3. **自动部署**
   - 提交代码到GitHub
   - GitHub Actions会自动部署到GitHub Pages
   - 访问：`https://您的用户名.github.io/translation/`

### 步骤3：测试

1. 访问GitHub Pages地址
2. 测试翻译功能
3. 检查浏览器控制台是否有错误

---

## 🌟 方案二：Railway + GitHub Pages

Railway提供更好的性能和稳定性。

### 步骤1：部署后端API到Railway

1. **注册Railway账号**
   - 访问 [https://railway.app](https://railway.app)
   - 使用GitHub账号登录

2. **创建新项目**
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择您的仓库
   - Railway会自动检测Python项目

3. **配置环境变量**
   在项目设置中添加环境变量：
   ```
   TENCENT_SECRET_ID = 您的腾讯云Secret ID
   TENCENT_SECRET_KEY = 您的腾讯云Secret Key
   ENCRYPTION_KEY = 任意32位随机字符串
   ```

4. **修改启动命令**
   在Railway设置中：
   ```
   Start Command: python secure-translation-proxy.py --https --https-port=8443
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成
   - 记下API地址，例如：`https://translation-practice-api.up.railway.app`

### 步骤2：部署前端（同方案一）

---

## 🐳 方案三：Docker + 云服务器

适合有自己服务器的用户。

### 步骤1：准备服务器

确保服务器已安装：
- Docker
- Docker Compose
- Nginx（可选，用于反向代理）

### 步骤2：部署后端

1. **上传代码到服务器**
   ```bash
   git clone https://github.com/您的用户名/translation.git
   cd translation
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   nano .env
   # 填入您的API密钥
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **配置Nginx（可选）**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.crt;
       ssl_certificate_key /path/to/cert.key;
       
       location /api/ {
           proxy_pass http://localhost:8002/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location / {
           root /path/to/translation;
           index index.html;
       }
   }
   ```

### 步骤3：配置前端

修改 [config.js](file:///d:\英语翻译练习\translation\config.js)：
```javascript
production: {
    API_BASE_URL: 'https://your-domain.com/api',
    USE_ENCRYPTION: true
}
```

---

## 🔒 安全注意事项

### 1. API密钥管理
- ✅ 使用环境变量存储密钥
- ✅ 不要在代码中硬编码密钥
- ✅ 定期更换API密钥
- ✅ 监控API使用量

### 2. 访问控制
- ✅ 启用HTTPS
- ✅ 配置CORS白名单
- ✅ 实现速率限制
- ✅ 添加API密钥验证

### 3. 数据加密
- ✅ 启用传输加密（HTTPS）
- ✅ 启用数据加密（AES-256-GCM）
- ✅ 使用安全的密钥派生（PBKDF2）

### 4. 监控和日志
- ✅ 记录API调用日志
- ✅ 监控异常请求
- ✅ 设置告警机制

---

## 💰 成本估算

### 免费方案（Render/Railway）
- **后端API**：免费额度
  - Render: 750小时/月（足够个人使用）
  - Railway: $5免费额度/月
- **前端**：GitHub Pages完全免费
- **腾讯云API**：按实际使用量计费
  - 文本翻译：5元/百万字符
  - 每月100万字符：约5元

### 付费方案（云服务器）
- **服务器**：约30-100元/月（1核2G）
- **域名**：约50-100元/年
- **SSL证书**：免费（Let's Encrypt）

---

## 📊 性能优化

### 1. 缓存策略
- 启用翻译结果缓存
- 设置合理的缓存过期时间
- 使用CDN加速静态资源

### 2. 负载均衡
- 使用多个API实例
- 配置自动扩缩容
- 使用负载均衡器

### 3. 数据库优化（如需要）
- 使用连接池
- 添加索引
- 定期清理过期数据

---

## 🛠️ 故障排查

### 问题1：API调用失败
- 检查环境变量是否正确配置
- 查看服务器日志
- 验证API密钥是否有效

### 问题2：前端无法连接后端
- 检查CORS配置
- 确认API地址正确
- 查看浏览器控制台错误

### 问题3：性能问题
- 检查缓存是否启用
- 优化数据库查询
- 增加服务器资源

---

## 📞 技术支持

如遇到问题，请：
1. 查看日志文件
2. 检查配置文件
3. 参考本文档的故障排查部分
4. 提交Issue到GitHub仓库

---

## 🎯 快速部署清单

- [ ] 注册云平台账号（Render/Railway）
- [ ] 准备腾讯云API密钥
- [ ] 修改config.js配置
- [ ] 部署后端API
- [ ] 配置GitHub Pages
- [ ] 测试功能
- [ ] 配置监控和告警
- [ ] 定期检查API使用量

---

**祝您部署顺利！** 🎉
