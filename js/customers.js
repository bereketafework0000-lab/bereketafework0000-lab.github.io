// ============================================
// CUSTOMERS MODULE - Customer Management
// ============================================

const CustomersManager = {
    customers: [],

    init() {
        this.loadCustomers();
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        // Add customer button
        document.getElementById('add-customer-btn')?.addEventListener('click', () => {
            this.openModal();
        });

        // Customer form submission
        document.getElementById('customer-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomer();
        });

        // Search functionality
        document.getElementById('customers-search')?.addEventListener('input', (e) => {
            this.render(e.target.value);
        });

        // Modal close buttons
        document.querySelectorAll('[data-modal="customer-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
    },

    async loadCustomers() {
        try {
            this.customers = await OfflineManager.getData('customers') || [];
        } catch (error) {
            console.error('Error loading customers:', error);
            this.customers = [];
        }
    },

    async saveCustomer() {
        const id = document.getElementById('customer-id').value;
        const customer = {
            id: id || Date.now().toString(),
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            address: document.getElementById('customer-address').value,
            notes: document.getElementById('customer-notes').value,
            totalPurchases: id ? this.customers.find(c => c.id === id)?.totalPurchases || 0 : 0,
            balanceDue: id ? this.customers.find(c => c.id === id)?.balanceDue || 0 : 0,
            createdAt: id ? this.customers.find(c => c.id === id)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            // Update existing
            const index = this.customers.findIndex(c => c.id === id);
            if (index !== -1) {
                this.customers[index] = customer;
                await OfflineManager.update('customers', customer);
            }
        } else {
            // Add new
            this.customers.push(customer);
            await OfflineManager.save('customers', customer);
        }
        this.closeModal();
        this.render();
    },

    async deleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            await OfflineManager.delete('customers', id);
            this.customers = this.customers.filter(c => c.id !== id);
            this.render();
        }
    },

    editCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        document.getElementById('customer-id').value = customer.id;
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-phone').value = customer.phone;
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-notes').value = customer.notes || '';

        document.getElementById('customer-modal').classList.remove('hidden');
    },

    openModal() {
        document.getElementById('customer-modal-title').textContent = 'Add Customer';
        document.getElementById('customer-form').reset();
        document.getElementById('customer-id').value = '';
        document.getElementById('customer-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('customer-modal').classList.add('hidden');
        document.getElementById('customer-form').reset();
    },

    // Update customer balance (called from sales module)
    async updateCustomerBalance(customerName, amount, paymentStatus) {
        let customer = this.customers.find(c =>
            c.name.toLowerCase() === customerName.toLowerCase()
        );

        if (!customer && customerName) {
            // Create new customer if doesn't exist
            customer = {
                id: Date.now().toString(),
                name: customerName,
                phone: '',
                email: '',
                address: '',
                notes: 'Auto-created from sale',
                totalPurchases: 0,
                balanceDue: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.customers.push(customer);
        }

        if (customer) {
            customer.totalPurchases += amount;

            if (paymentStatus === 'Loan') {
                customer.balanceDue += amount;
            } else if (paymentStatus === 'Partial') {
                // Partial payments are handled separately
            }

            customer.updatedAt = new Date().toISOString();
            await OfflineManager.update('customers', customer);
        }
    },

    // Record a payment against balance
    async recordPayment(customerId, amount) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            customer.balanceDue = Math.max(0, customer.balanceDue - amount);
            customer.updatedAt = new Date().toISOString();
            await OfflineManager.update('customers', customer);
            this.render();
        }
    },

    render(searchTerm = '') {
        const tbody = document.getElementById('customers-table-body');
        if (!tbody) return;

        let filteredCustomers = this.customers;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredCustomers = this.customers.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.phone.includes(term) ||
                c.email?.toLowerCase().includes(term)
            );
        }

        // Sort by name
        filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));

        if (filteredCustomers.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">
                        <i class="fas fa-users"></i>
                        <p>${searchTerm ? 'No matching customers found' : 'No customers yet. Click "Add Customer" to get started!'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredCustomers.map(customer => `
            <tr>
                <td><strong>${customer.name}</strong></td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.email || '-'}</td>
                <td>$${customer.totalPurchases.toFixed(2)}</td>
                <td class="${customer.balanceDue > 0 ? 'text-danger' : ''}">
                    ${customer.balanceDue > 0 ? '$' + customer.balanceDue.toFixed(2) : '-'}
                </td>
                <td class="actions">
                    <button class="btn-action" onclick="CustomersManager.editCustomer('${customer.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-danger" onclick="CustomersManager.deleteCustomer('${customer.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // Get list of customers for dropdown
    getCustomerList() {
        return this.customers.map(c => ({ id: c.id, name: c.name }));
    },

    // Get customers with outstanding balance
    getDebtors() {
        return this.customers.filter(c => c.balanceDue > 0);
    }
};

// Make it globally available
window.CustomersManager = CustomersManager;
