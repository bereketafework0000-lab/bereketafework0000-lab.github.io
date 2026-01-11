// ============================================
// TENDERS MODULE - Business Tender Management
// ============================================

const TendersManager = {
    companies: [],
    tenders: [],
    tempExpenses: [],

    init() {
        this.loadData();
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        // Add company button
        document.getElementById('add-tender-company-btn')?.addEventListener('click', () => {
            this.openCompanyModal();
        });

        // Add tender button
        document.getElementById('add-tender-btn')?.addEventListener('click', () => {
            this.openTenderModal();
        });

        // Company form
        document.getElementById('tender-company-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCompany();
        });

        // Tender form
        document.getElementById('tender-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTender();
        });

        // Status change - show/hide won fields
        document.getElementById('tender-status')?.addEventListener('change', (e) => {
            const wonFields = document.getElementById('won-tender-fields');
            if (e.target.value === 'won') {
                wonFields?.classList.remove('hidden');
            } else {
                wonFields?.classList.add('hidden');
            }
        });

        // Add expense button
        document.getElementById('add-tender-expense-btn')?.addEventListener('click', () => {
            this.addExpense();
        });

        // Filters
        document.getElementById('tender-company-filter')?.addEventListener('change', () => this.render());
        document.getElementById('tender-status-filter')?.addEventListener('change', () => this.render());
        document.getElementById('tender-search')?.addEventListener('input', () => this.render());

        // Modal close buttons
        document.querySelectorAll('[data-modal="tender-company-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal('tender-company-modal'));
        });
        document.querySelectorAll('[data-modal="tender-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal('tender-modal'));
        });
    },

    async loadData() {
        try {
            // Load from IndexedDB
            this.companies = await OfflineManager.getData('tenderCompanies') || [];
            this.tenders = await OfflineManager.getData('tenders') || [];
            this.render();
            this.updateStats();
            this.updateCompanyDropdowns();

            // If connected to Google Sheets, sync and merge
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                try {
                    // 1. Sync Companies
                    const sheetsCompanies = await SheetsAPI.getTenderCompanies();
                    if (sheetsCompanies.length > 0) {
                        const unsyncedComp = await OfflineManager.getUnsynced('tenderCompanies');
                        await OfflineManager.clear('tenderCompanies');
                        const compsToSave = sheetsCompanies.map(c => ({ ...c, synced: true, timestamp: Date.now() }));
                        await OfflineManager.saveData('tenderCompanies', compsToSave);
                        if (unsyncedComp.length > 0) await OfflineManager.saveData('tenderCompanies', unsyncedComp);
                    }

                    // 2. Sync Tenders
                    const sheetsTenders = await SheetsAPI.getTenders();
                    if (sheetsTenders.length > 0) {
                        const unsyncedTenders = await OfflineManager.getUnsynced('tenders');
                        await OfflineManager.clear('tenders');
                        const tendersToSave = sheetsTenders.map(t => ({ ...t, synced: true, timestamp: Date.now() }));
                        await OfflineManager.saveData('tenders', tendersToSave);
                        if (unsyncedTenders.length > 0) await OfflineManager.saveData('tenders', unsyncedTenders);
                    }

                    // 3. Reload everything
                    this.companies = await OfflineManager.getData('tenderCompanies') || [];
                    this.tenders = await OfflineManager.getData('tenders') || [];
                    this.render();
                    this.updateStats();
                    this.updateCompanyDropdowns();

                } catch (syncError) {
                    console.error('Tenders sync merge error:', syncError);
                }
            }
        } catch (error) {
            console.error('Error loading tenders:', error);
        }
    },

    // ========== COMPANIES ==========
    openCompanyModal() {
        document.getElementById('tender-company-form').reset();
        document.getElementById('tender-company-id').value = '';
        document.getElementById('tender-company-modal').classList.remove('hidden');
    },

    async saveCompany() {
        const id = document.getElementById('tender-company-id').value;
        const company = {
            id: id || Date.now().toString(),
            name: document.getElementById('tender-company-name').value,
            contact: document.getElementById('tender-company-contact').value,
            phone: document.getElementById('tender-company-phone').value,
            email: document.getElementById('tender-company-email').value
        };

        if (id) {
            const index = this.companies.findIndex(c => c.id === id);
            if (index !== -1) this.companies[index] = company;
            await OfflineManager.update('tenderCompanies', company);
        } else {
            this.companies.push(company);
            await OfflineManager.save('tenderCompanies', company);
        }

        // Immediate sync if online
        if (window.SheetsAPI && window.SheetsAPI.isConnected) {
            await SheetsAPI.addTenderCompany(company);
        }

        this.closeModal('tender-company-modal');
        this.updateCompanyDropdowns();
        this.render();
    },

    async deleteCompany(id) {
        if (confirm('Delete this company and all its tenders?')) {
            // Delete tenders first
            const companyTenders = this.tenders.filter(t => t.companyId === id);
            for (const tender of companyTenders) {
                await OfflineManager.delete('tenders', tender.id);
            }

            // Delete company
            await OfflineManager.delete('tenderCompanies', id);

            // Update local state
            this.companies = this.companies.filter(c => c.id !== id);
            this.tenders = this.tenders.filter(t => t.companyId !== id);

            this.render();
            this.updateCompanyDropdowns();
        }
    },

    updateCompanyDropdowns() {
        const options = this.companies.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');

        const modalSelect = document.getElementById('tender-company-select');
        const filterSelect = document.getElementById('tender-company-filter');

        if (modalSelect) {
            modalSelect.innerHTML = '<option value="">Select company...</option>' + options;
        }
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="all">All Companies</option>' + options;
        }
    },

    // ========== TENDERS ==========
    openTenderModal() {
        this.updateCompanyDropdowns();
        document.getElementById('tender-form').reset();
        document.getElementById('tender-id').value = '';
        document.getElementById('tender-modal-title').textContent = 'Add Tender';
        document.getElementById('won-tender-fields').classList.add('hidden');
        document.getElementById('tender-submission-date').value = new Date().toISOString().split('T')[0];
        this.tempExpenses = [];
        this.renderExpenses();
        document.getElementById('tender-modal').classList.remove('hidden');
    },

    editTender(id) {
        const tender = this.tenders.find(t => t.id === id);
        if (!tender) return;

        this.updateCompanyDropdowns();
        document.getElementById('tender-id').value = tender.id;
        document.getElementById('tender-modal-title').textContent = 'Edit Tender';
        document.getElementById('tender-company-select').value = tender.companyId;
        document.getElementById('tender-reference').value = tender.reference;
        document.getElementById('tender-title').value = tender.title;
        document.getElementById('tender-submission-date').value = tender.submissionDate;
        document.getElementById('tender-closing-date').value = tender.closingDate || '';
        document.getElementById('tender-bid-amount').value = tender.bidAmount;
        document.getElementById('tender-status').value = tender.status;
        document.getElementById('tender-award-amount').value = tender.awardAmount || '';
        document.getElementById('tender-award-date').value = tender.awardDate || '';
        document.getElementById('tender-products-won').value = tender.productsWon || '';
        document.getElementById('tender-notes').value = tender.notes || '';

        if (tender.status === 'won') {
            document.getElementById('won-tender-fields').classList.remove('hidden');
        } else {
            document.getElementById('won-tender-fields').classList.add('hidden');
        }

        this.tempExpenses = tender.expenses ? [...tender.expenses] : [];
        this.renderExpenses();
        document.getElementById('tender-modal').classList.remove('hidden');
    },

    async saveTender() {
        const id = document.getElementById('tender-id').value;
        const tender = {
            id: id || Date.now().toString(),
            companyId: document.getElementById('tender-company-select').value,
            reference: document.getElementById('tender-reference').value,
            title: document.getElementById('tender-title').value,
            submissionDate: document.getElementById('tender-submission-date').value,
            closingDate: document.getElementById('tender-closing-date').value,
            bidAmount: parseFloat(document.getElementById('tender-bid-amount').value) || 0,
            status: document.getElementById('tender-status').value,
            awardAmount: parseFloat(document.getElementById('tender-award-amount').value) || null,
            awardDate: document.getElementById('tender-award-date').value || null,
            productsWon: document.getElementById('tender-products-won').value,
            expenses: [...this.tempExpenses],
            notes: document.getElementById('tender-notes').value,
            createdAt: id ? this.tenders.find(t => t.id === id)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const index = this.tenders.findIndex(t => t.id === id);
            if (index !== -1) this.tenders[index] = tender;
            await OfflineManager.update('tenders', tender);
        } else {
            this.tenders.push(tender);
            await OfflineManager.save('tenders', tender);
        }

        // Immediate sync if online
        if (window.SheetsAPI && window.SheetsAPI.isConnected) {
            await SheetsAPI.addTender(tender);
        }

        this.closeModal('tender-modal');
        this.render();
        this.updateStats();
    },

    async deleteTender(id) {
        if (confirm('Delete this tender?')) {
            await OfflineManager.delete('tenders', id);
            this.tenders = this.tenders.filter(t => t.id !== id);
            this.render();
            this.updateStats();
        }
    },

    // ========== EXPENSES ==========
    addExpense() {
        const desc = document.getElementById('new-expense-desc').value;
        const amount = parseFloat(document.getElementById('new-expense-amount').value);

        if (!desc || !amount) return;

        this.tempExpenses.push({ description: desc, amount: amount });
        document.getElementById('new-expense-desc').value = '';
        document.getElementById('new-expense-amount').value = '';
        this.renderExpenses();
    },

    removeExpense(index) {
        this.tempExpenses.splice(index, 1);
        this.renderExpenses();
    },

    renderExpenses() {
        const container = document.getElementById('tender-expenses-list');
        if (!container) return;

        if (this.tempExpenses.length === 0) {
            container.innerHTML = '<p class="empty-expenses">No expenses added</p>';
            return;
        }

        const total = this.tempExpenses.reduce((sum, e) => sum + e.amount, 0);
        container.innerHTML = this.tempExpenses.map((exp, i) => `
            <div class="expense-item">
                <span>${exp.description}</span>
                <span class="expense-amount">$${exp.amount.toFixed(2)}</span>
                <button type="button" class="btn-remove" onclick="TendersManager.removeExpense(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('') + `<div class="expense-total">Total: $${total.toFixed(2)}</div>`;
    },

    // ========== RENDER ==========
    render() {
        this.updateCompanyDropdowns();
        this.updateStats();
        this.renderTendersList();
    },

    updateStats() {
        const won = this.tenders.filter(t => t.status === 'won');
        const lost = this.tenders.filter(t => t.status === 'lost');
        const pending = this.tenders.filter(t => t.status === 'pending');
        const completed = won.length + lost.length;

        // Summary counts
        document.getElementById('total-tenders-count').textContent = this.tenders.length;
        document.getElementById('won-tenders-count').textContent = won.length;
        document.getElementById('lost-tenders-count').textContent = lost.length;
        document.getElementById('pending-tenders-count').textContent = pending.length;

        // Win rate
        const winRate = completed > 0 ? (won.length / completed) * 100 : 0;
        document.getElementById('win-rate-percent').textContent = winRate.toFixed(0) + '%';
        const progress = document.getElementById('win-rate-progress');
        if (progress) {
            progress.setAttribute('stroke-dasharray', `${winRate}, 100`);
        }

        // Investment
        const totalInvestment = this.tenders.reduce((sum, t) => {
            return sum + (t.expenses ? t.expenses.reduce((s, e) => s + e.amount, 0) : 0);
        }, 0);
        const totalWonValue = won.reduce((sum, t) => sum + (t.awardAmount || t.bidAmount || 0), 0);
        const roi = totalInvestment > 0 ? ((totalWonValue - totalInvestment) / totalInvestment * 100) : 0;

        document.getElementById('total-investment').textContent = '$' + totalInvestment.toFixed(2);
        document.getElementById('total-won-value').textContent = '$' + totalWonValue.toFixed(2);

        const roiEl = document.getElementById('tender-roi');
        if (roiEl) {
            roiEl.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%';
            roiEl.className = roi >= 0 ? 'text-success' : 'text-danger';
        }
    },

    renderTendersList() {
        const container = document.getElementById('tenders-by-company');
        if (!container) return;

        const companyFilter = document.getElementById('tender-company-filter')?.value || 'all';
        const statusFilter = document.getElementById('tender-status-filter')?.value || 'all';
        const search = (document.getElementById('tender-search')?.value || '').toLowerCase();

        let filteredTenders = this.tenders.filter(t => {
            const matchesCompany = companyFilter === 'all' || t.companyId === companyFilter;
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            const matchesSearch = (t.title || '').toLowerCase().includes(search) || (t.reference || '').toLowerCase().includes(search);
            return matchesCompany && matchesStatus && matchesSearch;
        });

        if (this.companies.length === 0) {
            container.innerHTML = '<p class="empty-message">No tenders yet. Add a company first, then create tenders.</p>';
            return;
        }

        let html = '';
        this.companies.forEach(company => {
            const companyTenders = filteredTenders.filter(t => t.companyId === company.id);
            const wonCount = companyTenders.filter(t => t.status === 'won').length;
            const lostCount = companyTenders.filter(t => t.status === 'lost').length;
            const pendingCount = companyTenders.filter(t => t.status === 'pending').length;

            html += `
                <div class="tender-company-card">
                    <div class="company-header">
                        <div class="company-info">
                            <h3><i class="fas fa-building"></i> ${company.name}</h3>
                            <div class="company-stats">
                                <span class="stat-won"><i class="fas fa-trophy"></i> ${wonCount}</span>
                                <span class="stat-lost"><i class="fas fa-times-circle"></i> ${lostCount}</span>
                                <span class="stat-pending"><i class="fas fa-hourglass-half"></i> ${pendingCount}</span>
                            </div>
                        </div>
                        <button class="btn-action btn-danger" onclick="TendersManager.deleteCompany('${company.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="tenders-table">
                        ${companyTenders.length === 0 ? '<p class="no-tenders">No tenders for this company</p>' : `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Title</th>
                                        <th>Date</th>
                                        <th>Bid Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${companyTenders.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate)).map(tender => {
                const statusClass = tender.status === 'won' ? 'badge-success' :
                    tender.status === 'lost' ? 'badge-danger' : 'badge-warning';
                return `
                                            <tr>
                                                <td><code>${tender.reference}</code></td>
                                                <td>${tender.title}</td>
                                                <td>${tender.submissionDate}</td>
                                                <td>$${tender.bidAmount.toFixed(2)}</td>
                                                <td><span class="badge ${statusClass}">${tender.status}</span></td>
                                                <td class="actions">
                                                    <button class="btn-action" onclick="TendersManager.editTender('${tender.id}')">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn-action btn-danger" onclick="TendersManager.deleteTender('${tender.id}')">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
            }).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    },

    // Get tender stats for dashboard
    getStats() {
        const won = this.tenders.filter(t => t.status === 'won');
        const wonValue = won.reduce((sum, t) => sum + (t.awardAmount || t.bidAmount || 0), 0);
        return {
            total: this.tenders.length,
            won: won.length,
            lost: this.tenders.filter(t => t.status === 'lost').length,
            pending: this.tenders.filter(t => t.status === 'pending').length,
            wonValue: wonValue
        };
    }
};

window.TendersManager = TendersManager;
