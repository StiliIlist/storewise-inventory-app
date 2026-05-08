// StoreWise AI — Encryption Module (inlined — no separate file needed)
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

// StoreWise AI — Inventory Management
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    DROPBOX_APP_KEY:  'YOUR_DROPBOX_APP_KEY',
    REDIRECT_URI:     window.location.origin + window.location.pathname,
    // How long before the app auto-locks (ms). 0 = never.
    AUTO_LOCK_MS:     15 * 60 * 1000   // 15 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCK SCREEN MANAGER
// ─────────────────────────────────────────────────────────────────────────────
class LockManager {
    constructor(onUnlock) {
        this.onUnlock   = onUnlock;
        this.sessionKey = null;
        this.lockTimer  = null;
        this.isLocked   = true;
    }

    hasPIN() { return !!localStorage.getItem('sw_pin_hash'); }

    async setupPIN(pin, confirmPin) {
        if (pin.length < 4)        throw new Error('PIN must be at least 4 digits.');
        if (pin !== confirmPin)    throw new Error('PINs do not match.');
        if (!/^\d+$/.test(pin))   throw new Error('PIN must be numbers only.');
        const salt = SwCrypto.randomSalt();
        const hash = await SwCrypto.hashPIN(pin, salt);
        localStorage.setItem('sw_pin_hash', hash);
        localStorage.setItem('sw_pin_salt', salt);
        this.sessionKey = pin;
        return true;
    }

    async verifyPIN(pin) {
        const storedHash = localStorage.getItem('sw_pin_hash');
        const salt       = localStorage.getItem('sw_pin_salt');
        if (!storedHash || !salt) return false;
        const hash = await SwCrypto.hashPIN(pin, salt);
        return hash === storedHash;
    }

    async unlock(pin) {
        const ok = await this.verifyPIN(pin);
        if (!ok) return false;
        this.sessionKey = pin;
        this.isLocked   = false;
        this.resetAutoLock();
        return true;
    }

    lock() {
        this.sessionKey = null;
        this.isLocked   = true;
        clearTimeout(this.lockTimer);
        this.showLockScreen();
    }

    resetAutoLock() {
        if (!CONFIG.AUTO_LOCK_MS) return;
        clearTimeout(this.lockTimer);
        this.lockTimer = setTimeout(() => this.lock(), CONFIG.AUTO_LOCK_MS);
    }

    async changePIN(oldPin, newPin, confirmPin, app) {
        if (!(await this.verifyPIN(oldPin))) throw new Error('Current PIN is incorrect.');
        if (newPin.length < 4)              throw new Error('New PIN must be at least 4 digits.');
        if (newPin !== confirmPin)          throw new Error('New PINs do not match.');
        if (!/^\d+$/.test(newPin))          throw new Error('PIN must be numbers only.');
        const data      = JSON.stringify(app.getDataBundle());
        const encrypted = await SwCrypto.encrypt(data, newPin);
        localStorage.setItem('sw_enc_data', encrypted);
        const salt = SwCrypto.randomSalt();
        const hash = await SwCrypto.hashPIN(newPin, salt);
        localStorage.setItem('sw_pin_hash', hash);
        localStorage.setItem('sw_pin_salt', salt);
        this.sessionKey = newPin;
    }

