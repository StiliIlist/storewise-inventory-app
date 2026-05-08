// StoreWise AI — Guided Onboarding Tour
// Injects a step-by-step tooltip tour over the app UI
// Triggered on first login or via Help button

const SwTour = {

    steps: [
        { section: 'dashboard', target: '.metrics-row',       title: '👋 Welcome to StoreWise!',       body: 'These four cards are your store\'s pulse. They update in real time as you add products and process sales.', pos: 'bottom' },
        { section: 'dashboard', target: '#alertList',         title: '⚠️ Stock Alerts',                body: 'Any product at or below its minimum stock level appears here. Check this daily to stay ahead of stockouts.', pos: 'top' },
        { section: 'inventory', target: '#addNewProductBtn',  title: '📦 Add Your Products',           body: 'Click here to add a product. Fill in the name, price, cost, stock quantity, and minimum stock level.', pos: 'bottom' },
        { section: 'inventory', target: '#productSearch',     title: '🔍 Search & Filter',             body: 'Search by product name or barcode. Use the category dropdown to narrow results.', pos: 'bottom' },
        { section: 'sales',     target: '#posSearch',         title: '💳 Point of Sale',               body: 'Type a product name or scan a barcode here to add it to the cart instantly.', pos: 'bottom' },
        { section: 'sales',     target: '#checkoutBtn',       title: '✅ Complete a Sale',             body: 'When the cart is ready, click Process Payment. Choose cash or card, confirm, and the sale is logged automatically.', pos: 'top' },
        { section: 'analytics', target: '.performance-metrics', title: '📈 Your Analytics',           body: 'These metrics are calculated from your real inventory and transaction data — not placeholders.', pos: 'top' },
        { section: 'settings',  target: '[data-settings="security"]', title: '🔐 Your Security',      body: 'All data is encrypted with your PIN. Visit Security settings to change your PIN or review what\'s protected.', pos: 'right' },
        { section: 'settings',  target: '[data-settings="sync"]',     title: '☁️ Cloud Sync',          body: 'Connect Google Drive, Dropbox, or a local file here so your data is always backed up and accessible across devices.', pos: 'right' },
    ],

    current: 0,
    overlay: null,
    tooltip: null,
    onComplete: null,

    // ── Public API ──────────────────────────────────────────────────────────

    start(onComplete) {
        if (localStorage.getItem('sw_tour_done') === 'true') return;
        this.onComplete = onComplete;
        this.current = 0;
        this.buildOverlay();
        this.showStep(0);
    },

    startForce(onComplete) {
        this.onComplete = onComplete;
        this.current = 0;
        this.buildOverlay();
        this.showStep(0);
    },

    // ── Build DOM ───────────────────────────────────────────────────────────

    buildOverlay() {
        // Remove existing
        document.getElementById('swTourOverlay')?.remove();
        document.getElementById('swTourTooltip')?.remove();

        // Dark overlay (click to skip)
        const ov = document.createElement('div');
        ov.id = 'swTourOverlay';
        ov.style.cssText = `
            position:fixed;inset:0;background:rgba(13,31,35,0.55);
            z-index:8000;pointer-events:all;
            transition:opacity 0.3s;`;
        ov.addEventListener('click', () => this.skip());
        document.body.appendChild(ov);
        this.overlay = ov;

        // Tooltip card
        const tt = document.createElement('div');
        tt.id = 'swTourTooltip';
        tt.style.cssText = `
            position:fixed;z-index:8001;background:var(--color-surface,#fff);
            border:1px solid var(--color-card-border,#dde6e8);
            border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.18);
            width:300px;padding:0;overflow:hidden;
            transition:all 0.3s cubic-bezier(0.16,1,0.3,1);opacity:0;transform:scale(0.95);`;
        tt.innerHTML = `
            <div style="background:var(--color-primary,#1a8c9c);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
                <span id="swTourTitle" style="font-size:14px;font-weight:700;color:#fff;line-height:1.3;flex:1;"></span>
                <button onclick="SwTour.skip()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:10px;">×</button>
            </div>
            <div style="padding:16px 18px;">
                <p id="swTourBody" style="font-size:13px;color:var(--color-text-secondary,#5a7178);line-height:1.6;margin:0 0 16px;"></p>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div id="swTourDots" style="display:flex;gap:5px;"></div>
                    <div style="display:flex;gap:8px;">
                        <button id="swTourPrev" onclick="SwTour.prev()" style="background:var(--color-secondary,rgba(94,82,64,0.12));border:none;color:var(--color-text,#0d1f23);padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;">← Back</button>
                        <button id="swTourNext" onclick="SwTour.next()" style="background:var(--color-primary,#1a8c9c);border:none;color:#fff;padding:7px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;">Next →</button>
                    </div>
                </div>
            </div>
            <div id="swTourArrow" style="position:absolute;width:0;height:0;"></div>`;
        document.body.appendChild(tt);
        this.tooltip = tt;

        // Animate in
        requestAnimationFrame(() => {
            tt.style.opacity = '1';
            tt.style.transform = 'scale(1)';
        });
    },

    // ── Show a step ─────────────────────────────────────────────────────────

    async showStep(index) {
        const step = this.steps[index];
        if (!step) { this.finish(); return; }

        // Navigate to the right section
        if (window.app && window.app.currentSection !== step.section) {
            window.app.showSection(step.section);
            await this.delay(350);
        }

        // If in settings, navigate to the right sub-panel
        if (step.section === 'settings' && step.target.startsWith('[data-settings')) {
            const panelId = step.target.match(/data-settings="([^"]+)"/)?.[1];
            if (panelId && window.app) window.app.showSettingsPanel(panelId);
            await this.delay(200);
        }

        // Find target element
        const targetEl = document.querySelector(step.target);

        // Update tooltip content
        document.getElementById('swTourTitle').textContent = step.title;
        document.getElementById('swTourBody').textContent  = step.body;

        // Prev/Next button state
        const prevBtn = document.getElementById('swTourPrev');
        const nextBtn = document.getElementById('swTourNext');
        prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
        nextBtn.textContent = index === this.steps.length - 1 ? 'Finish ✓' : 'Next →';

        // Progress dots
        const dotsEl = document.getElementById('swTourDots');
        dotsEl.innerHTML = this.steps.map((_,i) => `
            <span style="width:6px;height:6px;border-radius:50%;background:${i===index?'var(--color-primary,#1a8c9c)':'var(--color-border,#dde6e8)'};display:inline-block;"></span>`).join('');

        // Position tooltip near target
        if (targetEl) {
            targetEl.scrollIntoView({ behavior:'smooth', block:'center' });
            await this.delay(300);
            this.positionTooltip(targetEl, step.pos);
            this.highlightTarget(targetEl);
        } else {
            // Center if no target found
            this.centerTooltip();
        }
    },

    // ── Positioning ─────────────────────────────────────────────────────────

    positionTooltip(targetEl, pos) {
        const tt   = this.tooltip;
        const rect = targetEl.getBoundingClientRect();
        const ttW  = 300, ttH = 180, gap = 14;
        const vW   = window.innerWidth, vH = window.innerHeight;

        let top, left;

        switch(pos) {
            case 'bottom':
                top  = Math.min(rect.bottom + gap, vH - ttH - 16);
                left = Math.max(16, Math.min(rect.left + rect.width/2 - ttW/2, vW - ttW - 16));
                break;
            case 'top':
                top  = Math.max(16, rect.top - ttH - gap);
                left = Math.max(16, Math.min(rect.left + rect.width/2 - ttW/2, vW - ttW - 16));
                break;
            case 'right':
                top  = Math.max(16, Math.min(rect.top + rect.height/2 - ttH/2, vH - ttH - 16));
                left = Math.min(rect.right + gap, vW - ttW - 16);
                break;
            case 'left':
                top  = Math.max(16, Math.min(rect.top + rect.height/2 - ttH/2, vH - ttH - 16));
                left = Math.max(16, rect.left - ttW - gap);
                break;
            default:
                this.centerTooltip(); return;
        }

        tt.style.top  = top  + 'px';
        tt.style.left = left + 'px';
        tt.style.right = 'auto';
        tt.style.bottom = 'auto';
    },

    centerTooltip() {
        const tt = this.tooltip;
        tt.style.top  = '50%';
        tt.style.left = '50%';
        tt.style.transform = 'translate(-50%,-50%) scale(1)';
        tt.style.right  = 'auto';
        tt.style.bottom = 'auto';
    },

    highlightTarget(el) {
        // Remove previous highlight
        document.querySelector('.sw-tour-highlight')?.classList.remove('sw-tour-highlight');
        el.classList.add('sw-tour-highlight');

        // Inject highlight styles if not already there
        if (!document.getElementById('swTourStyles')) {
            const style = document.createElement('style');
            style.id = 'swTourStyles';
            style.textContent = `
                .sw-tour-highlight {
                    position:relative;
                    z-index:8002 !important;
                    box-shadow:0 0 0 4px var(--color-primary,#1a8c9c), 0 0 0 8px rgba(26,140,156,0.2) !important;
                    border-radius:var(--radius-base,8px);
                    transition:box-shadow 0.3s;
                }`;
            document.head.appendChild(style);
        }
    },

    // ── Navigation ──────────────────────────────────────────────────────────

    next() {
        document.querySelector('.sw-tour-highlight')?.classList.remove('sw-tour-highlight');
        this.current++;
        if (this.current >= this.steps.length) { this.finish(); return; }
        // Animate tooltip out then in
        this.tooltip.style.opacity = '0.3';
        this.tooltip.style.transform = 'scale(0.97)';
        setTimeout(() => {
            this.tooltip.style.opacity = '1';
            this.tooltip.style.transform = 'scale(1)';
            this.showStep(this.current);
        }, 200);
    },

    prev() {
        if (this.current === 0) return;
        document.querySelector('.sw-tour-highlight')?.classList.remove('sw-tour-highlight');
        this.current--;
        this.showStep(this.current);
    },

    skip() {
        this.cleanup();
        localStorage.setItem('sw_tour_done','true');
    },

    finish() {
        this.cleanup();
        localStorage.setItem('sw_tour_done','true');
        if (this.onComplete) this.onComplete();
        // Show completion toast
        window.app?.showToast('🎉 Tour complete! Explore the app or visit the Training Center for full guides.');
    },

    cleanup() {
        document.querySelector('.sw-tour-highlight')?.classList.remove('sw-tour-highlight');
        this.overlay?.remove();
        this.tooltip?.remove();
        this.overlay = null;
        this.tooltip = null;
    },

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
};
