/**
 * Cloudflare Worker for Tencent Translation API
 * 
 * 部署步骤：
 * 1. 访问 https://workers.cloudflare.com
 * 2. 创建新的Worker
 * 3. 复制此代码到Worker编辑器
 * 4. 在Settings → Environment Variables中添加：
 *    - TENCENT_SECRET_ID: 您的腾讯云SecretId
 *    - TENCENT_SECRET_KEY: 您的腾讯云SecretKey
 * 5. 点击Deploy
 * 6. 复制Worker的URL，更新到前端的config.js中
 */

const TENCENT_API_ENDPOINT = 'https://tmt.tencentcloudapi.com';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, message) {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const msgData = typeof message === 'string' ? encoder.encode(message) : encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateTencentSignature(secretId, secretKey, payload, timestamp) {
  const service = 'tmt';
  const version = '2018-03-21';
  const action = 'TextTranslate';
  const region = 'ap-guangzhou';
  const algorithm = 'TC3-HMAC-SHA256';
  
  const date = new Date(timestamp * 1000).toISOString().substr(0, 10);
  
  const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:tmt.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n\ncontent-type;host;x-tc-action\n${await sha256(payload)}`;
  
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  
  const secretDate = await hmacSha256(`TC3${secretKey}`, date);
  const secretService = await hmacSha256(secretDate, service);
  const secretSigning = await hmacSha256(secretService, 'tc3_request');
  const signature = await hmacSha256(secretSigning, stringToSign);
  
  return {
    authorization: `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`,
    action: action.toLowerCase()
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      const body = await request.json();
      const { text, source = 'auto', target = 'zh' } = body;

      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing required parameter: text' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const secretId = TENCENT_SECRET_ID;
      const secretKey = TENCENT_SECRET_KEY;

      if (!secretId || !secretKey) {
        return new Response(JSON.stringify({ error: 'API credentials not configured' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({
        SourceText: text,
        Source: source,
        Target: target,
        ProjectId: 0
      });

      const { authorization, action } = await generateTencentSignature(
        secretId,
        secretKey,
        payload,
        timestamp
      );

      const response = await fetch(TENCENT_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Host': 'tmt.tencentcloudapi.com',
          'X-TC-Action': 'TextTranslate',
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Version': '2018-03-21',
          'X-TC-Region': 'ap-guangzhou',
          'Authorization': authorization
        },
        body: payload
      });

      const result = await response.json();

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
