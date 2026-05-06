// StoreWise AI - Inventory Management Application
class StoreWiseApp {
    constructor() {
        // Default data
        this.defaultProducts = [
            { id: "P001", name: "Organic Bananas", category: "Produce", barcode: "123456789012", price: 2.99, cost: 1.89, stock: 24, min_stock: 10, supplier: "Fresh Farms Co", description: "Fresh organic bananas", image_url: "🍌" },
            { id: "P002", name: "Whole Milk 1 Gallon", category: "Dairy", barcode: "234567890123", price: 4.29, cost: 3.15, stock: 8, min_stock: 15, supplier: "Local Dairy Farm", description: "Fresh whole milk", image_url: "🥛" },
            { id: "P003", name: "Coca-Cola 12-pack", category: "Beverages", barcode: "345678901234", price: 6.99, cost: 4.50, stock: 32, min_stock: 20, supplier: "Beverage Distributors Inc", description: "12-pack of Coca-Cola cans", image_url: "🥤" },
            { id: "P004", name: "Wonder Bread", category: "Bakery", barcode: "456789012345", price: 2.79, cost: 1.95, stock: 15, min_stock: 8, supplier: "Bakery Supply Co", description: "Classic white bread loaf", image_url: "🍞" },
            { id: "P005", name: "Ground Beef 1lb", category: "Meat", barcode: "567890123456", price: 7.99, cost: 5.25, stock: 12, min_stock: 15, supplier: "Local Butcher Shop", description: "Fresh ground beef 80/20", image_url: "🥩" }
        ];

        this.defaultTransactions = [
            { id: "T001", date: new Date().toISOString().split('T')[0], time: "10:30", items: [{product_id: "P001", quantity: 2, price: 2.99}, {product_id: "P002", quantity: 1, price: 4.29}], total: 10.27, payment_method: "cash", customer_name: "John Smith" },
            { id: "T002", date: new Date().toISOString().split('T')[0], time: "11:45", items: [{product_id: "P003", quantity: 1, price: 6.99}, {product_id: "P004", quantity: 2, price: 2.79}], total: 12.57, payment_method: "card", customer_name: "Sarah Johnson" }
        ];

        this.defaultSuppliers = [
            { id: "S001", name: "Fresh Farms Co", contact: "555-0123", email: "orders@freshfarms.com" },
            { id: "S002", name: "Local Dairy Farm", contact: "555-0124", email: "sales@localdairy.com" },
            { id: "S003", name: "Beverage Distributors Inc", contact: "555-0125", email: "orders@bevdist.com" },
            { id: "S004", name: "Bakery Supply Co", contact: "555-0126", email: "orders@bakerysupply.com" },
            { id: "S005", name: "Local Butcher Shop", contact: "555-0127", email: "orders@localbutcher.com" }
        ];

        this.defaultSettings = {
            store_name: "Sunny Corner Market",
            address: "123 Main Street, Anytown, CA 94102",
            phone: "555-0100",
            tax_rate: 0.0875,
            currency: "USD",
            low_stock_threshold: 10
        };

        this.categories = ["Produce", "Dairy", "Beverages", "Bakery", "Meat", "Frozen", "Pantry", "Snacks", "Health & Beauty", "Household"];

        // Load from localStorage or use defaults
        this.loadFromStorage();

        this.currentSection = 'dashboard';
        this.cart = [];
        this.charts = {};

        this.init();
    }

    // ── localStorage helpers ──────────────────────────────────────────────────

    loadFromStorage() {
        try {
            this.products   = JSON.parse(localStorage.getItem('sw_products'))    || this.defaultProducts;
            this.transactions = JSON.parse(localStorage.getItem('sw_transactions')) || this.defaultTransactions;
            this.suppliers  = JSON.parse(localStorage.getItem('sw_suppliers'))   || this.defaultSuppliers;
            this.settings   = JSON.parse(localStorage.getItem('sw_settings'))    || this.defaultSettings;
        } catch (e) {
            console.warn('Storage load failed, using defaults', e);
            this.products     = this.defaultProducts;
            this.transactions = this.defaultTransactions;
            this.suppliers    = this.defaultSuppliers;
            this.settings     = this.defaultSettings;
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('sw_products',     JSON.stringify(this.products));
            localStorage.setItem('sw_transactions', JSON.stringify(this.transactions));
            localStorage.setItem('sw_suppliers',    JSON.stringify(this.suppliers));
            localStorage.setItem('sw_settings',     JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Storage save failed', e);
        }
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }

    setupApplication() {
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
        this.showSection('dashboard');
        console.log('🏪 StoreWise AI initialized');
    }

    // ── Event Listeners ───────────────────────────────────────────────────────

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-item')) {
                e.preventDefault();
                const section = e.target.closest('.menu-item').getAttribute('data-section');
                if (section) this.showSection(section);
                return;
            }

