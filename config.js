// API配置文件
// 部署时请根据实际情况修改API_BASE_URL

const API_CONFIG = {
    // 本地开发环境
    development: {
        API_BASE_URL: 'http://localhost:8002',
        USE_ENCRYPTION: false
    },
    
    // 生产环境 - Cloudflare Workers
    production: {
        API_BASE_URL: 'https://translation-api.3441653535.workers.dev',
        USE_ENCRYPTION: false  // Cloudflare Workers已经处理了安全
    }
};

// 根据环境自动选择配置
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

const config = isProduction ? API_CONFIG.production : API_CONFIG.development;

// 如果生产环境API_BASE_URL未配置，使用默认值
if (isProduction && config.API_BASE_URL.includes('your-')) {
    console.warn('⚠️ 请在config.js中配置生产环境的API_BASE_URL');
    console.warn('⚠️ 当前使用本地API地址，请修改config.js文件');
}

// 导出配置
window.API_CONFIG = config;
