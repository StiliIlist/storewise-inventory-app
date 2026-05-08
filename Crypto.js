// StoreWise AI — Encryption Module
// AES-GCM 256-bit + PBKDF2 key derivation via browser Web Crypto API
// No external libraries. Works in all modern browsers.

const SwCrypto = {

    async deriveKey(password, salt) {
        const enc    = new TextEncoder();
        const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name:'PBKDF2', salt, iterations:310000, hash:'SHA-256' },
            keyMat,
            { name:'AES-GCM', length:256 },
            false,
            ['encrypt','decrypt']
        );
    },

    async encrypt(plaintext, password) {
        const enc  = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv   = crypto.getRandomValues(new Uint8Array(12));
        const key  = await this.deriveKey(password, salt);
        const ct   = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(plaintext));
        const buf  = new Uint8Array(16 + 12 + ct.byteLength);
        buf.set(salt, 0); buf.set(iv, 16); buf.set(new Uint8Array(ct), 28);
        return btoa(String.fromCharCode(...buf));
    },

    async decrypt(encoded, password) {
        const buf = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const key = await this.deriveKey(password, buf.slice(0,16));
        const pt  = await crypto.subtle.decrypt({ name:'AES-GCM', iv: buf.slice(16,28) }, key, buf.slice(28));
        return new TextDecoder().decode(pt);
    },

    async hashPIN(pin, salt) {
        const data = new TextEncoder().encode(pin + salt);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    },

    randomSalt() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
    }
};