    showLockScreen() {
        document.getElementById('lockScreen')?.remove();
        const isSetup  = !this.hasPIN();
        const title    = isSetup ? '🔐 Create your PIN' : '🔒 StoreWise is locked';
        const subtitle = isSetup
            ? "Choose a PIN to protect your store data. You'll need it every time you open the app."
            : 'Enter your PIN to continue.';

        const el = document.createElement('div');
        el.id = 'lockScreen';
        el.innerHTML = `
            <div class="lock-overlay">
                <div class="lock-card">
                    <div class="lock-logo">🏪</div>
                    <h2 class="lock-title">${title}</h2>
                    <p class="lock-subtitle">${subtitle}</p>
                    <div class="pin-dots" id="pinDots">
                        <span class="pin-dot" id="d0"></span>
                        <span class="pin-dot" id="d1"></span>
                        <span class="pin-dot" id="d2"></span>
                        <span class="pin-dot" id="d3"></span>
                        ${isSetup ? '<span class="pin-dot" id="d4"></span><span class="pin-dot" id="d5"></span>' : ''}
                    </div>
                    ${isSetup ? '<p class="lock-hint" id="lockHint">Enter new PIN (4–6 digits)</p>' : '<p class="lock-hint" id="lockHint"> </p>'}
                    <div class="pin-grid">
                        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
                            <button class="pin-key ${k===''?'pin-key--empty':''}" data-key="${k}">${k}</button>`).join('')}
                    </div>
                    <div id="lockError" class="lock-error hidden"></div>
                    ${!isSetup ? '<button class="lock-forgot" id="lockForgot">Forgot PIN? Reset all data</button>' : ''}
                </div>
            </div>`;
        document.body.appendChild(el);

        let phase = isSetup ? 'create' : 'unlock';
        let buf   = '';
        const maxLen = 6;
        const dots  = el.querySelectorAll('.pin-dot');
        const hint  = el.querySelector('#lockHint');
        const errEl = el.querySelector('#lockError');

        const updateDots = (val) => dots.forEach((d,i) => d.classList.toggle('filled', i < val.length));

        const showError = (msg) => {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
            el.querySelector('.lock-card').classList.add('shake');
            buf = ''; updateDots('');
            setTimeout(() => { el.querySelector('.lock-card').classList.remove('shake'); errEl.classList.add('hidden'); }, 2000);
        };

        const handleKey = async (key) => {
            if (key === '⌫') { buf = buf.slice(0,-1); updateDots(buf); return; }
            if (key === '' || buf.length >= maxLen) return;
            buf += key;
            updateDots(buf);

            if (!isSetup && buf.length >= 4) {
                const ok = await this.unlock(buf);
                if (ok) { el.remove(); this.onUnlock(); }
                else    showError('Incorrect PIN. Try again.');
                return;
            }

            if (isSetup && phase === 'create' && buf.length >= 4) {
                setTimeout(() => {
                    phase = 'confirm';
                    el.dataset.firstPin = buf;
                    buf = '';
                    hint.textContent = 'Confirm your PIN';
                    updateDots('');
                }, 300);
                return;
            }

            if (isSetup && phase === 'confirm' && buf.length >= 4) {
                const first = el.dataset.firstPin;
                if (buf !== first) { phase='create'; showError('PINs do not match. Start over.'); return; }
                try {
                    await this.setupPIN(first, buf);
                    el.remove();
                    this.isLocked = false;
                    this.resetAutoLock();
                    this.onUnlock();
                } catch(e) { showError(e.message); }
            }
        };

        el.querySelectorAll('.pin-key').forEach(btn => btn.addEventListener('click', () => handleKey(btn.dataset.key)));

        document.addEventListener('keydown', function onKey(e) {
            if (!document.getElementById('lockScreen')) { document.removeEventListener('keydown', onKey); return; }
            if (/^\d$/.test(e.key)) handleKey(e.key);
            if (e.key === 'Backspace') handleKey('⌫');
        });

        el.querySelector('#lockForgot')?.addEventListener('click', () => {
            if (confirm('This will permanently delete ALL data and remove your PIN. Are you sure?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
class StoreWiseApp {
    constructor() {
        this.defaultProducts = [
            { id:"P001", name:"Organic Bananas",     category:"Produce",   barcode:"123456789012", price:2.99, cost:1.89, stock:24, min_stock:10, supplier:"Fresh Farms Co",           description:"Fresh organic bananas",     image_url:"🍌" },
            { id:"P002", name:"Whole Milk 1 Gallon", category:"Dairy",     barcode:"234567890123", price:4.29, cost:3.15, stock:8,  min_stock:15, supplier:"Local Dairy Farm",          description:"Fresh whole milk",          image_url:"🥛" },
            { id:"P003", name:"Coca-Cola 12-pack",   category:"Beverages", barcode:"345678901234", price:6.99, cost:4.50, stock:32, min_stock:20, supplier:"Beverage Distributors Inc", description:"12-pack of Coca-Cola cans", image_url:"🥤" },
            { id:"P004", name:"Wonder Bread",        category:"Bakery",    barcode:"456789012345", price:2.79, cost:1.95, stock:15, min_stock:8,  supplier:"Bakery Supply Co",          description:"Classic white bread loaf",  image_url:"🍞" },
            { id:"P005", name:"Ground Beef 1lb",     category:"Meat",      barcode:"567890123456", price:7.99, cost:5.25, stock:12, min_stock:15, supplier:"Local Butcher Shop",        description:"Fresh ground beef 80/20",   image_url:"🥩" }
        ];
        this.defaultTransactions = [
            { id:"T001", date:new Date().toISOString().split('T')[0], time:"10:30", items:[{product_id:"P001",quantity:2,price:2.99},{product_id:"P002",quantity:1,price:4.29}], total:10.27, payment_method:"cash", customer_name:"John Smith" },
            { id:"T002", date:new Date().toISOString().split('T')[0], time:"11:45", items:[{product_id:"P003",quantity:1,price:6.99},{product_id:"P004",quantity:2,price:2.79}], total:12.57, payment_method:"card", customer_name:"Sarah Johnson" }
        ];
        this.defaultSuppliers = [
            { id:"S001", name:"Fresh Farms Co",            contact:"555-0123", email:"orders@freshfarms.com" },
            { id:"S002", name:"Local Dairy Farm",          contact:"555-0124", email:"sales@localdairy.com" },
            { id:"S003", name:"Beverage Distributors Inc", contact:"555-0125", email:"orders@bevdist.com" },
            { id:"S004", name:"Bakery Supply Co",          contact:"555-0126", email:"orders@bakerysupply.com" },
            { id:"S005", name:"Local Butcher Shop",        contact:"555-0127", email:"orders@localbutcher.com" }
        ];
        this.defaultSettings = {
            store_name:"Sunny Corner Market", address:"123 Main Street, Anytown, CA 94102",
            phone:"555-0100", tax_rate:0.0875, currency:"USD", low_stock_threshold:10
        };
        this.categories = ["Produce","Dairy","Beverages","Bakery","Meat","Frozen","Pantry","Snacks","Health & Beauty","Household"];

        this.products = []; this.transactions = []; this.suppliers = []; this.settings = {};
        this.currentSection = 'dashboard';
        this.cart = {}; this.charts = {};

        this.syncProvider = 'local';
        this.fileHandle   = null;
        this.gdriveToken  = null; this.gdriveFileId = null;
        this.dropboxToken = null;

        // Lock manager — show lock screen first, init app after unlock
        this.lock = new LockManager(() => this.afterUnlock());
        this.init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BOOT
    // ═══════════════════════════════════════════════════════════════════════════

    init() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.boot());
        else this.boot();
    }

    boot() {
        this.lock.showLockScreen();
        ['click','keydown','mousemove','touchstart'].forEach(ev =>
            document.addEventListener(ev, () => { if (!this.lock.isLocked) this.lock.resetAutoLock(); }, { passive:true })
        );
    }

    async afterUnlock() {
        await this.loadFromStorage();
        this.restoreCloudConnections();
        this.handleOAuthCallback();
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
        this.showSection('dashboard');
        this.updateSyncStatus();
        document.getElementById('appShell').style.display = 'flex';
        console.log('🏪 StoreWise AI ready | Sync:', this.syncProvider);
        // Start guided tour on first login (after UI is visible)
        setTimeout(() => SwTour.start(), 800);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENCRYPTED STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    getDataBundle() {
        return { products:this.products, transactions:this.transactions, suppliers:this.suppliers, settings:this.settings, savedAt:new Date().toISOString(), version:'3.0' };
    }

    async loadFromStorage() {
        try {
            const encrypted = localStorage.getItem('sw_enc_data');
            if (encrypted && this.lock.sessionKey) {
                const json = await SwCrypto.decrypt(encrypted, this.lock.sessionKey);
                const data = JSON.parse(json);
                this.products     = data.products     || JSON.parse(JSON.stringify(this.defaultProducts));
                this.transactions = data.transactions || JSON.parse(JSON.stringify(this.defaultTransactions));
                this.suppliers    = data.suppliers    || JSON.parse(JSON.stringify(this.defaultSuppliers));
                this.settings     = data.settings     || JSON.parse(JSON.stringify(this.defaultSettings));
            } else {
                this.products     = JSON.parse(JSON.stringify(this.defaultProducts));
                this.transactions = JSON.parse(JSON.stringify(this.defaultTransactions));
                this.suppliers    = JSON.parse(JSON.stringify(this.defaultSuppliers));
                this.settings     = JSON.parse(JSON.stringify(this.defaultSettings));
            }
        } catch(e) {
            console.warn('Decrypt failed — using defaults.', e);
            this.products     = JSON.parse(JSON.stringify(this.defaultProducts));
            this.transactions = JSON.parse(JSON.stringify(this.defaultTransactions));
            this.suppliers    = JSON.parse(JSON.stringify(this.defaultSuppliers));
            this.settings     = JSON.parse(JSON.stringify(this.defaultSettings));
        }
    }

    async saveToLocalStorage() {
        if (!this.lock.sessionKey) return;
        const encrypted = await SwCrypto.encrypt(JSON.stringify(this.getDataBundle()), this.lock.sessionKey);
        localStorage.setItem('sw_enc_data', encrypted);
    }

    applyDataBundle(data) {
        if (data.products)     this.products     = data.products;
        if (data.transactions) this.transactions = data.transactions;
        if (data.suppliers)    this.suppliers    = data.suppliers;
        if (data.settings)     this.settings     = { ...this.settings, ...data.settings };
        this.saveToStorage();
        this.populateDropdowns(); this.updateMetrics(); this.renderDashboard();
    }

    async saveToStorage() {
        await this.saveToLocalStorage();
        if (this.syncProvider==='gdrive'     && this.gdriveToken)  await this.saveToGDrive();
        if (this.syncProvider==='dropbox'    && this.dropboxToken) await this.saveToDropbox();
        if (this.syncProvider==='filesystem' && this.fileHandle)   await this.saveToFileSystem();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FILE SYSTEM API
    // ═══════════════════════════════════════════════════════════════════════════

    isFileSystemSupported() { return 'showSaveFilePicker' in window; }

    async connectFileSystem() {
        if (!this.isFileSystemSupported()) { this.showToast('⚠️ Use Chrome or Edge for this feature.','warning'); return; }
        try {
            const [handle] = await window.showOpenFilePicker({ types:[{description:'StoreWise Data',accept:{'application/json':['.json','.enc']}}] });
            this.fileHandle = handle;
            const text = await (await handle.getFile()).text();
            let data;
            try { data = JSON.parse(await SwCrypto.decrypt(text, this.lock.sessionKey)); }
            catch { data = JSON.parse(text); }
            this.applyDataBundle(data);
            this.syncProvider = 'filesystem';
            localStorage.setItem('sw_sync_provider','filesystem');
            this.updateSyncStatus();
            this.showToast('✅ Local file connected & data loaded.');
        } catch(e) {
            if (e.name==='AbortError') return;
            await this.createNewFileSystemFile();
        }
    }

    async createNewFileSystemFile() {
        try {
            this.fileHandle = await window.showSaveFilePicker({ suggestedName:'storewise-data.enc', types:[{description:'StoreWise Encrypted Data',accept:{'application/json':['.enc','.json']}}] });
            this.syncProvider = 'filesystem';
            localStorage.setItem('sw_sync_provider','filesystem');
            await this.saveToFileSystem();
            this.updateSyncStatus();
            this.showToast('✅ Encrypted data file created!');
        } catch(e) { if(e.name!=='AbortError') this.showToast('❌ Could not create file.','error'); }
    }

    async saveToFileSystem() {
        if (!this.fileHandle) return;
        try {
            const encrypted = await SwCrypto.encrypt(JSON.stringify(this.getDataBundle()), this.lock.sessionKey);
            const writable  = await this.fileHandle.createWritable();
            await writable.write(encrypted);
            await writable.close();
        } catch(e) { this.showToast('⚠️ File save failed — reconnect to restore permission.','warning'); }
    }

    disconnectFileSystem() {
        this.fileHandle=null; this.syncProvider='local';
        localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus(); this.showToast('Disconnected from local file.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GOOGLE DRIVE
    // ═══════════════════════════════════════════════════════════════════════════

    connectGDrive() {
        if (CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_')) { this.showToast('⚠️ Add your Google Client ID to CONFIG in app.js first.','warning',7000); return; }
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&state=gdrive`;
    }

    async handleGDriveCallback(token) {
        this.gdriveToken=token; this.syncProvider='gdrive';
        localStorage.setItem('sw_sync_provider','gdrive'); localStorage.setItem('sw_gdrive_token',token);
        await this.loadFromGDrive(); this.updateSyncStatus();
    }

    async loadFromGDrive() {
        try {
            if (!this.gdriveFileId) {
                const res  = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'storewise-data.enc'+and+trashed%3Dfalse&fields=files(id)`,{headers:{Authorization:`Bearer ${this.gdriveToken}`}});
                const json = await res.json();
                if (json.files?.length) { this.gdriveFileId=json.files[0].id; localStorage.setItem('sw_gdrive_file_id',this.gdriveFileId); }
            }
            if (this.gdriveFileId) {
                const res  = await fetch(`https://www.googleapis.com/drive/v3/files/${this.gdriveFileId}?alt=media`,{headers:{Authorization:`Bearer ${this.gdriveToken}`}});
                const text = await res.text();
                let data;
                try { data = JSON.parse(await SwCrypto.decrypt(text, this.lock.sessionKey)); }
                catch { data = JSON.parse(text); }
                this.applyDataBundle(data); this.showToast('✅ Google Drive data loaded!');
            } else { await this.saveToGDrive(); this.showToast('✅ New encrypted Google Drive file created!'); }
        } catch(e) { this.showToast('❌ Google Drive load failed.','error'); console.error(e); }
    }

    async saveToGDrive() {
        if (!this.gdriveToken) return;
        try {
            const body = await SwCrypto.encrypt(JSON.stringify(this.getDataBundle()), this.lock.sessionKey);
            if (this.gdriveFileId) {
                await fetch(`https://www.googleapis.com/upload/drive/v3/files/${this.gdriveFileId}?uploadType=media`,{method:'PATCH',headers:{Authorization:`Bearer ${this.gdriveToken}`,'Content-Type':'text/plain'},body});
            } else {
                const meta = new Blob([JSON.stringify({name:'storewise-data.enc',mimeType:'text/plain'})],{type:'application/json'});
                const file = new Blob([body],{type:'text/plain'});
                const form = new FormData(); form.append('metadata',meta); form.append('file',file);
                const res  = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{Authorization:`Bearer ${this.gdriveToken}`},body:form});
                const data = await res.json(); this.gdriveFileId=data.id; localStorage.setItem('sw_gdrive_file_id',this.gdriveFileId);
            }
        } catch(e) { this.showToast('⚠️ Google Drive save failed.','warning'); }
    }

    disconnectGDrive() {
        this.gdriveToken=null; this.gdriveFileId=null; this.syncProvider='local';
        localStorage.removeItem('sw_gdrive_token'); localStorage.removeItem('sw_gdrive_file_id');
        localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus(); this.showToast('Disconnected from Google Drive.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DROPBOX
    // ═══════════════════════════════════════════════════════════════════════════

    connectDropbox() {
        if (CONFIG.DROPBOX_APP_KEY.startsWith('YOUR_')) { this.showToast('⚠️ Add your Dropbox App Key to CONFIG in app.js first.','warning',7000); return; }
        window.location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${CONFIG.DROPBOX_APP_KEY}&response_type=token&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&state=dropbox`;
    }

    async handleDropboxCallback(token) {
        this.dropboxToken=token; this.syncProvider='dropbox';
        localStorage.setItem('sw_sync_provider','dropbox'); localStorage.setItem('sw_dropbox_token',token);
        await this.loadFromDropbox(); this.updateSyncStatus();
    }

    async loadFromDropbox() {
        try {
            const res = await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:`Bearer ${this.dropboxToken}`,'Dropbox-API-Arg':JSON.stringify({path:'/storewise-data.enc'})}});
            if (res.status===409) { await this.saveToDropbox(); this.showToast('✅ New encrypted Dropbox file created!'); return; }
            const text = await res.text();
            let data;
            try { data = JSON.parse(await SwCrypto.decrypt(text, this.lock.sessionKey)); }
            catch { data = JSON.parse(text); }
            this.applyDataBundle(data); this.showToast('✅ Dropbox data loaded!');
        } catch(e) { this.showToast('❌ Dropbox load failed.','error'); }
    }

    async saveToDropbox() {
        if (!this.dropboxToken) return;
        try {
            const body = await SwCrypto.encrypt(JSON.stringify(this.getDataBundle()), this.lock.sessionKey);
            await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{Authorization:`Bearer ${this.dropboxToken}`,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify({path:'/storewise-data.enc',mode:'overwrite',autorename:false,mute:true})},body});
        } catch(e) { this.showToast('⚠️ Dropbox save failed.','warning'); }
    }

    disconnectDropbox() {
        this.dropboxToken=null; this.syncProvider='local';
        localStorage.removeItem('sw_dropbox_token'); localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus(); this.showToast('Disconnected from Dropbox.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OAUTH CALLBACK + RESTORE
    // ═══════════════════════════════════════════════════════════════════════════

    handleOAuthCallback() {
        const hash = window.location.hash; if (!hash) return;
        const params = new URLSearchParams(hash.substring(1));
        const token  = params.get('access_token'), state = params.get('state');
        if (!token) return;
        window.history.replaceState({},document.title,window.location.pathname);
        if (state==='gdrive')  this.handleGDriveCallback(token);
        if (state==='dropbox') this.handleDropboxCallback(token);
    }

    restoreCloudConnections() {
        const p = localStorage.getItem('sw_sync_provider')||'local';
        this.syncProvider = p;
        if (p==='gdrive')  { const t=localStorage.getItem('sw_gdrive_token');  if(t){this.gdriveToken=t;this.gdriveFileId=localStorage.getItem('sw_gdrive_file_id');}else this.syncProvider='local'; }
        if (p==='dropbox') { const t=localStorage.getItem('sw_dropbox_token'); if(t) this.dropboxToken=t; else this.syncProvider='local'; }
        if (p==='filesystem') { this.syncProvider='local'; localStorage.setItem('sw_sync_provider','local'); }
    }

    updateSyncStatus() {
        const icons  = {local:'💾',gdrive:'🟢',dropbox:'🔵',filesystem:'📁'};
        const labels = {local:'Browser Only',gdrive:'Google Drive',dropbox:'Dropbox',filesystem:'Local File'};
        const badge  = document.getElementById('syncBadge');  if(badge)  badge.textContent  = `${icons[this.syncProvider]} ${labels[this.syncProvider]}`;
        const detail = document.getElementById('syncDetail'); if(detail) detail.textContent = labels[this.syncProvider];
        ['gdrive','dropbox','filesystem'].forEach(p=>{
            const c=document.getElementById(`connect_${p}`),d=document.getElementById(`disconnect_${p}`),a=document.getElementById(`active_${p}`);
            if(c) c.style.display=this.syncProvider===p?'none':'inline-flex';
            if(d) d.style.display=this.syncProvider===p?'inline-flex':'none';
            if(a) a.style.display=this.syncProvider===p?'block':'none';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════════════

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-item')) {
                e.preventDefault();
                const s = e.target.closest('.menu-item').getAttribute('data-section');
                if(s) this.showSection(s);
                return;
            }
            const btn = e.target.closest('[id]'); if(!btn) return;
            const map = {
                quickSaleBtn:            () => this.showSection('sales'),
                addProductBtn:           () => this.showProductModal(),
                addNewProductBtn:        () => this.showProductModal(),
                closeProductModal:       () => this.hideProductModal(),
                cancelProductBtn:        () => this.hideProductModal(),
                saveProductBtn:          () => this.saveProduct(),
                closeCheckoutModal:      () => this.hideCheckoutModal(),
                cancelCheckoutBtn:       () => this.hideCheckoutModal(),
                completePaymentBtn:      () => this.completePayment(),
                clearCartBtn:            () => this.clearCart(),
                checkoutBtn:             () => this.showCheckoutModal(),
                addSupplierBtn:          () => this.showSupplierModal(),
                closeSupplierModal:      () => this.hideSupplierModal(),
                cancelSupplierBtn:       () => this.hideSupplierModal(),
                saveSupplierBtn:         () => this.saveSupplier(),
                settingsExportBtn:       () => this.exportData(),
                settingsImportBtn:       () => this.importData(),
                settingsResetBtn:        () => this.resetData(),
                exportDataBtn:           () => this.exportData(),
                importDataBtn:           () => this.importData(),
                saveStoreSettingsBtn:    () => this.saveStoreSettings(),
                saveInventorySettingsBtn:() => this.saveInventorySettings(),
                connect_filesystem:      () => this.connectFileSystem(),
                disconnect_filesystem:   () => this.disconnectFileSystem(),
                connect_gdrive:          () => this.connectGDrive(),
                disconnect_gdrive:       () => this.disconnectGDrive(),
                connect_dropbox:         () => this.connectDropbox(),
                disconnect_dropbox:      () => this.disconnectDropbox(),
                gdrive_load_now:         () => this.loadFromGDrive(),
                dropbox_load_now:        () => this.loadFromDropbox(),
                lockAppBtn:              () => this.lock.lock(),
                changePINBtn:            () => this.showChangePINModal(),
                saveChangePINBtn:        () => this.doChangePIN(),
                closeChangePINModal:     () => document.getElementById('changePINModal')?.classList.add('hidden'),
            };
            if (map[btn.id]) { e.preventDefault(); map[btn.id](); return; }
            if (e.target.classList.contains('settings-nav-item')) {
                const s = e.target.getAttribute('data-settings'); if(s) this.showSettingsPanel(s);
            }
            if (e.target.classList.contains('modal')) e.target.classList.add('hidden');
        });

        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('open'));
        document.getElementById('posSearch')?.addEventListener('input', e => this.handlePOSSearch(e.target.value));
        document.getElementById('productSearch')?.addEventListener('input', () => this.filterProducts());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.filterProducts());
        document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHANGE PIN
    // ═══════════════════════════════════════════════════════════════════════════

    showChangePINModal() { document.getElementById('changePINModal')?.classList.remove('hidden'); }

    async doChangePIN() {
        const oldPIN  = document.getElementById('oldPIN')?.value;
        const newPIN  = document.getElementById('newPIN')?.value;
        const confPIN = document.getElementById('confirmNewPIN')?.value;
        const errEl   = document.getElementById('changePINError');
        try {
            await this.lock.changePIN(oldPIN, newPIN, confPIN, this);
            document.getElementById('changePINModal')?.classList.add('hidden');
            document.getElementById('changePINForm')?.reset();
            this.showToast('✅ PIN changed successfully!');
        } catch(e) {
            if(errEl) { errEl.textContent=e.message; errEl.classList.remove('hidden'); }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════

    showSection(id) {
        document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('active'));
        document.querySelector(`[data-section="${id}"]`)?.classList.add('active');
        const titles = {dashboard:'Dashboard',inventory:'Inventory Management',sales:'Sales & POS',analytics:'Analytics & Reports',suppliers:'Supplier Management',settings:'Settings'};
        const pt = document.getElementById('pageTitle'); if(pt) pt.textContent = titles[id]||id;
        document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.currentSection = id;
        ({
            dashboard: () => this.renderDashboard(),
            inventory: () => this.renderInventory(),
            sales:     () => this.renderSales(),
            analytics: () => this.renderAnalytics(),
            suppliers: () => this.renderSuppliers(),
            settings:  () => this.renderSettings()
        })[id]?.();
        document.getElementById('sidebar')?.classList.remove('open');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════

    renderDashboard() {
        this.updateMetrics();
        this.renderStockAlerts();
        this.renderRecentActivity();
        setTimeout(() => this.renderSalesChart(), 200);
    }

    updateMetrics() {
        const s = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        s('totalValue',    `$${this.products.reduce((s,p)=>s+p.price*p.stock,0).toFixed(2)}`);
        s('totalProducts', this.products.length.toString());
        s('lowStockCount', this.products.filter(p=>p.stock<=p.min_stock).length.toString());
        s('todaySales',    `$${this.getTodaySales().toFixed(2)}`);
    }

    renderStockAlerts() {
        const list = document.getElementById('alertList'); if(!list) return;
        const low  = this.products.filter(p=>p.stock<=p.min_stock);
        list.innerHTML = low.length===0
            ? '<div class="alert-item"><div class="alert-message">No stock alerts ✅</div></div>'
            : low.map(p=>`<div class="alert-item"><div class="alert-product">${p.name}</div><div class="alert-message">Only ${p.stock} left (min: ${p.min_stock})</div></div>`).join('');
    }

    renderRecentActivity() {
        const list = document.getElementById('activityList'); if(!list) return;
        const r    = this.transactions.slice(-5).reverse();
        list.innerHTML = r.length===0
            ? '<div class="activity-item"><div class="activity-text">No recent activity</div></div>'
            : r.map(t=>`<div class="activity-item"><div class="activity-time">${t.time}</div><div class="activity-text">Sale ${t.id} — $${t.total.toFixed(2)} (${t.payment_method})</div></div>`).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVENTORY
    // ═══════════════════════════════════════════════════════════════════════════

    renderInventory() { this.filterProducts(); }

    filterProducts() {
        const q   = (document.getElementById('productSearch')?.value||'').toLowerCase();
        const cat = document.getElementById('categoryFilter')?.value||'';
        const f   = this.products.filter(p=>(p.name.toLowerCase().includes(q)||p.barcode.includes(q))&&(!cat||p.category===cat));
        const grid = document.getElementById('inventoryGrid'); if(!grid) return;
        grid.innerHTML = f.length===0
            ? '<div class="empty-state"><p>No products found</p></div>'
            : f.map(p=>`
                <div class="product-card">
                    <div class="product-image">${p.image_url}</div>
                    <div class="product-name">${p.name}</div>
                    <div class="product-details">
                        <div class="product-detail"><span class="product-detail-label">Price:</span><span class="product-detail-value">$${p.price.toFixed(2)}</span></div>
                        <div class="product-detail"><span class="product-detail-label">Stock:</span><span class="product-detail-value">${p.stock} <span class="stock-indicator ${p.stock<=p.min_stock?'low':'normal'}">${p.stock<=p.min_stock?'Low':'OK'}</span></span></div>
                        <div class="product-detail"><span class="product-detail-label">Category:</span><span class="product-detail-value">${p.category}</span></div>
                        <div class="product-detail"><span class="product-detail-label">Supplier:</span><span class="product-detail-value">${p.supplier}</span></div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn--outline btn--sm" onclick="window.app.editProduct('${p.id}')">Edit</button>
                        <button class="btn btn--primary btn--sm" onclick="window.app.addToCart('${p.id}')">Add to Cart</button>
                        <button class="btn btn--danger btn--sm"  onclick="window.app.deleteProduct('${p.id}')">Delete</button>
                    </div>
                </div>`).join('');
    }

    deleteProduct(id) {
        const p = this.products.find(p=>p.id===id);
        if (!p||!confirm(`Delete "${p.name}"?`)) return;
        this.products = this.products.filter(p=>p.id!==id);
        this.saveToStorage(); this.updateMetrics(); this.filterProducts();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SALES / POS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSales() { this.renderTransactions(); this.updateCartDisplay(); }

    renderTransactions() {
        const list = document.getElementById('transactionList'); if(!list) return;
        const r    = this.transactions.slice(-10).reverse();
        list.innerHTML = r.length===0
            ? '<div class="empty-state"><p>No transactions yet</p></div>'
            : r.map(t=>`<div class="transaction-item"><div class="transaction-header"><span class="transaction-id">${t.id}</span><span class="transaction-amount">$${t.total.toFixed(2)}</span></div><div class="transaction-details">${t.time} • ${t.payment_method} • ${t.customer_name||'Walk-in'}</div></div>`).join('');
    }

    handlePOSSearch(q) {
        if(q.length<2) return;
        const p = this.products.find(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.barcode===q);
        if(p) { this.addToCart(p.id); const el=document.getElementById('posSearch'); if(el) el.value=''; }
    }

    addToCart(pid, qty=1) {
        const p  = this.products.find(p=>p.id===pid); if(!p) return;
        const ex = this.cart[pid];
        if(ex) ex.quantity+=qty;
        else   this.cart[pid] = {product_id:pid, quantity:qty, price:p.price, name:p.name};
        this.updateCartDisplay();
    }

    get cartItems() { return Object.values(this.cart); }

    updateCartDisplay() {
        const ci  = document.getElementById('cartItems');
        const cs  = document.getElementById('cartSubtotal');
        const ct  = document.getElementById('cartTax');
        const cto = document.getElementById('cartTotal');
        const cb  = document.getElementById('checkoutBtn');
        if(!ci) return;
        const items = this.cartItems;
        if(!items.length) {
            ci.innerHTML = '<div class="empty-cart"><p>Scan or search products to add to cart</p></div>';
            [cs,ct,cto].forEach(el=>{if(el) el.textContent='$0.00';});
            if(cb) cb.disabled=true;
            return;
        }
        ci.innerHTML = items.map(item=>`
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="window.app.updateCartQty('${item.product_id}',-1)">-</button>
                    <span style="padding:0 8px">${item.quantity}</span>
                    <button class="quantity-btn" onclick="window.app.updateCartQty('${item.product_id}',1)">+</button>
                    <button class="quantity-btn" onclick="window.app.removeFromCart('${item.product_id}')" style="margin-left:8px;color:var(--color-error)">×</button>
                </div>
            </div>`).join('');
        const sub   = items.reduce((s,i)=>s+i.price*i.quantity,0);
        const tax   = sub * this.settings.tax_rate;
        const total = sub + tax;
        if(cs)  cs.textContent  = `$${sub.toFixed(2)}`;
        if(ct)  ct.textContent  = `$${tax.toFixed(2)}`;
        if(cto) cto.textContent = `$${total.toFixed(2)}`;
        if(cb)  cb.disabled     = false;
    }

    updateCartQty(pid, ch) {
        if(this.cart[pid]) { this.cart[pid].quantity = Math.max(1, this.cart[pid].quantity+ch); this.updateCartDisplay(); }
    }
    removeFromCart(pid) { delete this.cart[pid]; this.updateCartDisplay(); }
    clearCart()         { this.cart={}; this.updateCartDisplay(); }

    showCheckoutModal() {
        if(!this.cartItems.length) return;
        const sub = this.cartItems.reduce((s,i)=>s+i.price*i.quantity,0);
        const el  = document.getElementById('checkoutTotal');
        if(el) el.textContent = `$${(sub+sub*this.settings.tax_rate).toFixed(2)}`;
        document.getElementById('checkoutModal')?.classList.remove('hidden');
    }
    hideCheckoutModal() { document.getElementById('checkoutModal')?.classList.add('hidden'); }

    async completePayment() {
        const method = document.querySelector('input[name="paymentMethod"]:checked')?.value||'cash';
        const cname  = document.getElementById('customerName')?.value||'';
        const items  = this.cartItems;
        const sub    = items.reduce((s,i)=>s+i.price*i.quantity,0);
        const total  = sub + sub*this.settings.tax_rate;
        const t = {
            id:             `T${String(this.transactions.length+1).padStart(3,'0')}`,
            date:           new Date().toISOString().split('T')[0],
            time:           new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}),
            items:          [...items],
            total:          parseFloat(total.toFixed(2)),
            payment_method: method,
            customer_name:  cname||null
        };
        items.forEach(item => { const p=this.products.find(p=>p.id===item.product_id); if(p) p.stock-=item.quantity; });
        this.transactions.push(t);
        await this.saveToStorage();
        this.clearCart(); this.hideCheckoutModal(); this.updateMetrics(); this.renderTransactions();
        this.showToast(`✅ Payment complete! ${t.id}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════════════════

    renderAnalytics() {
        this.updatePerformanceMetrics();
        setTimeout(() => { this.renderTrendsChart(); this.renderTopProductsChart(); }, 200);
    }

    updatePerformanceMetrics() {
        let rev=0, cost=0;
        this.products.forEach(p=>{ rev+=p.price*p.stock; cost+=p.cost*p.stock; });
        const gm   = rev>0?(rev-cost)/rev*100:0;
        const avg  = this.transactions.length ? this.transactions.reduce((s,t)=>s+t.total,0)/this.transactions.length : 0;
        const sold = this.transactions.reduce((s,t)=>s+t.items.reduce((ss,i)=>ss+i.quantity,0),0);
        const avgS = this.products.reduce((s,p)=>s+p.stock,0)/(this.products.length||1);
        const turn = avgS>0?sold/avgS:0;
        const acc  = this.products.length ? this.products.filter(p=>p.stock>=p.min_stock).length/this.products.length*100 : 100;
        const items = document.querySelectorAll('.performance-item');
        if(items[0]) items[0].querySelector('.performance-value').textContent = `${gm.toFixed(1)}%`;
        if(items[1]) items[1].querySelector('.performance-value').textContent = `${turn.toFixed(1)}x`;
        if(items[2]) items[2].querySelector('.performance-value').textContent = `$${avg.toFixed(2)}`;
        if(items[3]) items[3].querySelector('.performance-value').textContent = `${acc.toFixed(1)}%`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUPPLIERS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSuppliers() {
        const g = document.getElementById('suppliersGrid'); if(!g) return;
        g.innerHTML = this.suppliers.map(s=>`
            <div class="supplier-card">
                <div class="supplier-name">${s.name}</div>
                <div class="supplier-contact">📞 ${s.contact}</div>
                <div class="supplier-contact">✉️ ${s.email}</div>
                <div class="product-actions" style="margin-top:12px">
                    <button class="btn btn--outline btn--sm" onclick="window.app.editSupplier('${s.id}')">Edit</button>
                    <button class="btn btn--danger btn--sm"  onclick="window.app.deleteSupplier('${s.id}')">Delete</button>
                </div>
            </div>`).join('');
    }

    showSupplierModal(id=null) {
        const modal = document.getElementById('supplierModal');
        const title = document.getElementById('supplierModalTitle');
        const form  = document.getElementById('supplierForm');
        if(!modal||!title||!form) return;
        if(id) {
            const s = this.suppliers.find(s=>s.id===id);
            title.textContent = 'Edit Supplier';
            document.getElementById('supplierName').value    = s.name;
            document.getElementById('supplierContact').value = s.contact;
            document.getElementById('supplierEmail').value   = s.email;
        } else { title.textContent='Add New Supplier'; form.reset(); }
        modal.dataset.supplierId = id||'';
        modal.classList.remove('hidden');
    }
    hideSupplierModal() { document.getElementById('supplierModal')?.classList.add('hidden'); }

    async saveSupplier() {
        const modal   = document.getElementById('supplierModal');
        const id      = modal?.dataset.supplierId;
        const name    = document.getElementById('supplierName')?.value.trim();
        const contact = document.getElementById('supplierContact')?.value.trim();
        const email   = document.getElementById('supplierEmail')?.value.trim();
        if(!name) { alert('Name required.'); return; }
        if(id) { const s=this.suppliers.find(s=>s.id===id); if(s) Object.assign(s,{name,contact,email}); }
        else   this.suppliers.push({ id:`S${String(this.suppliers.length+1).padStart(3,'0')}`, name, contact, email });
        await this.saveToStorage();
        this.populateDropdowns(); this.hideSupplierModal(); this.renderSuppliers();
        this.showToast('✅ Supplier saved!');
    }

    editSupplier(id) { this.showSupplierModal(id); }

    async deleteSupplier(id) {
        const s = this.suppliers.find(s=>s.id===id);
        if(!s||!confirm(`Delete "${s.name}"?`)) return;
        this.suppliers = this.suppliers.filter(s=>s.id!==id);
        await this.saveToStorage(); this.renderSuppliers();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSettings() { this.showSettingsPanel('store'); this.updateSyncStatus(); }

    showSettingsPanel(id) {
        document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));
        document.querySelector(`[data-settings="${id}"]`)?.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p=>p.classList.remove('active'));
        document.getElementById(`${id}Settings`)?.classList.add('active');
        if(id==='sync') this.updateSyncStatus();
    }

    saveStoreSettings() {
        this.settings.store_name = document.getElementById('settingsStoreName')?.value || this.settings.store_name;
        this.settings.address    = document.getElementById('settingsAddress')?.value    || this.settings.address;
        this.settings.phone      = document.getElementById('settingsPhone')?.value      || this.settings.phone;
        const tax = parseFloat(document.getElementById('settingsTaxRate')?.value);
        if(!isNaN(tax)) this.settings.tax_rate = tax/100;
        const sn = document.querySelector('.store-name'); if(sn) sn.textContent = this.settings.store_name;
        this.saveToStorage(); this.showToast('✅ Store settings saved!');
    }

    saveInventorySettings() {
        const t = parseInt(document.getElementById('settingsLowStockThreshold')?.value);
        if(!isNaN(t)) this.settings.low_stock_threshold = t;
        this.saveToStorage(); this.showToast('✅ Inventory settings saved!');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCT MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    showProductModal(id=null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        const form  = document.getElementById('productForm');
        if(!modal||!title||!form) return;
        if(id) { title.textContent='Edit Product'; this.populateProductForm(this.products.find(p=>p.id===id)); }
        else   { title.textContent='Add New Product'; form.reset(); }
        modal.dataset.productId = id||'';
        modal.classList.remove('hidden');
    }
    hideProductModal() { document.getElementById('productModal')?.classList.add('hidden'); }

    populateProductForm(p) {
        if(!p) return;
        const f = {productName:p.name,productCategory:p.category,productBarcode:p.barcode,productPrice:p.price,productCost:p.cost,productStock:p.stock,productMinStock:p.min_stock,productSupplier:p.supplier,productDescription:p.description};
        Object.entries(f).forEach(([id,v])=>{ const el=document.getElementById(id); if(el) el.value=v; });
    }

    async saveProduct() {
        const modal = document.getElementById('productModal');
        const id    = modal?.dataset.productId;
        const fd    = {
            name:        this.getVal('productName'),
            category:    this.getVal('productCategory'),
            barcode:     this.getVal('productBarcode'),
            price:       parseFloat(this.getVal('productPrice'))  || 0,
            cost:        parseFloat(this.getVal('productCost'))   || 0,
            stock:       parseInt(this.getVal('productStock'))    || 0,
            min_stock:   parseInt(this.getVal('productMinStock')) || 0,
            supplier:    this.getVal('productSupplier'),
            description: this.getVal('productDescription')
        };
        if(!fd.name) { alert('Product name required.'); return; }
        if(id) { const p=this.products.find(p=>p.id===id); if(p) Object.assign(p,fd); }
        else   this.products.push({ id:`P${String(this.products.length+1).padStart(3,'0')}`, image_url:this.getProductEmoji(fd.category), ...fd });
        await this.saveToStorage();
        this.hideProductModal(); this.updateMetrics();
        if(this.currentSection==='inventory') this.renderInventory();
        this.showToast('✅ Product saved!');
    }

    editProduct(id) { this.showProductModal(id); }
    getVal(id) { return document.getElementById(id)?.value||''; }

    getProductEmoji(cat) {
        return {Produce:'🥬',Dairy:'🥛',Beverages:'🥤',Bakery:'🍞',Meat:'🥩',Frozen:'🧊',Pantry:'🥫',Snacks:'🍿','Health & Beauty':'🧴',Household:'🧽'}[cat]||'📦';
    }

    populateDropdowns() {
        document.querySelectorAll('#categoryFilter,#productCategory').forEach(sel=>{
            sel.innerHTML = (sel.id==='categoryFilter'?'<option value="">All Categories</option>':'') +
                this.categories.map(c=>`<option value="${c}">${c}</option>`).join('');
        });
        const sup = document.getElementById('productSupplier');
        if(sup) sup.innerHTML = this.suppliers.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
        const fields = {
            settingsStoreName:         this.settings.store_name,
            settingsAddress:           this.settings.address,
            settingsPhone:             this.settings.phone,
            settingsTaxRate:           (this.settings.tax_rate*100).toFixed(2),
            settingsLowStockThreshold: this.settings.low_stock_threshold
        };
        Object.entries(fields).forEach(([id,v])=>{ const el=document.getElementById(id); if(el) el.value=v; });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    getTodaySales() {
        const today = new Date().toISOString().split('T')[0];
        return this.transactions.filter(t=>t.date===today).reduce((s,t)=>s+t.total,0);
    }

    showToast(msg, type='success', duration=3000) {
        let t = document.getElementById('swToast');
        if(!t) {
            t = document.createElement('div');
            t.id = 'swToast';
            t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-base);padding:12px 20px;box-shadow:var(--shadow-lg);z-index:9999;font-size:var(--font-size-md);color:var(--color-text);transition:opacity 0.3s;opacity:0;max-width:360px;';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(()=>{ t.style.opacity='0'; }, duration);
    }

    exportData() {
        const b = new Blob([JSON.stringify(this.getDataBundle(),null,2)],{type:'application/json'});
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u; a.download = `storewise-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
        this.showToast('✅ Data exported (unencrypted — keep this file safe!)');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,.enc';
        input.onchange = e => {
            const file = e.target.files[0]; if(!file) return;
            const r = new FileReader();
            r.onload = ev => {
                try {
                    const d = JSON.parse(ev.target.result);
                    if(confirm('Replace all data?')) { this.applyDataBundle(d); this.showToast('✅ Data imported!'); }
                } catch { alert('Error: Invalid file format'); }
            };
            r.readAsText(file);
        };
        input.click();
    }

    resetData() {
        if(!confirm('Reset ALL data to defaults?')) return;
        this.products     = JSON.parse(JSON.stringify(this.defaultProducts));
        this.transactions = JSON.parse(JSON.stringify(this.defaultTransactions));
        this.suppliers    = JSON.parse(JSON.stringify(this.defaultSuppliers));
        this.settings     = JSON.parse(JSON.stringify(this.defaultSettings));
        this.saveToStorage(); this.populateDropdowns(); this.updateMetrics(); this.renderDashboard();
        this.showToast('✅ Data reset!');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHARTS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSalesChart() {
        const canvas = document.getElementById('salesChart'); if(!canvas) return;
        if(this.charts.sales) this.charts.sales.destroy();
        const days=[], sales=[];
        for(let i=6;i>=0;i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const ds = d.toISOString().split('T')[0];
            days.push(d.toLocaleDateString('en-US',{weekday:'short'}));
            sales.push(this.transactions.filter(t=>t.date===ds).reduce((s,t)=>s+t.total,0));
        }
        this.charts.sales = new Chart(canvas.getContext('2d'), {
            type:'line',
            data:{ labels:days, datasets:[{label:'Sales',data:sales,borderColor:'#1FB8CD',backgroundColor:'rgba(31,184,205,0.1)',fill:true,tension:0.4}] },
            options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
        });
    }

    renderTrendsChart() {
        const canvas = document.getElementById('trendsChart'); if(!canvas) return;
        if(this.charts.trends) this.charts.trends.destroy();
        const labels = ['4 wks ago','3 wks ago','2 wks ago','This week'];
        const data   = [0,0,0,0];
        this.transactions.forEach(t=>{
            const d = Math.floor((new Date()-new Date(t.date))/86400000);
            if(d<7) data[3]+=t.total; else if(d<14) data[2]+=t.total; else if(d<21) data[1]+=t.total; else if(d<28) data[0]+=t.total;
        });
        this.charts.trends = new Chart(canvas.getContext('2d'), {
            type:'bar',
            data:{ labels, datasets:[{label:'Sales',data,backgroundColor:['#1FB8CD','#FFC185','#B4413C','#ECEBD5']}] },
            options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
        });
    }

    renderTopProductsChart() {
        const canvas = document.getElementById('topProductsChart'); if(!canvas) return;
        if(this.charts.topProducts) this.charts.topProducts.destroy();
        const sm = {};
        this.transactions.forEach(t=>t.items.forEach(i=>{ sm[i.product_id]=(sm[i.product_id]||0)+i.quantity; }));
        const top5 = this.products.map(p=>({name:p.name,sold:sm[p.id]||0})).sort((a,b)=>b.sold-a.sold).slice(0,5);
        this.charts.topProducts = new Chart(canvas.getContext('2d'), {
            type:'doughnut',
            data:{ labels:top5.map(p=>p.name), datasets:[{data:top5.map(p=>p.sold||1),backgroundColor:['#1FB8CD','#FFC185','#B4413C','#ECEBD5','#5D878F']}] },
            options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new StoreWiseApp(); });
window.app = null;
