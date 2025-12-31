# 快速部署指南（5分钟上线）

本指南将帮助您在5分钟内将应用部署到云端，让所有人都可以使用。

## 🎯 最快方案：Render + GitHub Pages

### 第一步：准备（2分钟）

1. **获取腾讯云API密钥**
   - 访问 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi)
   - 创建API密钥
   - 记下 `SecretId` 和 `SecretKey`

2. **注册账号**
   - [Render](https://render.com) - 后端API部署
   - [GitHub](https://github.com) - 前端部署

### 第二步：部署后端（2分钟）

1. **创建Render服务**
   - 点击 [https://dashboard.render.com/select-repo](https://dashboard.render.com/select-repo)
   - 选择您的GitHub仓库
   - 配置：
     ```
     Name: translation-api
     Runtime: Python 3
     Build: pip install -r requirements.txt
     Start: python secure-translation-proxy.py --https --https-port=8443
     ```

2. **添加环境变量**
   在Render的Environment Variables中添加：
   ```
   TENCENT_SECRET_ID = 您的SecretId
   TENCENT_SECRET_KEY = 您的SecretKey
   ENCRYPTION_KEY = 随机32位字符串（如：my-secret-encryption-key-1234567890）
   ```

3. **等待部署**
   - 点击 "Create Web Service"
   - 等待2-3分钟
   - 记下API地址：`https://translation-api.onrender.com`

### 第三步：部署前端（1分钟）

1. **修改config.js**
   打开 [config.js](file:///d:\英语翻译练习\translation\config.js)，找到：
   ```javascript
   production: {
       // API_BASE_URL: 'https://your-app-name.onrender.com',
   ```
   改为：
   ```javascript
   production: {
       API_BASE_URL: 'https://translation-api.onrender.com',
   ```

2. **启用GitHub Pages**
   - 进入GitHub仓库 → Settings → Pages
   - Source选择：GitHub Actions
   - 保存

3. **提交代码**
   ```bash
   git add .
   git commit -m "配置生产环境"
   git push
   ```

4. **访问网站**
   - 等待1-2分钟
   - 访问：`https://您的用户名.github.io/translation/`

### 完成！🎉

现在所有人都可以访问您的网站了！

---

## 📝 配置检查清单

- [ ] Render后端已部署
- [ ] 环境变量已配置（TENCENT_SECRET_ID, TENCENT_SECRET_KEY, ENCRYPTION_KEY）
- [ ] config.js中的API_BASE_URL已更新
- [ ] GitHub Pages已启用
- [ ] 代码已提交到GitHub
- [ ] 网站可以正常访问
- [ ] 翻译功能正常工作

---

## 🔧 常见问题

### Q: Render部署失败怎么办？
A: 检查requirements.txt是否包含所有依赖，查看Render的构建日志。

### Q: API调用失败？
A: 确认环境变量配置正确，检查腾讯云API密钥是否有效。

### Q: 网站显示空白？
A: 检查浏览器控制台错误，确认config.js中的API地址正确。

### Q: 如何监控API使用量？
A: 访问腾讯云控制台查看API调用统计和费用。

---

## 💡 下一步

1. **自定义域名**（可选）
   - 在GitHub Pages中绑定自定义域名
   - 在Render中配置自定义域名

2. **优化性能**（可选）
   - 启用CDN加速
   - 配置缓存策略

3. **添加监控**（可选）
   - 配置错误追踪
   - 设置使用量告警

---

## 📚 详细文档

如需更详细的部署说明，请查看 [DEPLOYMENT_GUIDE.md](file:///d:\英语翻译练习\translation\DEPLOYMENT_GUIDE.md)

---

**需要帮助？** 查看 [README.md](file:///d:\英语翻译练习\translation\README.md) 或提交Issue