            const id = e.target.id || (e.target.closest('[id]') || {}).id;

            switch(id) {
                case 'quickSaleBtn':       e.preventDefault(); this.showSection('sales'); break;
                case 'addProductBtn':      e.preventDefault(); this.showProductModal(); break;
                case 'addNewProductBtn':   e.preventDefault(); this.showProductModal(); break;
                case 'closeProductModal':  e.preventDefault(); this.hideProductModal(); break;
                case 'cancelProductBtn':   e.preventDefault(); this.hideProductModal(); break;
                case 'saveProductBtn':     e.preventDefault(); this.saveProduct(); break;
                case 'closeCheckoutModal': e.preventDefault(); this.hideCheckoutModal(); break;
                case 'cancelCheckoutBtn':  e.preventDefault(); this.hideCheckoutModal(); break;
                case 'completePaymentBtn': e.preventDefault(); this.completePayment(); break;
                case 'clearCartBtn':       e.preventDefault(); this.clearCart(); break;
                case 'checkoutBtn':        e.preventDefault(); this.showCheckoutModal(); break;
                case 'addSupplierBtn':     e.preventDefault(); this.showSupplierModal(); break;
                case 'closeSupplierModal': e.preventDefault(); this.hideSupplierModal(); break;
                case 'cancelSupplierBtn':  e.preventDefault(); this.hideSupplierModal(); break;
                case 'saveSupplierBtn':    e.preventDefault(); this.saveSupplier(); break;
                // Settings backup buttons
                case 'settingsExportBtn':  e.preventDefault(); this.exportData(); break;
                case 'settingsImportBtn':  e.preventDefault(); this.importData(); break;
                case 'settingsResetBtn':   e.preventDefault(); this.resetData(); break;
                // Inventory buttons
                case 'exportDataBtn':      e.preventDefault(); this.exportData(); break;
                case 'importDataBtn':      e.preventDefault(); this.importData(); break;
            }

