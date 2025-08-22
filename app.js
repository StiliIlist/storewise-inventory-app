// StoreWise AI - Inventory Management Application
class StoreWiseApp {
    constructor() {
        // Sample data from the provided JSON
        this.products = [
            {
                id: "P001",
                name: "Organic Bananas",
                category: "Produce",
                barcode: "123456789012",
                price: 2.99,
                cost: 1.89,
                stock: 24,
                min_stock: 10,
                supplier: "Fresh Farms Co",
                description: "Fresh organic bananas",
                image_url: "🍌"
            },
            {
                id: "P002", 
                name: "Whole Milk 1 Gallon",
                category: "Dairy",
                barcode: "234567890123",
                price: 4.29,
                cost: 3.15,
                stock: 8,
                min_stock: 15,
                supplier: "Local Dairy Farm",
                description: "Fresh whole milk",
                image_url: "🥛"
            },
            {
                id: "P003",
                name: "Coca-Cola 12-pack",
                category: "Beverages", 
                barcode: "345678901234",
                price: 6.99,
                cost: 4.50,
                stock: 32,
                min_stock: 20,
                supplier: "Beverage Distributors Inc",
                description: "12-pack of Coca-Cola cans",
                image_url: "🥤"
            },
            {
                id: "P004",
                name: "Wonder Bread",
                category: "Bakery",
                barcode: "456789012345", 
                price: 2.79,
                cost: 1.95,
                stock: 15,
                min_stock: 8,
                supplier: "Bakery Supply Co",
                description: "Classic white bread loaf",
                image_url: "🍞"
            },
            {
                id: "P005",
                name: "Ground Beef 1lb",
                category: "Meat",
                barcode: "567890123456",
                price: 7.99,
                cost: 5.25,
                stock: 12,
                min_stock: 15,
                supplier: "Local Butcher Shop",
                description: "Fresh ground beef 80/20",
                image_url: "🥩"
            }
        ];

        this.transactions = [
            {
                id: "T001",
                date: "2024-08-21",
                time: "14:30",
                items: [
                    {product_id: "P001", quantity: 2, price: 2.99},
                    {product_id: "P002", quantity: 1, price: 4.29}
                ],
                total: 10.27,
                payment_method: "cash",
                customer_name: "John Smith"
            },
            {
                id: "T002", 
                date: "2024-08-21",
                time: "15:45",
                items: [
                    {product_id: "P003", quantity: 1, price: 6.99},
                    {product_id: "P004", quantity: 2, price: 2.79}
                ],
                total: 12.57,
                payment_method: "card",
                customer_name: "Sarah Johnson"
            }
        ];

        this.categories = [
            "Produce", "Dairy", "Beverages", "Bakery", "Meat", "Frozen", 
            "Pantry", "Snacks", "Health & Beauty", "Household"
        ];

        this.suppliers = [
            {
                id: "S001",
                name: "Fresh Farms Co",
                contact: "555-0123",
                email: "orders@freshfarms.com"
            },
            {
                id: "S002",
                name: "Local Dairy Farm", 
                contact: "555-0124",
                email: "sales@localdairy.com"
            },
            {
                id: "S003",
                name: "Beverage Distributors Inc",
                contact: "555-0125", 
                email: "orders@bevdist.com"
            },
            {
                id: "S004",
                name: "Bakery Supply Co",
                contact: "555-0126", 
                email: "orders@bakerysupply.com"
            },
            {
                id: "S005",
                name: "Local Butcher Shop",
                contact: "555-0127", 
                email: "orders@localbutcher.com"
            }
        ];

        this.settings = {
            store_name: "Sunny Corner Market",
            address: "123 Main Street, Anytown, CA 94102",
            phone: "555-0100",
            tax_rate: 0.0875,
            currency: "USD",
            low_stock_threshold: 10
        };

        // Current state
        this.currentSection = 'dashboard';
        this.cart = [];
        this.charts = {};

        // Initialize application
        this.init();
    }

