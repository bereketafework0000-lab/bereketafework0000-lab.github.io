// ============================================
// SERVICES MODULE - Computer Maintenance Tracking
// ============================================

const ServicesManager = {
    services: [],

    init() {
        this.loadServices();
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        // Add service button
        document.getElementById('add-service-btn')?.addEventListener('click', () => {
            this.openModal();
        });

        // Service form submission
        document.getElementById('service-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveService();
        });

        // Search functionality
        document.getElementById('services-search')?.addEventListener('input', (e) => {
            this.render(e.target.value);
        });

        // Modal close buttons
        document.querySelectorAll('[data-modal="service-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
    },

    async loadServices() {
        try {
            // Load from IndexedDB
            this.services = await OfflineManager.getData('services') || [];
            this.render();

            // If connected to Google Sheets, sync and merge
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                try {
                    const sheetsData = await SheetsAPI.getServices();

                    if (sheetsData.length > 0) {
                        // 1. Get local unsynced items to preserve them
                        const unsynced = await OfflineManager.getUnsynced('services');

                        // 2. Clear local store
                        await OfflineManager.clear('services');

                        // 3. Save Sheets data (marked as synced)
                        const toSave = sheetsData.map(s => ({
                            ...s,
                            synced: true,
                            timestamp: Date.now()
                        }));
                        await OfflineManager.saveData('services', toSave);

                        // 4. Restore unsynced local items
                        if (unsynced.length > 0) {
                            await OfflineManager.saveData('services', unsynced);
                        }

                        // 5. Reload merged data
                        this.services = await OfflineManager.getData('services');
                        this.render();
                    }
                } catch (syncError) {
                    console.error('Services sync merge error:', syncError);
                }
            }
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = [];
        }
    },

    async saveService() {
        const id = document.getElementById('service-id').value;
        const service = {
            id: id || Date.now().toString(),
            customer: document.getElementById('service-customer').value,
            phone: document.getElementById('service-phone').value,
            device: document.getElementById('service-device').value,
            problem: document.getElementById('service-problem').value,
            status: document.getElementById('service-status').value,
            receivedDate: document.getElementById('service-received-date').value,
            dueDate: document.getElementById('service-due-date').value,
            amount: parseFloat(document.getElementById('service-amount').value) || 0,
            notes: document.getElementById('service-notes').value,
            createdAt: id ? this.services.find(s => s.id === id)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            // Update existing
            const index = this.services.findIndex(s => s.id === id);
            if (index !== -1) {
                this.services[index] = service;
                await OfflineManager.update('services', service);
            }
        } else {
            // Add new
            this.services.push(service);
            await OfflineManager.save('services', service);
        }

        // Immediate sync if online
        if (window.SheetsAPI && window.SheetsAPI.isConnected) {
            await SheetsAPI.addService(service);
        }
        this.closeModal();
        this.render();
    },

    async deleteService(id) {
        if (confirm('Are you sure you want to delete this service record?')) {
            await OfflineManager.delete('services', id);
            this.services = this.services.filter(s => s.id !== id);
            this.render();
        }
    },

    editService(id) {
        const service = this.services.find(s => s.id === id);
        if (!service) return;

        document.getElementById('service-modal-title').textContent = 'Edit Service';
        document.getElementById('service-id').value = service.id;
        document.getElementById('service-customer').value = service.customer;
        document.getElementById('service-phone').value = service.phone;
        document.getElementById('service-device').value = service.device;
        document.getElementById('service-problem').value = service.problem;
        document.getElementById('service-status').value = service.status;
        document.getElementById('service-received-date').value = service.receivedDate;
        document.getElementById('service-due-date').value = service.dueDate;
        document.getElementById('service-amount').value = service.amount || '';
        document.getElementById('service-notes').value = service.notes || '';

        document.getElementById('service-modal').classList.remove('hidden');
    },

    openModal() {
        document.getElementById('service-modal-title').textContent = 'Add Service';
        document.getElementById('service-form').reset();
        document.getElementById('service-id').value = '';
        document.getElementById('service-received-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('service-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('service-modal').classList.add('hidden');
        document.getElementById('service-form').reset();
    },

    getStatusBadge(status) {
        const badges = {
            'Pending': 'badge-warning',
            'In Progress': 'badge-info',
            'Completed': 'badge-success',
            'Waiting Parts': 'badge-secondary',
            'Delivered': 'badge-primary'
        };
        return badges[status] || 'badge-secondary';
    },

    render(searchTerm = '') {
        const tbody = document.getElementById('services-table-body');
        if (!tbody) return;

        let filteredServices = this.services;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredServices = this.services.filter(s =>
                s.customer.toLowerCase().includes(term) ||
                s.phone.includes(term) ||
                s.problem.toLowerCase().includes(term) ||
                s.device.toLowerCase().includes(term)
            );
        }

        // Sort by due date (upcoming first), then by received date
        filteredServices.sort((a, b) => {
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return new Date(b.receivedDate) - new Date(a.receivedDate);
        });

        if (filteredServices.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
                        <i class="fas fa-tools"></i>
                        <p>${searchTerm ? 'No matching services found' : 'No service records yet. Click "Add Service" to get started!'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredServices.map(service => `
            <tr>
                <td>
                    <strong>${service.customer}</strong>
                    <br><small>${service.device}</small>
                </td>
                <td>${service.phone}</td>
                <td title="${service.problem}">${service.problem.substring(0, 30)}${service.problem.length > 30 ? '...' : ''}</td>
                <td><span class="badge ${this.getStatusBadge(service.status)}">${service.status}</span></td>
                <td>${service.dueDate ? new Date(service.dueDate).toLocaleDateString() : '-'}</td>
                <td>$${service.amount.toFixed(2)}</td>
                <td class="actions">
                    <button class="btn-action" onclick="ServicesManager.editService('${service.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-danger" onclick="ServicesManager.deleteService('${service.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // Get services statistics
    getStats() {
        const pending = this.services.filter(s => s.status === 'Pending' || s.status === 'In Progress').length;
        const completed = this.services.filter(s => s.status === 'Completed' || s.status === 'Delivered').length;
        const totalAmount = this.services.reduce((sum, s) => sum + s.amount, 0);

        return { pending, completed, total: this.services.length, totalAmount };
    }
};

// Make it globally available
window.ServicesManager = ServicesManager;