            if (e.target.classList.contains('settings-nav-item')) {
                e.preventDefault();
                const settingsType = e.target.getAttribute('data-settings');
                if (settingsType) this.showSettingsPanel(settingsType);
                return;
            }

            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
                return;
            }
        });

        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('sidebar')?.classList.toggle('open');
            });
        }

        const posSearch = document.getElementById('posSearch');
        if (posSearch) posSearch.addEventListener('input', (e) => this.handlePOSSearch(e.target.value));

        const productSearch = document.getElementById('productSearch');
        if (productSearch) productSearch.addEventListener('input', () => this.filterProducts());

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterProducts());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            }
        });

        // Save settings form
        document.addEventListener('click', (e) => {
            if (e.target.id === 'saveStoreSettingsBtn') {
                e.preventDefault();
                this.saveStoreSettings();
            }
            if (e.target.id === 'saveInventorySettingsBtn') {
                e.preventDefault();
                this.saveInventorySettings();
            }
        });
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    showSection(sectionId) {
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

        const titleMap = { dashboard: 'Dashboard', inventory: 'Inventory Management', sales: 'Sales & POS', analytics: 'Analytics & Reports', suppliers: 'Supplier Management', settings: 'Settings' };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = titleMap[sectionId] || sectionId;

        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId)?.classList.add('active');

        this.currentSection = sectionId;

        switch(sectionId) {
            case 'dashboard':  this.renderDashboard(); break;
            case 'inventory':  this.renderInventory(); break;
            case 'sales':      this.renderSales(); break;
            case 'analytics':  this.renderAnalytics(); break;
            case 'suppliers':  this.renderSuppliers(); break;
            case 'settings':   this.renderSettings(); break;
        }

        document.getElementById('sidebar')?.classList.remove('open');
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    renderDashboard() {
        this.updateMetrics();
        this.renderStockAlerts();
        this.renderRecentActivity();
        setTimeout(() => this.renderSalesChart(), 200);
    }

    updateMetrics() {
        const totalValue    = this.products.reduce((s, p) => s + (p.price * p.stock), 0);
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(p => p.stock <= p.min_stock).length;
        const todaySales    = this.getTodaySales();

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('totalValue',    `$${totalValue.toFixed(2)}`);
        set('totalProducts', totalProducts.toString());
        set('lowStockCount', lowStockCount.toString());
        set('todaySales',    `$${todaySales.toFixed(2)}`);
    }

    renderStockAlerts() {
        const alertList = document.getElementById('alertList');
        if (!alertList) return;
        const low = this.products.filter(p => p.stock <= p.min_stock);
        alertList.innerHTML = low.length === 0
            ? '<div class="alert-item"><div class="alert-message">No stock alerts at this time ✅</div></div>'
            : low.map(p => `
                <div class="alert-item">
                    <div class="alert-product">${p.name}</div>
                    <div class="alert-message">Only ${p.stock} left (minimum: ${p.min_stock})</div>
                </div>`).join('');
    }

    renderRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        const recent = this.transactions.slice(-5).reverse();
        if (recent.length === 0) {
            activityList.innerHTML = '<div class="activity-item"><div class="activity-text">No recent activity</div></div>';
            return;
        }
        activityList.innerHTML = recent.map(t => `
            <div class="activity-item">
                <div class="activity-time">${t.time}</div>
                <div class="activity-text">Sale ${t.id} completed — $${t.total.toFixed(2)} (${t.payment_method})</div>
            </div>`).join('');
    }

    // ── Inventory ─────────────────────────────────────────────────────────────

    renderInventory() { this.filterProducts(); }

    filterProducts() {
        const search   = (document.getElementById('productSearch')?.value || '').toLowerCase();
        const category = document.getElementById('categoryFilter')?.value || '';
        const filtered = this.products.filter(p =>
            (p.name.toLowerCase().includes(search) || p.barcode.includes(search)) &&
            (!category || p.category === category)
        );
        this.renderProductGrid(filtered);
    }

    renderProductGrid(products) {
        const grid = document.getElementById('inventoryGrid');
        if (!grid) return;
        if (products.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No products found</p></div>';
            return;
        }
        grid.innerHTML = products.map(p => `
            <div class="product-card" data-product-id="${p.id}">
                <div class="product-image">${p.image_url}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-details">
                    <div class="product-detail"><span class="product-detail-label">Price:</span><span class="product-detail-value">$${p.price.toFixed(2)}</span></div>
                    <div class="product-detail"><span class="product-detail-label">Stock:</span><span class="product-detail-value">${p.stock} <span class="stock-indicator ${p.stock <= p.min_stock ? 'low' : 'normal'}">${p.stock <= p.min_stock ? 'Low' : 'OK'}</span></span></div>
                    <div class="product-detail"><span class="product-detail-label">Category:</span><span class="product-detail-value">${p.category}</span></div>
                    <div class="product-detail"><span class="product-detail-label">Supplier:</span><span class="product-detail-value">${p.supplier}</span></div>
                </div>
                <div class="product-actions">
                    <button class="btn btn--outline btn--sm" onclick="window.app.editProduct('${p.id}')">Edit</button>
                    <button class="btn btn--primary btn--sm" onclick="window.app.addToCart('${p.id}')">Add to Cart</button>
                    <button class="btn btn--danger btn--sm" onclick="window.app.deleteProduct('${p.id}')">Delete</button>
                </div>
            </div>`).join('');
    }

    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
        this.products = this.products.filter(p => p.id !== productId);
        this.saveToStorage();
        this.updateMetrics();
        this.filterProducts();
    }

    // ── Sales / POS ───────────────────────────────────────────────────────────

    renderSales() {
        this.renderTransactions();
        this.updateCartDisplay();
    }

    renderTransactions() {
        const list = document.getElementById('transactionList');
        if (!list) return;
        const recent = this.transactions.slice(-10).reverse();
        list.innerHTML = recent.length === 0
            ? '<div class="empty-state"><p>No transactions yet</p></div>'
            : recent.map(t => `
                <div class="transaction-item">
                    <div class="transaction-header">
                        <span class="transaction-id">${t.id}</span>
                        <span class="transaction-amount">$${t.total.toFixed(2)}</span>
                    </div>
                    <div class="transaction-details">${t.time} • ${t.payment_method} • ${t.customer_name || 'Walk-in'}</div>
                </div>`).join('');
    }

    handlePOSSearch(query) {
        if (query.length < 2) return;
        const product = this.products.find(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode === query
        );
        if (product) {
            this.addToCart(product.id);
            const el = document.getElementById('posSearch');
            if (el) el.value = '';
        }
    }

    addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        const existing = this.cart.find(i => i.product_id === productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.cart.push({ product_id: productId, quantity, price: product.price, name: product.name });
        }
        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const cartItems  = document.getElementById('cartItems');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const cartTax    = document.getElementById('cartTax');
        const cartTotal  = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (!cartItems) return;

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart"><p>Scan or search products to add to cart</p></div>';
            if (cartSubtotal) cartSubtotal.textContent = '$0.00';
            if (cartTax) cartTax.textContent = '$0.00';
            if (cartTotal) cartTotal.textContent = '$0.00';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        cartItems.innerHTML = this.cart.map((item, idx) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${idx}, -1)">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" onchange="window.app.setCartQuantity(${idx}, this.value)">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${idx}, 1)">+</button>
                    <button class="quantity-btn" onclick="window.app.removeFromCart(${idx})" style="margin-left:8px;color:var(--color-error)">×</button>
                </div>
            </div>`).join('');

        const subtotal = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const tax   = subtotal * this.settings.tax_rate;
        const total = subtotal + tax;

        if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        if (cartTax) cartTax.textContent = `$${tax.toFixed(2)}`;
        if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
        if (checkoutBtn) checkoutBtn.disabled = false;
    }

    updateCartQuantity(index, change) {
        if (this.cart[index]) {
            this.cart[index].quantity = Math.max(1, this.cart[index].quantity + change);
            this.updateCartDisplay();
        }
    }

    setCartQuantity(index, quantity) {
        if (this.cart[index]) {
            this.cart[index].quantity = Math.max(1, parseInt(quantity) || 1);
            this.updateCartDisplay();
        }
    }

    removeFromCart(index) { this.cart.splice(index, 1); this.updateCartDisplay(); }
    clearCart() { this.cart = []; this.updateCartDisplay(); }

    showCheckoutModal() {
        if (this.cart.length === 0) return;
        const subtotal = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const total = subtotal + subtotal * this.settings.tax_rate;
        const el = document.getElementById('checkoutTotal');
        if (el) el.textContent = `$${total.toFixed(2)}`;
        document.getElementById('checkoutModal')?.classList.remove('hidden');
    }

    hideCheckoutModal() { document.getElementById('checkoutModal')?.classList.add('hidden'); }

    completePayment() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
        const customerName  = document.getElementById('customerName')?.value || '';
        const subtotal = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const tax   = subtotal * this.settings.tax_rate;
        const total = subtotal + tax;

        const transaction = {
            id: `T${String(this.transactions.length + 1).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            items: [...this.cart],
            total: parseFloat(total.toFixed(2)),
            payment_method: paymentMethod,
            customer_name: customerName || null
        };

        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.product_id);
            if (product) product.stock -= item.quantity;
        });

        this.transactions.push(transaction);
        this.saveToStorage();
        this.clearCart();
        this.hideCheckoutModal();
        this.updateMetrics();
        this.renderTransactions();

        this.showToast(`✅ Payment completed! Transaction ID: ${transaction.id}`);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    renderAnalytics() {
        this.updatePerformanceMetrics();
        setTimeout(() => {
            this.renderTrendsChart();
            this.renderTopProductsChart();
        }, 200);
    }

    updatePerformanceMetrics() {
        // Gross margin: ((price - cost) / price) across all products, weighted by stock
        let totalRevenue = 0, totalCost = 0;
        this.products.forEach(p => {
            totalRevenue += p.price * p.stock;
            totalCost    += p.cost  * p.stock;
        });
        const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;

        // Avg transaction value
        const avgTransaction = this.transactions.length > 0
            ? this.transactions.reduce((s, t) => s + t.total, 0) / this.transactions.length
            : 0;

        // Inventory turnover proxy: total sales qty / avg stock
        const totalSoldQty = this.transactions.reduce((s, t) => s + t.items.reduce((ss, i) => ss + i.quantity, 0), 0);
        const avgStock = this.products.reduce((s, p) => s + p.stock, 0) / (this.products.length || 1);
        const turnover = avgStock > 0 ? (totalSoldQty / avgStock) : 0;

        // Low-stock accuracy: % products with stock >= min_stock
        const accurate = this.products.filter(p => p.stock >= p.min_stock).length;
        const accuracy = this.products.length > 0 ? (accurate / this.products.length * 100) : 100;

        const set = (cls, val) => {
            const els = document.querySelectorAll(cls);
            els.forEach(el => { if (el) el.textContent = val; });
        };

        // Update via data attributes
        const metrics = document.querySelectorAll('.performance-item');
        if (metrics[0]) metrics[0].querySelector('.performance-value').textContent = `${grossMargin.toFixed(1)}%`;
        if (metrics[1]) metrics[1].querySelector('.performance-value').textContent = `${turnover.toFixed(1)}x`;
        if (metrics[2]) metrics[2].querySelector('.performance-value').textContent = `$${avgTransaction.toFixed(2)}`;
        if (metrics[3]) metrics[3].querySelector('.performance-value').textContent = `${accuracy.toFixed(1)}%`;
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────

    renderSuppliers() {
        const grid = document.getElementById('suppliersGrid');
        if (!grid) return;
        grid.innerHTML = this.suppliers.map(s => `
            <div class="supplier-card">
                <div class="supplier-name">${s.name}</div>
                <div class="supplier-contact">📞 ${s.contact}</div>
                <div class="supplier-contact">✉️ ${s.email}</div>
                <div class="product-actions" style="margin-top:12px">
                    <button class="btn btn--outline btn--sm" onclick="window.app.editSupplier('${s.id}')">Edit</button>
                    <button class="btn btn--danger btn--sm" onclick="window.app.deleteSupplier('${s.id}')">Delete</button>
                </div>
            </div>`).join('');
    }

    showSupplierModal(supplierId = null) {
        const modal = document.getElementById('supplierModal');
        const title = document.getElementById('supplierModalTitle');
        const form  = document.getElementById('supplierForm');
        if (!modal || !title || !form) return;

        if (supplierId) {
            const supplier = this.suppliers.find(s => s.id === supplierId);
            title.textContent = 'Edit Supplier';
            document.getElementById('supplierName').value    = supplier.name;
            document.getElementById('supplierContact').value = supplier.contact;
            document.getElementById('supplierEmail').value   = supplier.email;
        } else {
            title.textContent = 'Add New Supplier';
            form.reset();
        }
        modal.dataset.supplierId = supplierId || '';
        modal.classList.remove('hidden');
    }

    hideSupplierModal() { document.getElementById('supplierModal')?.classList.add('hidden'); }

    saveSupplier() {
        const modal      = document.getElementById('supplierModal');
        const supplierId = modal?.dataset.supplierId;
        const name    = document.getElementById('supplierName')?.value.trim();
        const contact = document.getElementById('supplierContact')?.value.trim();
        const email   = document.getElementById('supplierEmail')?.value.trim();

        if (!name) { alert('Supplier name is required.'); return; }

        if (supplierId) {
            const supplier = this.suppliers.find(s => s.id === supplierId);
            if (supplier) Object.assign(supplier, { name, contact, email });
        } else {
            this.suppliers.push({
                id: `S${String(this.suppliers.length + 1).padStart(3, '0')}`,
                name, contact, email
            });
        }

        this.saveToStorage();
        this.populateDropdowns();
        this.hideSupplierModal();
        this.renderSuppliers();
        this.showToast('✅ Supplier saved!');
    }

    editSupplier(supplierId) { this.showSupplierModal(supplierId); }

    deleteSupplier(supplierId) {
        const supplier = this.suppliers.find(s => s.id === supplierId);
        if (!supplier) return;
        if (!confirm(`Delete supplier "${supplier.name}"?`)) return;
        this.suppliers = this.suppliers.filter(s => s.id !== supplierId);
        this.saveToStorage();
        this.renderSuppliers();
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    renderSettings() { this.showSettingsPanel('store'); }

    showSettingsPanel(panelId) {
        document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-settings="${panelId}"]`)?.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${panelId}Settings`)?.classList.add('active');
    }

    saveStoreSettings() {
        this.settings.store_name = document.getElementById('settingsStoreName')?.value || this.settings.store_name;
        this.settings.address    = document.getElementById('settingsAddress')?.value    || this.settings.address;
        this.settings.phone      = document.getElementById('settingsPhone')?.value      || this.settings.phone;
        const taxVal = parseFloat(document.getElementById('settingsTaxRate')?.value);
        if (!isNaN(taxVal)) this.settings.tax_rate = taxVal / 100;

        // Update sidebar store name
        const storeNameEl = document.querySelector('.store-name');
        if (storeNameEl) storeNameEl.textContent = this.settings.store_name;

        this.saveToStorage();
        this.showToast('✅ Store settings saved!');
    }

    saveInventorySettings() {
        const threshold = parseInt(document.getElementById('settingsLowStockThreshold')?.value);
        if (!isNaN(threshold)) this.settings.low_stock_threshold = threshold;
        this.saveToStorage();
        this.showToast('✅ Inventory settings saved!');
    }

    // ── Product Modal ─────────────────────────────────────────────────────────

    showProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        const form  = document.getElementById('productForm');
        if (!modal || !title || !form) return;

        if (productId) {
            title.textContent = 'Edit Product';
            this.populateProductForm(this.products.find(p => p.id === productId));
        } else {
            title.textContent = 'Add New Product';
            form.reset();
        }
        modal.dataset.productId = productId || '';
        modal.classList.remove('hidden');
    }

    hideProductModal() { document.getElementById('productModal')?.classList.add('hidden'); }

    populateProductForm(product) {
        if (!product) return;
        const fields = { productName: product.name, productCategory: product.category, productBarcode: product.barcode, productPrice: product.price, productCost: product.cost, productStock: product.stock, productMinStock: product.min_stock, productSupplier: product.supplier, productDescription: product.description };
        Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
    }

    saveProduct() {
        const modal     = document.getElementById('productModal');
        const productId = modal?.dataset.productId;
        const formData  = {
            name:        this.getVal('productName'),
            category:    this.getVal('productCategory'),
            barcode:     this.getVal('productBarcode'),
            price:       parseFloat(this.getVal('productPrice'))    || 0,
            cost:        parseFloat(this.getVal('productCost'))     || 0,
            stock:       parseInt(this.getVal('productStock'))      || 0,
            min_stock:   parseInt(this.getVal('productMinStock'))   || 0,
            supplier:    this.getVal('productSupplier'),
            description: this.getVal('productDescription')
        };

        if (!formData.name) { alert('Product name is required.'); return; }

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (product) Object.assign(product, formData);
        } else {
            this.products.push({
                id: `P${String(this.products.length + 1).padStart(3, '0')}`,
                image_url: this.getProductEmoji(formData.category),
                ...formData
            });
        }

        this.saveToStorage();
        this.hideProductModal();
        this.updateMetrics();
        if (this.currentSection === 'inventory') this.renderInventory();
        this.showToast('✅ Product saved!');
    }

    editProduct(productId) { this.showProductModal(productId); }

    getVal(id) { return document.getElementById(id)?.value || ''; }

    getProductEmoji(category) {
        const map = { Produce: '🥬', Dairy: '🥛', Beverages: '🥤', Bakery: '🍞', Meat: '🥩', Frozen: '🧊', Pantry: '🥫', Snacks: '🍿', 'Health & Beauty': '🧴', Household: '🧽' };
        return map[category] || '📦';
    }

    // ── Dropdowns ─────────────────────────────────────────────────────────────

    populateDropdowns() {
        document.querySelectorAll('#categoryFilter, #productCategory').forEach(select => {
            if (select.id === 'categoryFilter') {
                select.innerHTML = '<option value="">All Categories</option>' + this.categories.map(c => `<option value="${c}">${c}</option>`).join('');
            } else {
                select.innerHTML = this.categories.map(c => `<option value="${c}">${c}</option>`).join('');
            }
        });

        const supplierSelect = document.getElementById('productSupplier');
        if (supplierSelect) {
            supplierSelect.innerHTML = this.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }

        // Pre-fill settings form values
        const sn = document.getElementById('settingsStoreName'); if (sn) sn.value = this.settings.store_name;
        const sa = document.getElementById('settingsAddress');   if (sa) sa.value = this.settings.address;
        const sp = document.getElementById('settingsPhone');     if (sp) sp.value = this.settings.phone;
        const st = document.getElementById('settingsTaxRate');   if (st) st.value = (this.settings.tax_rate * 100).toFixed(2);
        const sl = document.getElementById('settingsLowStockThreshold'); if (sl) sl.value = this.settings.low_stock_threshold;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    getTodaySales() {
        const today = new Date().toISOString().split('T')[0];
        return this.transactions.filter(t => t.date === today).reduce((s, t) => s + t.total, 0);
    }

    showToast(message) {
        let toast = document.getElementById('swToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'swToast';
            toast.style.cssText = `
                position:fixed; bottom:24px; right:24px; background:var(--color-surface);
                border:1px solid var(--color-border); border-radius:var(--radius-base);
                padding:12px 20px; box-shadow:var(--shadow-lg); z-index:9999;
                font-size:var(--font-size-md); color:var(--color-text);
                transition:opacity 0.3s; opacity:0;`;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    // ── Export / Import / Reset ───────────────────────────────────────────────

    exportData() {
        const data = { products: this.products, transactions: this.transactions, suppliers: this.suppliers, settings: this.settings, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `storewise-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('✅ Data exported!');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (confirm('This will replace all current data. Continue?')) {
                        this.products     = data.products     || [];
                        this.transactions = data.transactions || [];
                        this.suppliers    = data.suppliers    || [];
                        this.settings     = { ...this.settings, ...data.settings };
                        this.saveToStorage();
                        this.populateDropdowns();
                        this.updateMetrics();
                        this.renderDashboard();
                        this.showToast('✅ Data imported!');
                    }
                } catch (err) {
                    alert('Error: Invalid file format');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    resetData() {
        if (!confirm('Reset ALL data to defaults? This cannot be undone.')) return;
        this.products     = JSON.parse(JSON.stringify(this.defaultProducts));
        this.transactions = JSON.parse(JSON.stringify(this.defaultTransactions));
        this.suppliers    = JSON.parse(JSON.stringify(this.defaultSuppliers));
        this.settings     = JSON.parse(JSON.stringify(this.defaultSettings));
        this.saveToStorage();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
        this.showToast('✅ Data reset to defaults!');
    }

    // ── Charts ────────────────────────────────────────────────────────────────

    renderSalesChart() {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;
        if (this.charts.sales) this.charts.sales.destroy();

        // Build last 7 days sales from real transaction data
        const days = [], sales = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            sales.push(this.transactions.filter(t => t.date === dateStr).reduce((s, t) => s + t.total, 0));
        }

        this.charts.sales = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: days, datasets: [{ label: 'Daily Sales', data: sales, borderColor: '#1FB8CD', backgroundColor: 'rgba(31,184,205,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    renderTrendsChart() {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;
        if (this.charts.trends) this.charts.trends.destroy();

        // Last 4 weeks
        const weeks = ['4 wks ago', '3 wks ago', '2 wks ago', 'This week'];
        const weekSales = [0, 0, 0, 0];
        this.transactions.forEach(t => {
            const diff = Math.floor((new Date() - new Date(t.date)) / (1000 * 60 * 60 * 24));
            if (diff < 7)  weekSales[3] += t.total;
            else if (diff < 14) weekSales[2] += t.total;
            else if (diff < 21) weekSales[1] += t.total;
            else if (diff < 28) weekSales[0] += t.total;
        });

        this.charts.trends = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels: weeks, datasets: [{ label: 'Sales', data: weekSales, backgroundColor: ['#1FB8CD','#FFC185','#B4413C','#ECEBD5'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    renderTopProductsChart() {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) return;
        if (this.charts.topProducts) this.charts.topProducts.destroy();

        // Count qty sold per product
        const soldMap = {};
        this.transactions.forEach(t => t.items.forEach(i => {
            soldMap[i.product_id] = (soldMap[i.product_id] || 0) + i.quantity;
        }));

        const top5 = this.products
            .map(p => ({ name: p.name, sold: soldMap[p.id] || 0 }))
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 5);

        this.charts.topProducts = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: { labels: top5.map(p => p.name), datasets: [{ data: top5.map(p => p.sold || 1), backgroundColor: ['#1FB8CD','#FFC185','#B4413C','#ECEBD5','#5D878F'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new StoreWiseApp();
});
window.app = null;
