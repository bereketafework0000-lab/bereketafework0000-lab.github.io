// ============================================
// EXPENSES MANAGEMENT MODULE
// ============================================

const ExpensesManager = {
    expenses: [],
    filteredExpenses: [],

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadExpenses();
    },

    cacheElements() {
        this.elements = {
            addBtn: document.getElementById('add-expense-btn'),
            searchInput: document.getElementById('expenses-search'),
            tableBody: document.getElementById('expenses-table-body'),
            modal: document.getElementById('expense-modal'),
            modalTitle: document.getElementById('expense-modal-title'),
            form: document.getElementById('expense-form'),
            idInput: document.getElementById('expense-id'),
            dateInput: document.getElementById('expense-date'),
            descInput: document.getElementById('expense-description'),
            categoryInput: document.getElementById('expense-category'),
            amountInput: document.getElementById('expense-amount')
        };
    },

    attachEventListeners() {
        // Add button
        this.elements.addBtn.addEventListener('click', () => this.showAddModal());

        // Search
        this.elements.searchInput.addEventListener('input', (e) => this.filterExpenses(e.target.value));

        // Form submit
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Modal close buttons
        document.querySelectorAll('[data-modal="expense-modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Close modal on backdrop click
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });
    },

    async loadExpenses() {
        try {
            // Load from IndexedDB
            if (window.OfflineManager && window.OfflineManager.db) {
                this.expenses = await OfflineManager.getAll('expenses');
                this.filteredExpenses = [...this.expenses];
                this.renderTable();
            }

            // If connected to Google Sheets, sync
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                const sheetsExpenses = await SheetsAPI.getExpenses();
                // Merge logic here if needed
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
        }
    },

    filterExpenses(query) {
        const lowerQuery = query.toLowerCase();
        this.filteredExpenses = this.expenses.filter(expense =>
            expense.description.toLowerCase().includes(lowerQuery) ||
            expense.category.toLowerCase().includes(lowerQuery) ||
            expense.amount.toString().includes(lowerQuery) ||
            expense.date.includes(lowerQuery)
        );
        this.renderTable();
    },

    renderTable() {
        if (this.filteredExpenses.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        <i class="fas fa-inbox"></i>
                        <p>No expenses found. Click "Add Expense" to get started!</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by date (newest first)
        const sorted = [...this.filteredExpenses].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        this.elements.tableBody.innerHTML = sorted.map(expense => `
            <tr>
                <td>${this.formatDate(expense.date)}</td>
                <td>${this.escapeHtml(expense.description)}</td>
                <td><span class="badge">${this.escapeHtml(expense.category)}</span></td>
                <td class="text-danger">$${parseFloat(expense.amount).toFixed(2)}</td>
                <td class="action-btns">
                    <button class="btn-icon" onclick="ExpensesManager.editExpense(${expense.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="ExpensesManager.deleteExpense(${expense.id})" title="Delete">
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
        this.elements.modalTitle.textContent = 'Add Expense';
        this.elements.form.reset();
        this.elements.idInput.value = '';
        this.elements.dateInput.value = new Date().toISOString().split('T')[0];
        this.elements.modal.classList.remove('hidden');
        this.elements.descInput.focus();
    },

    editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        this.elements.modalTitle.textContent = 'Edit Expense';
        this.elements.idInput.value = expense.id;
        this.elements.dateInput.value = expense.date;
        this.elements.descInput.value = expense.description;
        this.elements.categoryInput.value = expense.category;
        this.elements.amountInput.value = expense.amount;
        this.elements.modal.classList.remove('hidden');
        this.elements.descInput.focus();
    },

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            // Delete from IndexedDB
            await OfflineManager.delete('expenses', id);

            // Remove from local array
            this.expenses = this.expenses.filter(e => e.id !== id);
            this.filteredExpenses = this.filteredExpenses.filter(e => e.id !== id);

            // Re-render
            this.renderTable();

            // TODO: Delete from Google Sheets if connected
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error deleting expense. Please try again.');
        }
    },

    async handleSubmit(e) {
        e.preventDefault();

        const expenseData = {
            date: this.elements.dateInput.value,
            description: this.elements.descInput.value,
            category: this.elements.categoryInput.value,
            amount: parseFloat(this.elements.amountInput.value)
        };

        const id = this.elements.idInput.value;

        try {
            if (id) {
                // Update existing
                expenseData.id = parseInt(id);
                await OfflineManager.update('expenses', expenseData);

                const index = this.expenses.findIndex(e => e.id === expenseData.id);
                if (index !== -1) {
                    this.expenses[index] = expenseData;
                }
            } else {
                // Add new
                const newId = await OfflineManager.save('expenses', expenseData);
                expenseData.id = newId;
                this.expenses.push(expenseData);
            }

            // Sync with Google Sheets if connected
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                await SheetsAPI.addExpense(expenseData);
            }

            this.filteredExpenses = [...this.expenses];
            this.renderTable();
            this.closeModal();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Error saving expense. Please try again.');
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

window.ExpensesManager = ExpensesManager;
