// ============================================
// REPORTS MODULE - Analytics & Reporting
// ============================================

const ReportsManager = {
    init() {
        this.bindEvents();
        this.setDefaultDates();
    },

    bindEvents() {
        document.getElementById('generate-report-btn')?.addEventListener('click', () => {
            this.generateReport();
        });
    },

    setDefaultDates() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');

        if (startInput) startInput.value = startOfMonth.toISOString().split('T')[0];
        if (endInput) endInput.value = today.toISOString().split('T')[0];
    },

    async generateReport() {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        // Get data
        const sales = await OfflineManager.getData('sales') || [];
        const expenses = await OfflineManager.getData('expenses') || [];

        // Filter by date range
        const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
        const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

        // Calculate totals
        const totalSales = filteredSales.reduce((sum, s) => sum + s.amount, 0);
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalSales - totalExpenses;
        const profitMargin = totalSales > 0 ? (netProfit / totalSales * 100) : 0;

        // Update UI
        document.getElementById('report-total-sales').textContent = '$' + totalSales.toFixed(2);
        document.getElementById('report-sales-count').textContent = filteredSales.length + ' transactions';
        document.getElementById('report-total-expenses').textContent = '$' + totalExpenses.toFixed(2);
        document.getElementById('report-expenses-count').textContent = filteredExpenses.length + ' entries';

        const netProfitEl = document.getElementById('report-net-profit');
        netProfitEl.textContent = '$' + netProfit.toFixed(2);
        netProfitEl.className = 'stat-value ' + (netProfit >= 0 ? 'text-success' : 'text-danger');

        document.getElementById('report-profit-margin').textContent = profitMargin.toFixed(1) + '%';

        // Top selling categories
        this.renderTopCategories(filteredSales);

        // Expense breakdown
        this.renderExpenseBreakdown(filteredExpenses, totalExpenses);
    },

    renderTopCategories(sales) {
        const container = document.getElementById('top-categories');
        if (!container) return;

        const categoryTotals = {};
        sales.forEach(sale => {
            const cat = sale.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + sale.amount;
        });

        const sorted = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-message">No data available</p>';
            return;
        }

        const maxValue = sorted[0][1];
        container.innerHTML = sorted.map(([category, amount], i) => {
            const percentage = maxValue > 0 ? (amount / maxValue * 100) : 0;
            return `
                <div class="top-item">
                    <div class="top-item-header">
                        <span class="rank">#${i + 1}</span>
                        <span class="category">${category}</span>
                        <span class="amount">$${amount.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderExpenseBreakdown(expenses, total) {
        const container = document.getElementById('expense-breakdown');
        if (!container) return;

        const categoryTotals = {};
        expenses.forEach(expense => {
            const cat = expense.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
        });

        const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-message">No data available</p>';
            return;
        }

        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#6b7280'];
        container.innerHTML = sorted.map(([category, amount], i) => {
            const percentage = total > 0 ? (amount / total * 100) : 0;
            const color = colors[i % colors.length];
            return `
                <div class="expense-item-report">
                    <div class="expense-header">
                        <span class="expense-category">
                            <span class="color-dot" style="background: ${color}"></span>
                            ${category}
                        </span>
                        <span class="expense-amount">$${amount.toFixed(2)} (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div class="expense-bar">
                        <div class="expense-fill" style="width: ${percentage}%; background: ${color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

window.ReportsManager = ReportsManager;
