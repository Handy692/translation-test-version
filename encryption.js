class EncryptionManager {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.saltLength = 16;
        this.key = null;
        this.keyDerivationIterations = 100000;
    }

    async generateKey() {
        this.key = await window.crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
        return this.key;
    }

    async deriveKeyFromPassword(password, salt) {
        const passwordBuffer = this._encode(password);
        const saltBuffer = salt || window.crypto.getRandomValues(new Uint8Array(this.saltLength));

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        this.key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: this.keyDerivationIterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );

        return { key: this.key, salt: saltBuffer };
    }

    async importKey(keyData) {
        const keyBuffer = this._decodeBase64(keyData);
        this.key = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
        return this.key;
    }

    async exportKey() {
        if (!this.key) {
            throw new Error('No key available for export');
        }
        const exported = await window.crypto.subtle.exportKey('raw', this.key);
        return this._encodeBase64(exported);
    }

    async encrypt(data) {
        if (!this.key) {
            throw new Error('No encryption key available');
        }

        const iv = window.crypto.getRandomValues(new Uint8Array(this.ivLength));
        const dataBuffer = this._encode(data);

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: this.algorithm,
                iv: iv
            },
            this.key,
            dataBuffer
        );

        const result = {
            iv: this._encodeBase64(iv),
            data: this._encodeBase64(encrypted)
        };

        return result;
    }

    async decrypt(encryptedData) {
        if (!this.key) {
            throw new Error('No decryption key available');
        }

        const iv = this._decodeBase64(encryptedData.iv);
        const encrypted = this._decodeBase64(encryptedData.data);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: this.algorithm,
                iv: iv
            },
            this.key,
            encrypted
        );

        return this._decode(decrypted);
    }

    async encryptObject(obj) {
        const jsonString = JSON.stringify(obj);
        return await this.encrypt(jsonString);
    }

    async decryptObject(encryptedData) {
        const jsonString = await this.decrypt(encryptedData);
        return JSON.parse(jsonString);
    }

    _encode(str) {
        return new TextEncoder().encode(str);
    }

    _decode(buffer) {
        return new TextDecoder().decode(buffer);
    }

    _encodeBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    _decodeBase64(str) {
        const binary = window.atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async generateHash(data) {
        const buffer = this._encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
}

class SecureHttpClient {
    constructor(encryptionManager) {
        this.encryptionManager = encryptionManager;
    }

    async postSecure(url, data, options = {}) {
        const encryptedData = await this.encryptionManager.encryptObject(data);
        const timestamp = Date.now();
        const nonce = this._generateNonce();

        const payload = {
            encrypted: true,
            timestamp: timestamp,
            nonce: nonce,
            data: encryptedData
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Encrypted': 'true',
                'X-Timestamp': timestamp.toString(),
                'X-Nonce': nonce,
                ...options.headers
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        if (responseData.encrypted) {
            const decryptedData = await this.encryptionManager.decryptObject(responseData.data);
            return decryptedData;
        }

        return responseData;
    }

    async getSecure(url, options = {}) {
        const timestamp = Date.now();
        const nonce = this._generateNonce();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Timestamp': timestamp.toString(),
                'X-Nonce': nonce,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        if (responseData.encrypted) {
            const decryptedData = await this.encryptionManager.decryptObject(responseData.data);
            return decryptedData;
        }

        return responseData;
    }

    _generateNonce() {
        return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    }
}

class SecureTranslationClient {
    constructor(baseUrl = 'http://localhost:8002') {
        this.baseUrl = baseUrl;
        this.encryptionManager = new EncryptionManager();
        this.httpClient = new SecureHttpClient(this.encryptionManager);
        this.key = null;
        this.isInitialized = false;
    }

    async initialize(serverPublicKey) {
        try {
            await this.encryptionManager.generateKey();
            this.key = await this.encryptionManager.exportKey();
            this.isInitialized = true;
            console.log('加密客户端初始化成功');
            return true;
        } catch (error) {
            console.error('加密客户端初始化失败:', error);
            return false;
        }
    }

    async translate(text, source = 'en', target = 'zh') {
        if (!this.isInitialized) {
            throw new Error('加密客户端未初始化，请先调用 initialize() 方法');
        }

        try {
            const payload = {
                text: text,
                source: source,
                target: target,
                encrypted: true
            };

            const response = await this.httpClient.postSecure(
                this.baseUrl,
                payload
            );

            if (response.error) {
                throw new Error(response.error);
            }

            return response.result;
        } catch (error) {
            console.error('翻译失败:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const response = await this.httpClient.getSecure(this.baseUrl + '/health');
            return response.status === 'ok';
        } catch (error) {
            console.error('连接测试失败:', error);
            return false;
        }
    }
}

window.EncryptionManager = EncryptionManager;
window.SecureHttpClient = SecureHttpClient;
window.SecureTranslationClient = SecureTranslationClient;
