# Cloudflare Workers 部署指南

本指南将帮助您使用Cloudflare Workers安全地部署翻译API，让所有人都可以使用您的应用，同时保护API密钥安全。

## 🎯 为什么选择Cloudflare Workers？

✅ **完全免费**：每天10万次免费请求（足够个人使用）  
✅ **全球加速**：200+个边缘节点，响应速度极快  
✅ **安全可靠**：API密钥存储在服务器端，完全不暴露给前端  
✅ **易于部署**：几行代码即可完成，无需服务器  
✅ **自动扩展**：无需担心流量激增  
✅ **HTTPS支持**：自动配置SSL证书

---

## 📋 部署步骤（5分钟完成）

### 第一步：注册Cloudflare账号

1. 访问 [cloudflare.com](https://cloudflare.com)
2. 点击"Sign Up"注册账号
3. 验证邮箱

### 第二步：获取腾讯云API密钥

1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi)
2. 点击"新建密钥"或"查看密钥"
3. 复制 `SecretId` 和 `SecretKey`

### 第三步：创建Cloudflare Worker

1. 访问 [Cloudflare Workers Dashboard](https://workers.cloudflare.com)
2. 点击"Create a Service"
3. 输入服务名称，例如：`translation-api`
4. 点击"Create Service"

### 第四步：配置Worker代码

1. 在Worker编辑器中，删除默认代码
2. 复制 `cloudflare-worker.js` 文件的内容
3. 粘贴到编辑器中
4. 点击"Save and Deploy"

### 第五步：配置环境变量

1. 在Worker页面，点击"Settings"标签
2. 点击"Variables" → "Environment Variables"
3. 添加以下变量：

```
变量名: TENCENT_SECRET_ID
值: 您的腾讯云SecretId

变量名: TENCENT_SECRET_KEY
值: 您的腾讯云SecretKey
```

4. 点击"Save and Deploy"

### 第六步：获取Worker URL

部署成功后，您会看到类似这样的URL：
```
https://translation-api.your-subdomain.workers.dev
```

### 第七步：更新前端配置

修改 `config.js` 文件：

```javascript
const API_CONFIG = {
    // 本地开发环境
    development: {
        API_BASE_URL: 'http://localhost:8002',
        USE_ENCRYPTION: false
    },
    
    // 生产环境 - Cloudflare Workers
    production: {
        API_BASE_URL: 'https://translation-api.your-subdomain.workers.dev',
        USE_ENCRYPTION: false  // Cloudflare Workers已经处理了安全
    }
};
```

### 第八步：部署前端到GitHub Pages

1. 将代码推送到GitHub
2. 在仓库设置中启用GitHub Pages
3. 选择 `main` 分支作为源
4. 访问 `https://your-username.github.io/translation/`

---

## 🔒 安全性说明

### 为什么这个方案是安全的？

1. **API密钥不暴露**：密钥存储在Cloudflare Workers的环境变量中，前端无法访问
2. **请求加密**：所有通信都通过HTTPS加密
3. **CORS控制**：可以配置允许的域名
4. **速率限制**：可以设置请求频率限制
5. **日志监控**：Cloudflare提供详细的访问日志

### 安全最佳实践

1. **定期更换密钥**
   - 每3-6个月更换一次腾讯云API密钥
   - 在腾讯云控制台删除旧密钥

2. **设置速率限制**
   - 在Cloudflare Workers中添加速率限制
   - 防止API滥用

3. **监控使用情况**
   - 在Cloudflare Dashboard查看请求统计
   - 在腾讯云控制台监控API调用次数
   - 设置费用告警

4. **限制密钥权限**
   - 为翻译服务创建专门的API密钥
   - 不要使用主账号密钥

---

## 📊 费用说明

### Cloudflare Workers

| 计划 | 免费额度 | 超出费用 |
|------|---------|---------|
| Free | 每天10万次请求 | $5/百万次请求 |

**说明**：对于个人使用，免费额度完全足够。

### 腾讯云机器翻译

| 计划 | 免费额度 | 超出费用 |
|------|---------|---------|
| 按量计费 | 每月500万字符 | ¥58/百万字符 |

**说明**：500万字符大约相当于翻译1000篇短文。

---

## 🚀 高级配置

### 添加缓存

在Worker代码中添加缓存逻辑，减少API调用：

```javascript
const CACHE_TTL = 3600; // 1小时缓存

async function fetchWithCache(request) {
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const response = await fetch(request);
  
  if (response.ok) {
    const responseToCache = response.clone();
    const cacheHeaders = new Headers(responseToCache.headers);
    cacheHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    
    const cached = new Response(responseToCache.body, {
      status: responseToCache.status,
      headers: cacheHeaders
    });
    
    event.waitUntil(cache.put(request, cached));
  }
  
  return response;
}
```

### 添加速率限制

```javascript
const RATE_LIMIT = {
  window: 60000, // 1分钟
  max: 100 // 最多100次请求
};

async function checkRateLimit(ip) {
  const key = `rate_limit_${ip}`;
  const data = await KV.get(key);
  
  if (!data) {
    await KV.put(key, '1', { expirationTtl: RATE_LIMIT.window / 1000 });
    return true;
  }
  
  const count = parseInt(data);
  if (count >= RATE_LIMIT.max) {
    return false;
  }
  
  await KV.put(key, (count + 1).toString(), { expirationTtl: RATE_LIMIT.window / 1000 });
  return true;
}
```

### 添加请求日志

```javascript
async function logRequest(ip, userAgent, success) {
  const log = {
    timestamp: new Date().toISOString(),
    ip: ip,
    userAgent: userAgent,
    success: success
  };
  
  await KV.put(`log_${Date.now()}`, JSON.stringify(log), {
    expirationTtl: 86400 * 7 // 保留7天
  });
}
```

---

## 🧪 测试部署

部署完成后，测试API是否正常工作：

```bash
# 测试翻译功能
curl -X POST https://translation-api.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "source": "auto", "target": "zh"}'
```

预期响应：

```json
{
  "Response": {
    "TargetText": "你好",
    "Source": "en",
    "Target": "zh",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

---

## 📚 相关文档

- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [腾讯云机器翻译 API 文档](https://cloud.tencent.com/document/api/551/15619)
- [Cloudflare Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)

---

## ❓ 常见问题

### Q: 免费额度够用吗？

A: 对于个人使用，每天10万次请求完全足够。如果超过，可以升级到付费计划。

### Q: 如何查看API使用情况？

A: 在Cloudflare Dashboard的Analytics中可以查看详细的请求统计。

### Q: 可以限制只允许特定域名访问吗？

A: 可以，在Worker代码中添加Referer检查：

```javascript
const allowedDomains = ['yourdomain.com', 'yourusername.github.io'];

const referer = request.headers.get('Referer');
if (referer && !allowedDomains.some(domain => referer.includes(domain))) {
  return new Response('Forbidden', { status: 403 });
}
```

### Q: 如何更新API密钥？

A: 在Cloudflare Workers Dashboard的Settings → Variables中更新环境变量，然后重新部署。

### Q: 部署后可以修改代码吗？

A: 可以，随时可以在Cloudflare Workers编辑器中修改代码并重新部署。

---

## 🎉 完成！

现在您的应用已经安全地部署在云端，所有人都可以使用，而您的API密钥完全安全！
