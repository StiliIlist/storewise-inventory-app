// StoreWise AI - Inventory Management Application
// ─────────────────────────────────────────────────────────────────────────────
// CLOUD SYNC CONFIGURATION
// Google Drive: get Client ID from https://console.cloud.google.com
// Dropbox:      get App Key from  https://www.dropbox.com/developers/apps
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    DROPBOX_APP_KEY:  'YOUR_DROPBOX_APP_KEY',
    REDIRECT_URI:     window.location.origin + window.location.pathname
};

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
        this.defaultSettings = { store_name:"Sunny Corner Market", address:"123 Main Street, Anytown, CA 94102", phone:"555-0100", tax_rate:0.0875, currency:"USD", low_stock_threshold:10 };
        this.categories = ["Produce","Dairy","Beverages","Bakery","Meat","Frozen","Pantry","Snacks","Health & Beauty","Household"];

        // Sync state
        this.syncProvider  = 'local';
        this.fileHandle    = null;
        this.gdriveToken   = null;
        this.gdriveFileId  = null;
        this.dropboxToken  = null;

        this.loadFromStorage();
        this.currentSection = 'dashboard';
        this.cart   = [];
        this.charts = {};
        this.init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    loadFromStorage() {
        try {
            this.products     = JSON.parse(localStorage.getItem('sw_products'))     || JSON.parse(JSON.stringify(this.defaultProducts));
            this.transactions = JSON.parse(localStorage.getItem('sw_transactions')) || JSON.parse(JSON.stringify(this.defaultTransactions));
            this.suppliers    = JSON.parse(localStorage.getItem('sw_suppliers'))    || JSON.parse(JSON.stringify(this.defaultSuppliers));
            this.settings     = JSON.parse(localStorage.getItem('sw_settings'))     || JSON.parse(JSON.stringify(this.defaultSettings));
        } catch(e) {
            this.products     = JSON.parse(JSON.stringify(this.defaultProducts));
            this.transactions = JSON.parse(JSON.stringify(this.defaultTransactions));
            this.suppliers    = JSON.parse(JSON.stringify(this.defaultSuppliers));
            this.settings     = JSON.parse(JSON.stringify(this.defaultSettings));
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('sw_products',     JSON.stringify(this.products));
        localStorage.setItem('sw_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('sw_suppliers',    JSON.stringify(this.suppliers));
        localStorage.setItem('sw_settings',     JSON.stringify(this.settings));
    }

    getDataBundle() {
        return { products:this.products, transactions:this.transactions, suppliers:this.suppliers, settings:this.settings, savedAt:new Date().toISOString(), version:'2.0' };
    }

    applyDataBundle(data) {
        if (data.products)     this.products     = data.products;
        if (data.transactions) this.transactions = data.transactions;
        if (data.suppliers)    this.suppliers    = data.suppliers;
        if (data.settings)     this.settings     = { ...this.settings, ...data.settings };
        this.saveToLocalStorage();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
    }

    async saveToStorage() {
        this.saveToLocalStorage();
        if (this.syncProvider === 'gdrive'     && this.gdriveToken)  await this.saveToGDrive();
        if (this.syncProvider === 'dropbox'    && this.dropboxToken) await this.saveToDropbox();
        if (this.syncProvider === 'filesystem' && this.fileHandle)   await this.saveToFileSystem();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 4 — FILE SYSTEM ACCESS API
    // ═══════════════════════════════════════════════════════════════════════════

    isFileSystemSupported() { return 'showSaveFilePicker' in window; }

    async connectFileSystem() {
        if (!this.isFileSystemSupported()) {
            this.showToast('⚠️ File System API not supported. Use Chrome or Edge.', 'warning');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description:'StoreWise Data', accept:{'application/json':['.json']} }]
            });
            this.fileHandle = handle;
            const file = await handle.getFile();
            const data = JSON.parse(await file.text());
            this.applyDataBundle(data);
            this.syncProvider = 'filesystem';
            localStorage.setItem('sw_sync_provider','filesystem');
            this.updateSyncStatus();
            this.showToast('✅ Connected! Data loaded from local file.');
        } catch(e) {
            if (e.name === 'AbortError') return;
            // No file chosen — offer to create new
            await this.createNewFileSystemFile();
        }
    }

    async createNewFileSystemFile() {
        try {
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: 'storewise-data.json',
                types: [{ description:'StoreWise Data', accept:{'application/json':['.json']} }]
            });
            this.syncProvider = 'filesystem';
            localStorage.setItem('sw_sync_provider','filesystem');
            await this.saveToFileSystem();
            this.updateSyncStatus();
            this.showToast('✅ Data file created! Changes auto-save here.');
        } catch(e) {
            if (e.name !== 'AbortError') this.showToast('❌ Could not create file.', 'error');
        }
    }

    async saveToFileSystem() {
        if (!this.fileHandle) return;
        try {
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(this.getDataBundle(), null, 2));
            await writable.close();
        } catch(e) {
            this.showToast('⚠️ File save failed — reconnect to restore permission.', 'warning');
        }
    }

    disconnectFileSystem() {
        this.fileHandle   = null;
        this.syncProvider = 'local';
        localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus();
        this.showToast('Disconnected from local file.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 2 — GOOGLE DRIVE
    // ═══════════════════════════════════════════════════════════════════════════

    connectGDrive() {
        if (CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
            this.showToast('⚠️ Add your Google Client ID to CONFIG in app.js first. See the setup guide in Settings > Data Sync.', 'warning', 7000);
            return;
        }
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth`
            + `?client_id=${CONFIG.GOOGLE_CLIENT_ID}`
            + `&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`
            + `&response_type=token`
            + `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}`
            + `&state=gdrive`;
        window.location.href = authUrl;
    }

    async handleGDriveCallback(token) {
        this.gdriveToken  = token;
        this.syncProvider = 'gdrive';
        localStorage.setItem('sw_sync_provider','gdrive');
        localStorage.setItem('sw_gdrive_token', token);
        await this.loadFromGDrive();
        this.updateSyncStatus();
    }

    async loadFromGDrive() {
        try {
            if (!this.gdriveFileId) {
                const res  = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'storewise-data.json'+and+trashed%3Dfalse&fields=files(id)`, { headers:{ Authorization:`Bearer ${this.gdriveToken}` } });
                const json = await res.json();
                if (json.files && json.files.length > 0) {
                    this.gdriveFileId = json.files[0].id;
                    localStorage.setItem('sw_gdrive_file_id', this.gdriveFileId);
                }
            }
            if (this.gdriveFileId) {
                const res  = await fetch(`https://www.googleapis.com/drive/v3/files/${this.gdriveFileId}?alt=media`, { headers:{ Authorization:`Bearer ${this.gdriveToken}` } });
                const data = await res.json();
                this.applyDataBundle(data);
                this.showToast('✅ Google Drive data loaded!');
            } else {
                await this.saveToGDrive();
                this.showToast('✅ New Google Drive file created!');
            }
        } catch(e) {
            this.showToast('❌ Google Drive load failed.', 'error');
        }
    }

    async saveToGDrive() {
        if (!this.gdriveToken) return;
        const body = JSON.stringify(this.getDataBundle(), null, 2);
        try {
            if (this.gdriveFileId) {
                await fetch(`https://www.googleapis.com/upload/drive/v3/files/${this.gdriveFileId}?uploadType=media`, {
                    method:'PATCH', headers:{ Authorization:`Bearer ${this.gdriveToken}`, 'Content-Type':'application/json' }, body
                });
            } else {
                const meta = new Blob([JSON.stringify({name:'storewise-data.json',mimeType:'application/json'})], {type:'application/json'});
                const file = new Blob([body], {type:'application/json'});
                const form = new FormData(); form.append('metadata',meta); form.append('file',file);
                const res  = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method:'POST', headers:{ Authorization:`Bearer ${this.gdriveToken}` }, body:form
                });
                const data = await res.json();
                this.gdriveFileId = data.id;
                localStorage.setItem('sw_gdrive_file_id', this.gdriveFileId);
            }
        } catch(e) { this.showToast('⚠️ Google Drive save failed.', 'warning'); }
    }

    disconnectGDrive() {
        this.gdriveToken  = null; this.gdriveFileId = null; this.syncProvider = 'local';
        localStorage.removeItem('sw_gdrive_token'); localStorage.removeItem('sw_gdrive_file_id');
        localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus(); this.showToast('Disconnected from Google Drive.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 3 — DROPBOX
    // ═══════════════════════════════════════════════════════════════════════════

    connectDropbox() {
        if (CONFIG.DROPBOX_APP_KEY.startsWith('YOUR_')) {
            this.showToast('⚠️ Add your Dropbox App Key to CONFIG in app.js first. See the setup guide in Settings > Data Sync.', 'warning', 7000);
            return;
        }
        const authUrl = `https://www.dropbox.com/oauth2/authorize`
            + `?client_id=${CONFIG.DROPBOX_APP_KEY}`
            + `&response_type=token`
            + `&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`
            + `&state=dropbox`;
        window.location.href = authUrl;
    }

    async handleDropboxCallback(token) {
        this.dropboxToken = token;
        this.syncProvider = 'dropbox';
        localStorage.setItem('sw_sync_provider','dropbox');
        localStorage.setItem('sw_dropbox_token', token);
        await this.loadFromDropbox();
        this.updateSyncStatus();
    }

    async loadFromDropbox() {
        try {
            const res = await fetch('https://content.dropboxapi.com/2/files/download', {
                method:'POST',
                headers:{ Authorization:`Bearer ${this.dropboxToken}`, 'Dropbox-API-Arg':JSON.stringify({path:'/storewise-data.json'}) }
            });
            if (res.status === 409) { await this.saveToDropbox(); this.showToast('✅ New Dropbox file created!'); return; }
            const data = await res.json();
            this.applyDataBundle(data);
            this.showToast('✅ Dropbox data loaded!');
        } catch(e) { this.showToast('❌ Dropbox load failed.', 'error'); }
    }

    async saveToDropbox() {
        if (!this.dropboxToken) return;
        try {
            await fetch('https://content.dropboxapi.com/2/files/upload', {
                method:'POST',
                headers:{
                    Authorization:`Bearer ${this.dropboxToken}`,
                    'Content-Type':'application/octet-stream',
                    'Dropbox-API-Arg':JSON.stringify({path:'/storewise-data.json',mode:'overwrite',autorename:false,mute:true})
                },
                body: JSON.stringify(this.getDataBundle(), null, 2)
            });
        } catch(e) { this.showToast('⚠️ Dropbox save failed.', 'warning'); }
    }

    disconnectDropbox() {
        this.dropboxToken = null; this.syncProvider = 'local';
        localStorage.removeItem('sw_dropbox_token');
        localStorage.setItem('sw_sync_provider','local');
        this.updateSyncStatus(); this.showToast('Disconnected from Dropbox.');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OAUTH CALLBACK + RESTORE
    // ═══════════════════════════════════════════════════════════════════════════

    handleOAuthCallback() {
        const hash = window.location.hash;
        if (!hash) return;
        const params = new URLSearchParams(hash.substring(1));
        const token  = params.get('access_token');
        const state  = params.get('state');
        if (!token) return;
        window.history.replaceState({}, document.title, window.location.pathname);
        if (state === 'gdrive')  this.handleGDriveCallback(token);
        if (state === 'dropbox') this.handleDropboxCallback(token);
    }

    restoreCloudConnections() {
        const provider = localStorage.getItem('sw_sync_provider') || 'local';
        this.syncProvider = provider;
        if (provider === 'gdrive') {
            const token = localStorage.getItem('sw_gdrive_token');
            const fileId = localStorage.getItem('sw_gdrive_file_id');
            if (token) { this.gdriveToken = token; this.gdriveFileId = fileId; }
            else this.syncProvider = 'local';
        }
        if (provider === 'dropbox') {
            const token = localStorage.getItem('sw_dropbox_token');
            if (token) this.dropboxToken = token;
            else this.syncProvider = 'local';
        }
        if (provider === 'filesystem') {
            // FileHandle can't be restored across sessions — need reconnect
            this.syncProvider = 'local';
            localStorage.setItem('sw_sync_provider','local');
        }
    }

    updateSyncStatus() {
        const icons  = { local:'💾', gdrive:'🟢', dropbox:'🔵', filesystem:'📁' };
        const labels = { local:'Browser Only', gdrive:'Google Drive', dropbox:'Dropbox', filesystem:'Local File' };
        const badge  = document.getElementById('syncBadge');
        if (badge) badge.textContent = `${icons[this.syncProvider]} ${labels[this.syncProvider]}`;

        ['gdrive','dropbox','filesystem'].forEach(p => {
            document.getElementById(`connect_${p}`)?.style.setProperty('display',    this.syncProvider === p ? 'none' : 'inline-flex');
            document.getElementById(`disconnect_${p}`)?.style.setProperty('display', this.syncProvider === p ? 'inline-flex' : 'none');
            const activeEl = document.getElementById(`active_${p}`);
            if (activeEl) activeEl.style.display = this.syncProvider === p ? 'block' : 'none';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════════

    init() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        else this.setupApplication();
    }

    setupApplication() {
        this.restoreCloudConnections();
        this.handleOAuthCallback();
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
        this.showSection('dashboard');
        this.updateSyncStatus();
        console.log('🏪 StoreWise AI ready | Sync:', this.syncProvider);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════════════

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-item')) {
                e.preventDefault();
                const section = e.target.closest('.menu-item').getAttribute('data-section');
                if (section) this.showSection(section);
                return;
            }
            const btn = e.target.closest('[id]');
            if (!btn) return;
            const id = btn.id;
            const map = {
                quickSaleBtn:        () => this.showSection('sales'),
                addProductBtn:       () => this.showProductModal(),
                addNewProductBtn:    () => this.showProductModal(),
                closeProductModal:   () => this.hideProductModal(),
                cancelProductBtn:    () => this.hideProductModal(),
                saveProductBtn:      () => this.saveProduct(),
                closeCheckoutModal:  () => this.hideCheckoutModal(),
                cancelCheckoutBtn:   () => this.hideCheckoutModal(),
                completePaymentBtn:  () => this.completePayment(),
                clearCartBtn:        () => this.clearCart(),
                checkoutBtn:         () => this.showCheckoutModal(),
                addSupplierBtn:      () => this.showSupplierModal(),
                closeSupplierModal:  () => this.hideSupplierModal(),
                cancelSupplierBtn:   () => this.hideSupplierModal(),
                saveSupplierBtn:     () => this.saveSupplier(),
                settingsExportBtn:   () => this.exportData(),
                settingsImportBtn:   () => this.importData(),
                settingsResetBtn:    () => this.resetData(),
                exportDataBtn:       () => this.exportData(),
                importDataBtn:       () => this.importData(),
                saveStoreSettingsBtn:     () => this.saveStoreSettings(),
                saveInventorySettingsBtn: () => this.saveInventorySettings(),
                connect_filesystem:    () => this.connectFileSystem(),
                disconnect_filesystem: () => this.disconnectFileSystem(),
                connect_gdrive:        () => this.connectGDrive(),
                disconnect_gdrive:     () => this.disconnectGDrive(),
                connect_dropbox:       () => this.connectDropbox(),
                disconnect_dropbox:    () => this.disconnectDropbox(),
                gdrive_load_now:       () => this.loadFromGDrive(),
                dropbox_load_now:      () => this.loadFromDropbox(),
            };
            if (map[id]) { e.preventDefault(); map[id](); return; }
            if (e.target.classList.contains('settings-nav-item')) {
                const s = e.target.getAttribute('data-settings');
                if (s) this.showSettingsPanel(s);
            }
            if (e.target.classList.contains('modal')) e.target.classList.add('hidden');
        });

        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('open'));
        document.getElementById('posSearch')?.addEventListener('input', e => this.handlePOSSearch(e.target.value));
        document.getElementById('productSearch')?.addEventListener('input', () => this.filterProducts());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.filterProducts());
        document.addEventListener('keydown', e => { if (e.key==='Escape') document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════

    showSection(sectionId) {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
        const titles = { dashboard:'Dashboard', inventory:'Inventory Management', sales:'Sales & POS', analytics:'Analytics & Reports', suppliers:'Supplier Management', settings:'Settings' };
        const pt = document.getElementById('pageTitle'); if (pt) pt.textContent = titles[sectionId] || sectionId;
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId)?.classList.add('active');
        this.currentSection = sectionId;
        const renderMap = { dashboard:()=>this.renderDashboard(), inventory:()=>this.renderInventory(), sales:()=>this.renderSales(), analytics:()=>this.renderAnalytics(), suppliers:()=>this.renderSuppliers(), settings:()=>this.renderSettings() };
        if (renderMap[sectionId]) renderMap[sectionId]();
        document.getElementById('sidebar')?.classList.remove('open');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════

    renderDashboard() {
        this.updateMetrics(); this.renderStockAlerts(); this.renderRecentActivity();
        setTimeout(() => this.renderSalesChart(), 200);
    }

    updateMetrics() {
        const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        set('totalValue',    `$${this.products.reduce((s,p) => s+p.price*p.stock,0).toFixed(2)}`);
        set('totalProducts', this.products.length.toString());
        set('lowStockCount', this.products.filter(p=>p.stock<=p.min_stock).length.toString());
        set('todaySales',    `$${this.getTodaySales().toFixed(2)}`);
    }

    renderStockAlerts() {
        const list = document.getElementById('alertList'); if (!list) return;
        const low = this.products.filter(p => p.stock <= p.min_stock);
        list.innerHTML = low.length === 0
            ? '<div class="alert-item"><div class="alert-message">No stock alerts ✅</div></div>'
            : low.map(p => `<div class="alert-item"><div class="alert-product">${p.name}</div><div class="alert-message">Only ${p.stock} left (min: ${p.min_stock})</div></div>`).join('');
    }

    renderRecentActivity() {
        const list = document.getElementById('activityList'); if (!list) return;
        const recent = this.transactions.slice(-5).reverse();
        list.innerHTML = recent.length === 0
            ? '<div class="activity-item"><div class="activity-text">No recent activity</div></div>'
            : recent.map(t=>`<div class="activity-item"><div class="activity-time">${t.time}</div><div class="activity-text">Sale ${t.id} — $${t.total.toFixed(2)} (${t.payment_method})</div></div>`).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVENTORY
    // ═══════════════════════════════════════════════════════════════════════════

    renderInventory() { this.filterProducts(); }

    filterProducts() {
        const search   = (document.getElementById('productSearch')?.value||'').toLowerCase();
        const category = document.getElementById('categoryFilter')?.value||'';
        const filtered = this.products.filter(p =>
            (p.name.toLowerCase().includes(search)||p.barcode.includes(search)) && (!category||p.category===category)
        );
        const grid = document.getElementById('inventoryGrid'); if (!grid) return;
        grid.innerHTML = filtered.length === 0 ? '<div class="empty-state"><p>No products found</p></div>' :
            filtered.map(p => `
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
        const list = document.getElementById('transactionList'); if (!list) return;
        const recent = this.transactions.slice(-10).reverse();
        list.innerHTML = recent.length === 0 ? '<div class="empty-state"><p>No transactions yet</p></div>' :
            recent.map(t=>`<div class="transaction-item"><div class="transaction-header"><span class="transaction-id">${t.id}</span><span class="transaction-amount">$${t.total.toFixed(2)}</span></div><div class="transaction-details">${t.time} • ${t.payment_method} • ${t.customer_name||'Walk-in'}</div></div>`).join('');
    }

    handlePOSSearch(query) {
        if (query.length < 2) return;
        const p = this.products.find(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.barcode===query);
        if (p) { this.addToCart(p.id); const el=document.getElementById('posSearch'); if(el) el.value=''; }
    }

    addToCart(productId, qty=1) {
        const p = this.products.find(p=>p.id===productId); if (!p) return;
        const ex = this.cart.find(i=>i.product_id===productId);
        if (ex) ex.quantity+=qty; else this.cart.push({product_id:productId,quantity:qty,price:p.price,name:p.name});
        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const ci=document.getElementById('cartItems'), cs=document.getElementById('cartSubtotal'),
              ct=document.getElementById('cartTax'), cto=document.getElementById('cartTotal'),
              cb=document.getElementById('checkoutBtn');
        if (!ci) return;
        if (!this.cart.length) {
            ci.innerHTML='<div class="empty-cart"><p>Scan or search products to add to cart</p></div>';
            [cs,ct,cto].forEach(el=>{if(el)el.textContent='$0.00'});
            if(cb) cb.disabled=true; return;
        }
        ci.innerHTML = this.cart.map((item,idx)=>`
            <div class="cart-item">
                <div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">$${item.price.toFixed(2)} each</div></div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${idx},-1)">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" onchange="window.app.setCartQuantity(${idx},this.value)">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${idx},1)">+</button>
                    <button class="quantity-btn" onclick="window.app.removeFromCart(${idx})" style="margin-left:8px;color:var(--color-error)">×</button>
                </div>
            </div>`).join('');
        const sub=this.cart.reduce((s,i)=>s+i.price*i.quantity,0), tax=sub*this.settings.tax_rate, total=sub+tax;
        if(cs) cs.textContent=`$${sub.toFixed(2)}`; if(ct) ct.textContent=`$${tax.toFixed(2)}`; if(cto) cto.textContent=`$${total.toFixed(2)}`; if(cb) cb.disabled=false;
    }

    updateCartQuantity(idx,ch) { if(this.cart[idx]){this.cart[idx].quantity=Math.max(1,this.cart[idx].quantity+ch);this.updateCartDisplay();} }
    setCartQuantity(idx,qty)   { if(this.cart[idx]){this.cart[idx].quantity=Math.max(1,parseInt(qty)||1);this.updateCartDisplay();} }
    removeFromCart(idx)        { this.cart.splice(idx,1); this.updateCartDisplay(); }
    clearCart()                { this.cart=[]; this.updateCartDisplay(); }

    showCheckoutModal() {
        if (!this.cart.length) return;
        const sub = this.cart.reduce((s,i)=>s+i.price*i.quantity,0);
        const el  = document.getElementById('checkoutTotal');
        if (el) el.textContent=`$${(sub+sub*this.settings.tax_rate).toFixed(2)}`;
        document.getElementById('checkoutModal')?.classList.remove('hidden');
    }
    hideCheckoutModal() { document.getElementById('checkoutModal')?.classList.add('hidden'); }

    async completePayment() {
        const method = document.querySelector('input[name="paymentMethod"]:checked')?.value||'cash';
        const cname  = document.getElementById('customerName')?.value||'';
        const sub    = this.cart.reduce((s,i)=>s+i.price*i.quantity,0);
        const total  = sub+sub*this.settings.tax_rate;
        const t = { id:`T${String(this.transactions.length+1).padStart(3,'0')}`, date:new Date().toISOString().split('T')[0], time:new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}), items:[...this.cart], total:parseFloat(total.toFixed(2)), payment_method:method, customer_name:cname||null };
        this.cart.forEach(item=>{ const p=this.products.find(p=>p.id===item.product_id); if(p) p.stock-=item.quantity; });
        this.transactions.push(t);
        await this.saveToStorage();
        this.clearCart(); this.hideCheckoutModal(); this.updateMetrics(); this.renderTransactions();
        this.showToast(`✅ Payment complete! Transaction ${t.id}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════════════════

    renderAnalytics() {
        this.updatePerformanceMetrics();
        setTimeout(()=>{ this.renderTrendsChart(); this.renderTopProductsChart(); }, 200);
    }

    updatePerformanceMetrics() {
        let rev=0,cost=0;
        this.products.forEach(p=>{rev+=p.price*p.stock;cost+=p.cost*p.stock;});
        const gm   = rev>0?(rev-cost)/rev*100:0;
        const avg  = this.transactions.length>0?this.transactions.reduce((s,t)=>s+t.total,0)/this.transactions.length:0;
        const sold = this.transactions.reduce((s,t)=>s+t.items.reduce((ss,i)=>ss+i.quantity,0),0);
        const avgS = this.products.reduce((s,p)=>s+p.stock,0)/(this.products.length||1);
        const turn = avgS>0?sold/avgS:0;
        const acc  = this.products.length>0?this.products.filter(p=>p.stock>=p.min_stock).length/this.products.length*100:100;
        const items = document.querySelectorAll('.performance-item');
        if(items[0]) items[0].querySelector('.performance-value').textContent=`${gm.toFixed(1)}%`;
        if(items[1]) items[1].querySelector('.performance-value').textContent=`${turn.toFixed(1)}x`;
        if(items[2]) items[2].querySelector('.performance-value').textContent=`$${avg.toFixed(2)}`;
        if(items[3]) items[3].querySelector('.performance-value').textContent=`${acc.toFixed(1)}%`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUPPLIERS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSuppliers() {
        const grid=document.getElementById('suppliersGrid'); if(!grid) return;
        grid.innerHTML=this.suppliers.map(s=>`
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
        const modal=document.getElementById('supplierModal'),title=document.getElementById('supplierModalTitle'),form=document.getElementById('supplierForm');
        if(!modal||!title||!form) return;
        if(id){const s=this.suppliers.find(s=>s.id===id);title.textContent='Edit Supplier';document.getElementById('supplierName').value=s.name;document.getElementById('supplierContact').value=s.contact;document.getElementById('supplierEmail').value=s.email;}
        else{title.textContent='Add New Supplier';form.reset();}
        modal.dataset.supplierId=id||''; modal.classList.remove('hidden');
    }
    hideSupplierModal() { document.getElementById('supplierModal')?.classList.add('hidden'); }

    async saveSupplier() {
        const modal=document.getElementById('supplierModal'),id=modal?.dataset.supplierId;
        const name=document.getElementById('supplierName')?.value.trim(),contact=document.getElementById('supplierContact')?.value.trim(),email=document.getElementById('supplierEmail')?.value.trim();
        if(!name){alert('Supplier name is required.');return;}
        if(id){const s=this.suppliers.find(s=>s.id===id);if(s) Object.assign(s,{name,contact,email});}
        else this.suppliers.push({id:`S${String(this.suppliers.length+1).padStart(3,'0')}`,name,contact,email});
        await this.saveToStorage(); this.populateDropdowns(); this.hideSupplierModal(); this.renderSuppliers(); this.showToast('✅ Supplier saved!');
    }

    editSupplier(id) { this.showSupplierModal(id); }
    async deleteSupplier(id) {
        const s=this.suppliers.find(s=>s.id===id);
        if(!s||!confirm(`Delete "${s.name}"?`)) return;
        this.suppliers=this.suppliers.filter(s=>s.id!==id); await this.saveToStorage(); this.renderSuppliers();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSettings() { this.showSettingsPanel('store'); this.updateSyncStatus(); }

    showSettingsPanel(panelId) {
        document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));
        document.querySelector(`[data-settings="${panelId}"]`)?.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p=>p.classList.remove('active'));
        document.getElementById(`${panelId}Settings`)?.classList.add('active');
        if(panelId==='sync') this.updateSyncStatus();
    }

    saveStoreSettings() {
        this.settings.store_name=document.getElementById('settingsStoreName')?.value||this.settings.store_name;
        this.settings.address=document.getElementById('settingsAddress')?.value||this.settings.address;
        this.settings.phone=document.getElementById('settingsPhone')?.value||this.settings.phone;
        const tax=parseFloat(document.getElementById('settingsTaxRate')?.value); if(!isNaN(tax)) this.settings.tax_rate=tax/100;
        const sn=document.querySelector('.store-name'); if(sn) sn.textContent=this.settings.store_name;
        this.saveToStorage(); this.showToast('✅ Store settings saved!');
    }

    saveInventorySettings() {
        const t=parseInt(document.getElementById('settingsLowStockThreshold')?.value); if(!isNaN(t)) this.settings.low_stock_threshold=t;
        this.saveToStorage(); this.showToast('✅ Inventory settings saved!');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCT MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    showProductModal(id=null) {
        const modal=document.getElementById('productModal'),title=document.getElementById('productModalTitle'),form=document.getElementById('productForm');
        if(!modal||!title||!form) return;
        if(id){title.textContent='Edit Product';this.populateProductForm(this.products.find(p=>p.id===id));}
        else{title.textContent='Add New Product';form.reset();}
        modal.dataset.productId=id||''; modal.classList.remove('hidden');
    }
    hideProductModal() { document.getElementById('productModal')?.classList.add('hidden'); }

    populateProductForm(p) {
        if(!p) return;
        const f={productName:p.name,productCategory:p.category,productBarcode:p.barcode,productPrice:p.price,productCost:p.cost,productStock:p.stock,productMinStock:p.min_stock,productSupplier:p.supplier,productDescription:p.description};
        Object.entries(f).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
    }

    async saveProduct() {
        const modal=document.getElementById('productModal'),id=modal?.dataset.productId;
        const fd={name:this.getVal('productName'),category:this.getVal('productCategory'),barcode:this.getVal('productBarcode'),price:parseFloat(this.getVal('productPrice'))||0,cost:parseFloat(this.getVal('productCost'))||0,stock:parseInt(this.getVal('productStock'))||0,min_stock:parseInt(this.getVal('productMinStock'))||0,supplier:this.getVal('productSupplier'),description:this.getVal('productDescription')};
        if(!fd.name){alert('Product name is required.');return;}
        if(id){const p=this.products.find(p=>p.id===id);if(p)Object.assign(p,fd);}
        else this.products.push({id:`P${String(this.products.length+1).padStart(3,'0')}`,image_url:this.getProductEmoji(fd.category),...fd});
        await this.saveToStorage(); this.hideProductModal(); this.updateMetrics();
        if(this.currentSection==='inventory') this.renderInventory();
        this.showToast('✅ Product saved!');
    }

    editProduct(id) { this.showProductModal(id); }
    getVal(id) { return document.getElementById(id)?.value||''; }
    getProductEmoji(cat) { return {Produce:'🥬',Dairy:'🥛',Beverages:'🥤',Bakery:'🍞',Meat:'🥩',Frozen:'🧊',Pantry:'🥫',Snacks:'🍿','Health & Beauty':'🧴',Household:'🧽'}[cat]||'📦'; }

    populateDropdowns() {
        document.querySelectorAll('#categoryFilter,#productCategory').forEach(sel=>{
            sel.innerHTML=(sel.id==='categoryFilter'?'<option value="">All Categories</option>':'')+this.categories.map(c=>`<option value="${c}">${c}</option>`).join('');
        });
        const sup=document.getElementById('productSupplier');
        if(sup) sup.innerHTML=this.suppliers.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
        const fields={settingsStoreName:this.settings.store_name,settingsAddress:this.settings.address,settingsPhone:this.settings.phone,settingsTaxRate:(this.settings.tax_rate*100).toFixed(2),settingsLowStockThreshold:this.settings.low_stock_threshold};
        Object.entries(fields).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    getTodaySales() {
        const today=new Date().toISOString().split('T')[0];
        return this.transactions.filter(t=>t.date===today).reduce((s,t)=>s+t.total,0);
    }

    showToast(msg, type='success', duration=3000) {
        let t=document.getElementById('swToast');
        if(!t){t=document.createElement('div');t.id='swToast';t.style.cssText='position:fixed;bottom:24px;right:24px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-base);padding:12px 20px;box-shadow:var(--shadow-lg);z-index:9999;font-size:var(--font-size-md);color:var(--color-text);transition:opacity 0.3s;opacity:0;max-width:360px;';document.body.appendChild(t);}
        t.textContent=msg; t.style.opacity='1';
        clearTimeout(this._toastTimer); this._toastTimer=setTimeout(()=>{t.style.opacity='0';},duration);
    }

    exportData() {
        const b=new Blob([JSON.stringify(this.getDataBundle(),null,2)],{type:'application/json'});
        const u=URL.createObjectURL(b),a=document.createElement('a');
        a.href=u;a.download=`storewise-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
        this.showToast('✅ Data exported!');
    }

    importData() {
        const input=document.createElement('input'); input.type='file'; input.accept='.json';
        input.onchange=e=>{
            const file=e.target.files[0];if(!file)return;
            const r=new FileReader(); r.onload=ev=>{
                try{const d=JSON.parse(ev.target.result);if(confirm('Replace all data with imported data?')){this.applyDataBundle(d);this.saveToStorage();this.showToast('✅ Data imported!');}}
                catch{alert('Error: Invalid file format');}
            }; r.readAsText(file);
        }; input.click();
    }

    resetData() {
        if(!confirm('Reset ALL data to defaults?')) return;
        this.products=JSON.parse(JSON.stringify(this.defaultProducts));
        this.transactions=JSON.parse(JSON.stringify(this.defaultTransactions));
        this.suppliers=JSON.parse(JSON.stringify(this.defaultSuppliers));
        this.settings=JSON.parse(JSON.stringify(this.defaultSettings));
        this.saveToStorage(); this.populateDropdowns(); this.updateMetrics(); this.renderDashboard();
        this.showToast('✅ Data reset!');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHARTS
    // ═══════════════════════════════════════════════════════════════════════════

    renderSalesChart() {
        const canvas=document.getElementById('salesChart');if(!canvas)return;
        if(this.charts.sales)this.charts.sales.destroy();
        const days=[],sales=[];
        for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().split('T')[0];days.push(d.toLocaleDateString('en-US',{weekday:'short'}));sales.push(this.transactions.filter(t=>t.date===ds).reduce((s,t)=>s+t.total,0));}
        this.charts.sales=new Chart(canvas.getContext('2d'),{type:'line',data:{labels:days,datasets:[{label:'Sales',data:sales,borderColor:'#1FB8CD',backgroundColor:'rgba(31,184,205,0.1)',fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    }

    renderTrendsChart() {
        const canvas=document.getElementById('trendsChart');if(!canvas)return;
        if(this.charts.trends)this.charts.trends.destroy();
        const labels=['4 wks ago','3 wks ago','2 wks ago','This week'],data=[0,0,0,0];
        this.transactions.forEach(t=>{const d=Math.floor((new Date()-new Date(t.date))/86400000);if(d<7)data[3]+=t.total;else if(d<14)data[2]+=t.total;else if(d<21)data[1]+=t.total;else if(d<28)data[0]+=t.total;});
        this.charts.trends=new Chart(canvas.getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'Sales',data,backgroundColor:['#1FB8CD','#FFC185','#B4413C','#ECEBD5']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }

    renderTopProductsChart() {
        const canvas=document.getElementById('topProductsChart');if(!canvas)return;
        if(this.charts.topProducts)this.charts.topProducts.destroy();
        const sm={};this.transactions.forEach(t=>t.items.forEach(i=>{sm[i.product_id]=(sm[i.product_id]||0)+i.quantity;}));
        const top5=this.products.map(p=>({name:p.name,sold:sm[p.id]||0})).sort((a,b)=>b.sold-a.sold).slice(0,5);
        this.charts.topProducts=new Chart(canvas.getContext('2d'),{type:'doughnut',data:{labels:top5.map(p=>p.name),datasets:[{data:top5.map(p=>p.sold||1),backgroundColor:['#1FB8CD','#FFC185','#B4413C','#ECEBD5','#5D878F']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new StoreWiseApp(); });
window.app = null;
