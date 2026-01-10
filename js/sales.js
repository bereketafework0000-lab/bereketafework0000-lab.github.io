// ============================================
// SALES MANAGEMENT MODULE
// ============================================

const SalesManager = {
    sales: [],
    filteredSales: [],

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadSales();
    },

    cacheElements() {
        this.elements = {
            addBtn: document.getElementById('add-sale-btn'),
            searchInput: document.getElementById('sales-search'),
            tableBody: document.getElementById('sales-table-body'),
            modal: document.getElementById('sale-modal'),
            modalTitle: document.getElementById('sale-modal-title'),
            form: document.getElementById('sale-form'),
            idInput: document.getElementById('sale-id'),
            dateInput: document.getElementById('sale-date'),
            descInput: document.getElementById('sale-description'),
            categoryInput: document.getElementById('sale-category'),
            amountInput: document.getElementById('sale-amount')
        };
    },

    attachEventListeners() {
        // Add button
        this.elements.addBtn.addEventListener('click', () => this.showAddModal());

        // Search
        this.elements.searchInput.addEventListener('input', (e) => this.filterSales(e.target.value));

        // Form submit
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Modal close buttons
        document.querySelectorAll('[data-modal="sale-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Close modal on backdrop click
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });
    },

    async loadSales() {
        try {
            // Load from IndexedDB
            if (window.OfflineManager && window.OfflineManager.db) {
                this.sales = await OfflineManager.getAll('sales');
                this.filteredSales = [...this.sales];
                this.renderTable();
            }

            // If connected to Google Sheets, sync
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                const sheetsSales = await SheetsAPI.getSales();
                // Merge logic here if needed
            }
        } catch (error) {
            console.error('Error loading sales:', error);
        }
    },

    filterSales(query) {
        const lowerQuery = query.toLowerCase();
        this.filteredSales = this.sales.filter(sale =>
            sale.description.toLowerCase().includes(lowerQuery) ||
            sale.category.toLowerCase().includes(lowerQuery) ||
            sale.amount.toString().includes(lowerQuery) ||
            sale.date.includes(lowerQuery)
        );
        this.renderTable();
    },

    renderTable() {
        if (this.filteredSales.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        <i class="fas fa-inbox"></i>
                        <p>No sales found. Click "Add Sale" to get started!</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by date (newest first)
        const sorted = [...this.filteredSales].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        this.elements.tableBody.innerHTML = sorted.map(sale => `
            <tr>
                <td>${this.formatDate(sale.date)}</td>
                <td>${this.escapeHtml(sale.description)}</td>
                <td><span class="badge">${this.escapeHtml(sale.category)}</span></td>
                <td class="text-success">$${parseFloat(sale.amount).toFixed(2)}</td>
                <td class="action-btns">
                    <button class="btn-icon" onclick="SalesManager.editSale(${sale.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="SalesManager.deleteSale(${sale.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update dashboard
        if (window.Dashboard) {
            Dashboard.updateStats();
        }
    },

    showAddModal() {
        this.elements.modalTitle.textContent = 'Add Sale';
        this.elements.form.reset();
        this.elements.idInput.value = '';
        this.elements.dateInput.value = new Date().toISOString().split('T')[0];
        this.elements.modal.classList.remove('hidden');
        this.elements.descInput.focus();
    },

    editSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (!sale) return;

        this.elements.modalTitle.textContent = 'Edit Sale';
        this.elements.idInput.value = sale.id;
        this.elements.dateInput.value = sale.date;
        this.elements.descInput.value = sale.description;
        this.elements.categoryInput.value = sale.category;
        this.elements.amountInput.value = sale.amount;
        this.elements.modal.classList.remove('hidden');
        this.elements.descInput.focus();
    },

    async deleteSale(id) {
        if (!confirm('Are you sure you want to delete this sale?')) return;

        try {
            // Delete from IndexedDB
            await OfflineManager.delete('sales', id);

            // Remove from local array
            this.sales = this.sales.filter(s => s.id !== id);
            this.filteredSales = this.filteredSales.filter(s => s.id !== id);

            // Re-render
            this.renderTable();

            // TODO: Delete from Google Sheets if connected
        } catch (error) {
            console.error('Error deleting sale:', error);
            alert('Error deleting sale. Please try again.');
        }
    },

    async handleSubmit(e) {
        e.preventDefault();

        const saleData = {
            date: this.elements.dateInput.value,
            description: this.elements.descInput.value,
            category: this.elements.categoryInput.value,
            amount: parseFloat(this.elements.amountInput.value)
        };

        const id = this.elements.idInput.value;

        try {
            if (id) {
                // Update existing
                saleData.id = parseInt(id);
                await OfflineManager.update('sales', saleData);

                const index = this.sales.findIndex(s => s.id === saleData.id);
                if (index !== -1) {
                    this.sales[index] = saleData;
                }
            } else {
                // Add new
                const newId = await OfflineManager.save('sales', saleData);
                saleData.id = newId;
                this.sales.push(saleData);
            }

            // Sync with Google Sheets if connected
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                await SheetsAPI.addSale(saleData);
            }

            this.filteredSales = [...this.sales];
            this.renderTable();
            this.closeModal();
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Error saving sale. Please try again.');
        }
    },

    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.elements.form.reset();
    },

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.SalesManager = SalesManager;