    init() {
        console.log('🏪 Initializing StoreWise AI...');
        
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupApplication();
            });
        } else {
            this.setupApplication();
        }
    }

    setupApplication() {
        this.setupEventListeners();
        this.populateDropdowns();
        this.updateMetrics();
        this.renderDashboard();
        
        // Show initial section
        this.showSection('dashboard');
        
        console.log('🏪 StoreWise AI initialized successfully!');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Navigation - use event delegation to ensure it works
        document.addEventListener('click', (e) => {
            // Handle menu item clicks
            if (e.target.closest('.menu-item')) {
                e.preventDefault();
                const menuItem = e.target.closest('.menu-item');
                const section = menuItem.getAttribute('data-section');
                if (section) {
                    console.log(`Navigating to section: ${section}`);
                    this.showSection(section);
                }
                return;
            }

            // Handle quick action buttons
            if (e.target.id === 'quickSaleBtn' || e.target.closest('#quickSaleBtn')) {
                e.preventDefault();
                console.log('Quick Sale clicked');
                this.showSection('sales');
                return;
            }

            if (e.target.id === 'addProductBtn' || e.target.closest('#addProductBtn')) {
                e.preventDefault();
                console.log('Add Product clicked');
                this.showProductModal();
                return;
            }

            if (e.target.id === 'addNewProductBtn' || e.target.closest('#addNewProductBtn')) {
                e.preventDefault();
                console.log('Add New Product clicked');
                this.showProductModal();
                return;
            }

            // Handle modal close buttons
            if (e.target.id === 'closeProductModal' || e.target.closest('#closeProductModal')) {
                e.preventDefault();
                this.hideProductModal();
                return;
            }

            if (e.target.id === 'cancelProductBtn' || e.target.closest('#cancelProductBtn')) {
                e.preventDefault();
                this.hideProductModal();
                return;
            }

            if (e.target.id === 'saveProductBtn' || e.target.closest('#saveProductBtn')) {
                e.preventDefault();
                this.saveProduct();
                return;
            }

            // Handle checkout modal
            if (e.target.id === 'closeCheckoutModal' || e.target.closest('#closeCheckoutModal')) {
                e.preventDefault();
                this.hideCheckoutModal();
                return;
            }

            if (e.target.id === 'cancelCheckoutBtn' || e.target.closest('#cancelCheckoutBtn')) {
                e.preventDefault();
                this.hideCheckoutModal();
                return;
            }

            if (e.target.id === 'completePaymentBtn' || e.target.closest('#completePaymentBtn')) {
                e.preventDefault();
                this.completePayment();
                return;
            }

            // Handle POS buttons
            if (e.target.id === 'clearCartBtn' || e.target.closest('#clearCartBtn')) {
                e.preventDefault();
                this.clearCart();
                return;
            }

            if (e.target.id === 'checkoutBtn' || e.target.closest('#checkoutBtn')) {
                e.preventDefault();
                this.showCheckoutModal();
                return;
            }

            // Handle settings navigation
            if (e.target.classList.contains('settings-nav-item')) {
                e.preventDefault();
                const settingsType = e.target.getAttribute('data-settings');
                if (settingsType) {
                    this.showSettingsPanel(settingsType);
                }
                return;
            }

            // Handle data export/import
            if (e.target.id === 'exportDataBtn' || e.target.closest('#exportDataBtn')) {
                e.preventDefault();
                this.exportData();
                return;
            }

            if (e.target.id === 'importDataBtn' || e.target.closest('#importDataBtn')) {
                e.preventDefault();
                this.importData();
                return;
            }

            // Close modals when clicking outside
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
                return;
            }
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('open');
                }
            });
        }

        // POS search functionality
        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', (e) => {
                this.handlePOSSearch(e.target.value);
            });
        }

        // Inventory search and filter
        const productSearch = document.getElementById('productSearch');
        if (productSearch) {
            productSearch.addEventListener('input', () => {
                this.filterProducts();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterProducts();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modals
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });

        console.log('Event listeners setup complete');
    }

    showSection(sectionId) {
        console.log(`Showing section: ${sectionId}`);
        
        // Update navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeMenuItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }

        // Update page title
        const titleMap = {
            'dashboard': 'Dashboard',
            'inventory': 'Inventory Management',
            'sales': 'Sales & POS',
            'analytics': 'Analytics & Reports',
            'suppliers': 'Supplier Management',
            'settings': 'Settings'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titleMap[sectionId] || sectionId;
        }

        // Show section content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentSection = sectionId;

        // Load section-specific content
        switch(sectionId) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'inventory':
                this.renderInventory();
                break;
            case 'sales':
                this.renderSales();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'suppliers':
                this.renderSuppliers();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }

        // Close mobile menu
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }

    renderDashboard() {
        console.log('Rendering dashboard...');
        this.updateMetrics();
        this.renderStockAlerts();
        this.renderRecentActivity();
        
        // Initialize charts with delay to ensure canvas is visible
        setTimeout(() => {
            this.renderSalesChart();
        }, 200);
    }

    updateMetrics() {
        const totalValue = this.products.reduce((sum, product) => 
            sum + (product.price * product.stock), 0);
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(product => 
            product.stock <= product.min_stock).length;
        const todaySales = this.getTodaySales();

        const totalValueEl = document.getElementById('totalValue');
        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockCountEl = document.getElementById('lowStockCount');
        const todaySalesEl = document.getElementById('todaySales');

        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
        if (totalProductsEl) totalProductsEl.textContent = totalProducts.toString();
        if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount.toString();
        if (todaySalesEl) todaySalesEl.textContent = `$${todaySales.toFixed(2)}`;
    }

    renderStockAlerts() {
        const alertList = document.getElementById('alertList');
        if (!alertList) return;

        const lowStockProducts = this.products.filter(product => 
            product.stock <= product.min_stock);

        if (lowStockProducts.length === 0) {
            alertList.innerHTML = '<div class="alert-item"><div class="alert-message">No stock alerts at this time</div></div>';
            return;
        }

        alertList.innerHTML = lowStockProducts.map(product => `
            <div class="alert-item">
                <div class="alert-product">${product.name}</div>
                <div class="alert-message">Only ${product.stock} left (minimum: ${product.min_stock})</div>
            </div>
        `).join('');
    }

    renderRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const activities = [
            { time: '2:30 PM', text: 'Sale completed - $10.27' },
            { time: '1:45 PM', text: 'Product added - Wonder Bread' },
            { time: '12:15 PM', text: 'Stock updated - Coca-Cola 12-pack' },
            { time: '11:30 AM', text: 'Low stock alert - Whole Milk' },
            { time: '10:00 AM', text: 'Daily backup completed' }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.time}</div>
                <div class="activity-text">${activity.text}</div>
            </div>
        `).join('');
    }

    renderInventory() {
        console.log('Rendering inventory...');
        this.filterProducts();
    }

    filterProducts() {
        const searchEl = document.getElementById('productSearch');
        const categoryEl = document.getElementById('categoryFilter');
        
        const search = searchEl ? searchEl.value.toLowerCase() : '';
        const category = categoryEl ? categoryEl.value : '';

        let filteredProducts = this.products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(search) || 
                                product.barcode.includes(search);
            const matchesCategory = !category || product.category === category;
            return matchesSearch && matchesCategory;
        });

        this.renderProductGrid(filteredProducts);
    }

    renderProductGrid(products) {
        const inventoryGrid = document.getElementById('inventoryGrid');
        if (!inventoryGrid) return;

        if (products.length === 0) {
            inventoryGrid.innerHTML = '<div class="empty-state"><p>No products found</p></div>';
            return;
        }

        inventoryGrid.innerHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">${product.image_url}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-details">
                    <div class="product-detail">
                        <span class="product-detail-label">Price:</span>
                        <span class="product-detail-value">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="product-detail">
                        <span class="product-detail-label">Stock:</span>
                        <span class="product-detail-value">
                            ${product.stock}
                            <span class="stock-indicator ${product.stock <= product.min_stock ? 'low' : 'normal'}">
                                ${product.stock <= product.min_stock ? 'Low' : 'OK'}
                            </span>
                        </span>
                    </div>
                    <div class="product-detail">
                        <span class="product-detail-label">Category:</span>
                        <span class="product-detail-value">${product.category}</span>
                    </div>
                    <div class="product-detail">
                        <span class="product-detail-label">Supplier:</span>
                        <span class="product-detail-value">${product.supplier}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn--outline btn--sm" onclick="window.app.editProduct('${product.id}')">Edit</button>
                    <button class="btn btn--primary btn--sm" onclick="window.app.addToCart('${product.id}')">Add to Cart</button>
                </div>
            </div>
        `).join('');
    }

    renderSales() {
        console.log('Rendering sales...');
        this.renderTransactions();
        this.updateCartDisplay();
    }

    renderTransactions() {
        const transactionList = document.getElementById('transactionList');
        if (!transactionList) return;

        const recentTransactions = this.transactions.slice(-10).reverse();

        if (recentTransactions.length === 0) {
            transactionList.innerHTML = '<div class="empty-state"><p>No transactions yet</p></div>';
            return;
        }

        transactionList.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-header">
                    <span class="transaction-id">${transaction.id}</span>
                    <span class="transaction-amount">$${transaction.total.toFixed(2)}</span>
                </div>
                <div class="transaction-details">
                    ${transaction.time} • ${transaction.payment_method} • ${transaction.customer_name || 'Walk-in'}
                </div>
            </div>
        `).join('');
    }

    handlePOSSearch(query) {
        if (query.length < 2) return;

        const product = this.products.find(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.barcode === query
        );

        if (product) {
            this.addToCart(product.id);
            const posSearchEl = document.getElementById('posSearch');
            if (posSearchEl) {
                posSearchEl.value = '';
            }
        }
    }

    addToCart(productId, quantity = 1) {
        console.log(`Adding product ${productId} to cart`);
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.product_id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                product_id: productId,
                quantity: quantity,
                price: product.price,
                name: product.name
            });
        }

        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const cartTax = document.getElementById('cartTax');
        const cartTotal = document.getElementById('cartTotal');
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

        cartItems.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${index}, -1)">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" 
                           onchange="window.app.setCartQuantity(${index}, this.value)">
                    <button class="quantity-btn" onclick="window.app.updateCartQuantity(${index}, 1)">+</button>
                    <button class="quantity-btn" onclick="window.app.removeFromCart(${index})" style="margin-left: 8px; color: var(--color-error)">×</button>
                </div>
            </div>
        `).join('');

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.settings.tax_rate;
        const total = subtotal + tax;

        if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        if (cartTax) cartTax.textContent = `$${tax.toFixed(2)}`;
        if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
        if (checkoutBtn) checkoutBtn.disabled = this.cart.length === 0;
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

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    }

    showCheckoutModal() {
        if (this.cart.length === 0) return;

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.settings.tax_rate;
        const total = subtotal + tax;

        const checkoutTotal = document.getElementById('checkoutTotal');
        if (checkoutTotal) {
            checkoutTotal.textContent = `$${total.toFixed(2)}`;
        }
        
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideCheckoutModal() {
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    completePayment() {
        const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
        const customerNameEl = document.getElementById('customerName');
        
        const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cash';
        const customerName = customerNameEl ? customerNameEl.value : '';

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.settings.tax_rate;
        const total = subtotal + tax;

        // Create transaction
        const transaction = {
            id: `T${String(this.transactions.length + 1).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            items: [...this.cart],
            total: parseFloat(total.toFixed(2)),
            payment_method: paymentMethod,
            customer_name: customerName || null
        };

        // Update stock levels
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.product_id);
            if (product) {
                product.stock -= item.quantity;
            }
        });

        this.transactions.push(transaction);
        this.clearCart();
        this.hideCheckoutModal();
        this.updateMetrics();
        this.renderTransactions();
        
        // Show success message
        alert(`Payment completed! Transaction ID: ${transaction.id}`);
        
        console.log('Transaction completed:', transaction);
    }

    renderAnalytics() {
        console.log('Rendering analytics...');
        setTimeout(() => {
            this.renderTrendsChart();
            this.renderTopProductsChart();
        }, 200);
    }

    renderSuppliers() {
        console.log('Rendering suppliers...');
        const suppliersGrid = document.getElementById('suppliersGrid');
        if (!suppliersGrid) return;

        suppliersGrid.innerHTML = this.suppliers.map(supplier => `
            <div class="supplier-card">
                <div class="supplier-name">${supplier.name}</div>
                <div class="supplier-contact">📞 ${supplier.contact}</div>
                <div class="supplier-contact">✉️ ${supplier.email}</div>
            </div>
        `).join('');
    }

    renderSettings() {
        console.log('Rendering settings...');
        this.showSettingsPanel('store');
    }

    showSettingsPanel(panelId) {
        console.log(`Showing settings panel: ${panelId}`);
        
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-settings="${panelId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const targetPanel = document.getElementById(`${panelId}Settings`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    showProductModal(productId = null) {
        console.log(`Showing product modal for: ${productId || 'new product'}`);
        
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        const form = document.getElementById('productForm');

        if (!modal || !title || !form) {
            console.error('Product modal elements not found');
            return;
        }

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            title.textContent = 'Edit Product';
            this.populateProductForm(product);
        } else {
            title.textContent = 'Add New Product';
            form.reset();
        }

        modal.dataset.productId = productId || '';
        modal.classList.remove('hidden');
    }

    hideProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    populateProductForm(product) {
        if (!product) return;

        const fields = {
            'productName': product.name,
            'productCategory': product.category,
            'productBarcode': product.barcode,
            'productPrice': product.price,
            'productCost': product.cost,
            'productStock': product.stock,
            'productMinStock': product.min_stock,
            'productSupplier': product.supplier,
            'productDescription': product.description
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    saveProduct() {
        console.log('Saving product...');
        
        const modal = document.getElementById('productModal');
        const productId = modal ? modal.dataset.productId : null;
        
        const formData = {
            name: this.getElementValue('productName'),
            category: this.getElementValue('productCategory'),
            barcode: this.getElementValue('productBarcode'),
            price: parseFloat(this.getElementValue('productPrice')) || 0,
            cost: parseFloat(this.getElementValue('productCost')) || 0,
            stock: parseInt(this.getElementValue('productStock')) || 0,
            min_stock: parseInt(this.getElementValue('productMinStock')) || 0,
            supplier: this.getElementValue('productSupplier'),
            description: this.getElementValue('productDescription')
        };

        if (productId) {
            // Edit existing product
            const product = this.products.find(p => p.id === productId);
            if (product) {
                Object.assign(product, formData);
            }
        } else {
            // Add new product
            const newProduct = {
                id: `P${String(this.products.length + 1).padStart(3, '0')}`,
                image_url: this.getProductEmoji(formData.category),
                ...formData
            };
            this.products.push(newProduct);
        }

        this.hideProductModal();
        this.updateMetrics();
        
        if (this.currentSection === 'inventory') {
            this.renderInventory();
        }
        
        console.log('Product saved:', formData);
    }

    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }

    editProduct(productId) {
        this.showProductModal(productId);
    }

    getProductEmoji(category) {
        const emojiMap = {
            'Produce': '🥬',
            'Dairy': '🥛',
            'Beverages': '🥤',
            'Bakery': '🍞',
            'Meat': '🥩',
            'Frozen': '🧊',
            'Pantry': '🥫',
            'Snacks': '🍿',
            'Health & Beauty': '🧴',
            'Household': '🧽'
        };
        return emojiMap[category] || '📦';
    }

    populateDropdowns() {
        console.log('Populating dropdowns...');
        
        // Categories
        const categorySelects = document.querySelectorAll('#categoryFilter, #productCategory');
        categorySelects.forEach(select => {
            if (select.id === 'categoryFilter') {
                select.innerHTML = '<option value="">All Categories</option>' +
                    this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            } else {
                select.innerHTML = this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            }
        });

        // Suppliers
        const supplierSelect = document.getElementById('productSupplier');
        if (supplierSelect) {
            supplierSelect.innerHTML = this.suppliers.map(supplier => 
                `<option value="${supplier.name}">${supplier.name}</option>`
            ).join('');
        }
    }

    getTodaySales() {
        const today = new Date().toISOString().split('T')[0];
        return this.transactions
            .filter(t => t.date === today)
            .reduce((sum, t) => sum + t.total, 0);
    }

    exportData() {
        const data = {
            products: this.products,
            transactions: this.transactions,
            suppliers: this.suppliers,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storewise-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Data exported successfully!');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (confirm('This will replace all current data. Continue?')) {
                            this.products = data.products || [];
                            this.transactions = data.transactions || [];
                            this.suppliers = data.suppliers || [];
                            this.settings = { ...this.settings, ...data.settings };
                            
                            this.updateMetrics();
                            this.renderDashboard();
                            alert('Data imported successfully!');
                        }
                    } catch (error) {
                        alert('Error importing data: Invalid file format');
                        console.error('Import error:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // Chart rendering methods
    renderSalesChart() {
        const canvas = document.getElementById('salesChart');
        if (!canvas) {
            console.log('Sales chart canvas not found');
            return;
        }

        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Sales',
                    data: [120, 190, 300, 500, 200, 300, 450],
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        console.log('Sales chart rendered');
    }

    renderTrendsChart() {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;

        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.charts.trends = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Sales',
                    data: [1200, 1900, 1500, 1800],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderTopProductsChart() {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) return;

        if (this.charts.topProducts) {
            this.charts.topProducts.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.charts.topProducts = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.products.slice(0, 5).map(p => p.name),
                datasets: [{
                    data: [25, 20, 18, 15, 22],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏪 Starting StoreWise AI...');
    window.app = new StoreWiseApp();
});

// Ensure global access to app instance
window.app = null;