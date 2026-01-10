// ============================================
// DASHBOARD MODULE - Analytics & Charts
// ============================================

const Dashboard = {
    charts: {
        revenue: null,
        expense: null
    },

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.updateStats();
        this.initCharts();
    },

    cacheElements() {
        this.elements = {
            totalSales: document.getElementById('total-sales'),
            totalExpenses: document.getElementById('total-expenses'),
            netProfit: document.getElementById('net-profit'),
            totalTransactions: document.getElementById('total-transactions'),
            salesChange: document.getElementById('sales-change'),
            expensesChange: document.getElementById('expenses-change'),
            profitChange: document.getElementById('profit-change'),
            periodSelector: document.getElementById('period-selector'),
            revenueChart: document.getElementById('revenue-chart'),
            expenseChart: document.getElementById('expense-chart')
        };
    },

    attachEventListeners() {
        this.elements.periodSelector.addEventListener('change', () => {
            this.updateStats();
            this.updateCharts();
        });
    },

    async updateStats() {
        try {
            const period = parseInt(this.elements.periodSelector.value);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - period);

            // Get data
            const sales = window.SalesManager ? window.SalesManager.sales : [];
            const expenses = window.ExpensesManager ? window.ExpensesManager.expenses : [];

            // Filter by period
            const filteredSales = sales.filter(s => new Date(s.date) >= cutoffDate);
            const filteredExpenses = expenses.filter(e => new Date(e.date) >= cutoffDate);

            // Calculate totals (Period)
            const totalSales = filteredSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const netProfit = totalSales - totalExpenses;

            // Get other data for Mini Analytics & Grand Total
            const tenders = window.TendersManager ? window.TendersManager.tenders : [];
            const services = window.ServicesManager ? window.ServicesManager.services : [];

            // Tenders Stats (All Time)
            const wonTenders = tenders.filter(t => t.status === 'won');
            const totalWonTenders = wonTenders.reduce((sum, t) => sum + (t.awardAmount || t.bidAmount || 0), 0);

            // Services Stats (Active)
            const activeServices = services.filter(s => s.status !== 'Delivered' && s.status !== 'Completed');
            const activeServicesValue = activeServices.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

            // Services Revenue (All Time - for Grand Total context, approximated by Sales usually, but let's count only distinct service records if not linked to sales)
            // Note: Ideally Services should generate Sales records when paid. For now, we'll assume Grand Total = All Time Sales + All Time Won Tenders.
            const allTimeSales = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            const grandTotal = allTimeSales + totalWonTenders;

            // Update UI
            if (document.getElementById('grand-total-revenue')) {
                document.getElementById('grand-total-revenue').textContent = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            // Grand Total Expenses (All Time Expenses + Tender Expenses)
            const allTimeExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const tenderExpenses = tenders.reduce((sum, t) => {
                return sum + (t.expenses ? t.expenses.reduce((s, e) => s + e.amount, 0) : 0);
            }, 0);
            const grandTotalExpenses = allTimeExpenses + tenderExpenses;

            if (document.getElementById('grand-total-expenses')) {
                document.getElementById('grand-total-expenses').textContent = `$${grandTotalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            // Update Mini Analytics
            if (document.getElementById('dash-tender-value')) {
                document.getElementById('dash-tender-value').textContent = `$${totalWonTenders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('dash-tender-count').textContent = `${wonTenders.length} Won`;
            }

            if (document.getElementById('dash-service-count')) {
                document.getElementById('dash-service-count').textContent = activeServices.length;
                document.getElementById('dash-service-value').textContent = `Est. $${activeServicesValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            this.elements.totalSales.textContent = `$${totalSales.toFixed(2)}`;
            this.elements.totalExpenses.textContent = `$${totalExpenses.toFixed(2)}`;
            this.elements.netProfit.textContent = `$${netProfit.toFixed(2)}`;
            this.elements.totalTransactions.textContent =
                (filteredSales.length + filteredExpenses.length).toString();

            // Calculate changes (compared to previous period)
            const prevCutoff = new Date(cutoffDate);
            prevCutoff.setDate(prevCutoff.getDate() - period);

            const prevSales = sales.filter(s => {
                const d = new Date(s.date);
                return d >= prevCutoff && d < cutoffDate;
            });
            const prevExpenses = expenses.filter(e => {
                const d = new Date(e.date);
                return d >= prevCutoff && d < cutoffDate;
            });

            const prevTotalSales = prevSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const prevNetProfit = prevTotalSales - prevTotalExpenses;

            // Calculate percentages
            const salesChange = prevTotalSales > 0
                ? ((totalSales - prevTotalSales) / prevTotalSales * 100).toFixed(1)
                : 0;
            const expensesChange = prevTotalExpenses > 0
                ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses * 100).toFixed(1)
                : 0;
            const profitChange = prevNetProfit !== 0
                ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit) * 100).toFixed(1)
                : 0;

            // Update change indicators
            this.updateChangeIndicator(this.elements.salesChange, salesChange, true);
            this.updateChangeIndicator(this.elements.expensesChange, expensesChange, false);
            this.updateChangeIndicator(this.elements.profitChange, profitChange, true);

            // Update charts if they exist
            this.updateCharts();
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    },

    updateChangeIndicator(element, change, positiveIsGood) {
        const absChange = Math.abs(change);
        const isPositive = change >= 0;

        element.className = 'stat-change';

        if (isPositive === positiveIsGood) {
            element.classList.add('positive');
            element.innerHTML = `<i class="fas fa-arrow-up"></i> ${absChange}%`;
        } else if (change === 0) {
            element.innerHTML = `<i class="fas fa-minus"></i> ${absChange}%`;
        } else {
            element.classList.add('negative');
            element.innerHTML = `<i class="fas fa-arrow-down"></i> ${absChange}%`;
        }
    },

    initCharts() {
        // Revenue Chart (Line)
        const revenueCtx = this.elements.revenueChart.getContext('2d');
        this.charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sales',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Expenses',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#cbd5e1' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    }
                }
            }
        });

        // Revenue vs Expense Comparison Chart
        const expenseCtx = this.elements.expenseChart.getContext('2d');
        this.charts.expense = new Chart(expenseCtx, {
            type: 'doughnut',
            data: {
                labels: ['Total Revenue', 'Total Expenses'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        '#10b981', // Emerald (Revenue)
                        '#ef4444'  // Red (Expense)
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', padding: 20, font: { family: 'Inter', size: 12 } }
                    }
                }
            }
        });

        this.updateCharts();
    },

    updateCharts() {
        const period = parseInt(this.elements.periodSelector.value);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - period);

        // Get data
        const sales = window.SalesManager ? window.SalesManager.sales : [];
        const expenses = window.ExpensesManager ? window.ExpensesManager.expenses : [];

        // Filter by period
        const filteredSales = sales.filter(s => new Date(s.date) >= cutoffDate);
        const filteredExpenses = expenses.filter(e => new Date(e.date) >= cutoffDate);

        // Update revenue chart
        this.updateRevenueChart(filteredSales, filteredExpenses, period);

        // Update expense categories chart
        this.updateExpenseChart(filteredExpenses);
    },

    updateRevenueChart(sales, expenses, period) {
        // Generate date labels
        const labels = [];
        const salesData = [];
        const expensesData = [];

        const buckets = period <= 30 ? period : 12; // Daily for 30 days, monthly for longer
        const now = new Date();

        for (let i = buckets - 1; i >= 0; i--) {
            const date = new Date(now);

            if (period <= 30) {
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                const dayStr = date.toISOString().split('T')[0];
                const daySales = sales.filter(s => s.date === dayStr)
                    .reduce((sum, s) => sum + parseFloat(s.amount), 0);
                const dayExpenses = expenses.filter(e => e.date === dayStr)
                    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

                salesData.push(daySales);
                expensesData.push(dayExpenses);
            } else {
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

                const monthSales = sales.filter(s => {
                    const sDate = new Date(s.date);
                    return sDate.getMonth() === date.getMonth() &&
                        sDate.getFullYear() === date.getFullYear();
                }).reduce((sum, s) => sum + parseFloat(s.amount), 0);

                const monthExpenses = expenses.filter(e => {
                    const eDate = new Date(e.date);
                    return eDate.getMonth() === date.getMonth() &&
                        eDate.getFullYear() === date.getFullYear();
                }).reduce((sum, e) => sum + parseFloat(e.amount), 0);

                salesData.push(monthSales);
                expensesData.push(monthExpenses);
            }
        }

        this.charts.revenue.data.labels = labels;
        this.charts.revenue.data.datasets[0].data = salesData;
        this.charts.revenue.data.datasets[1].data = expensesData;
        this.charts.revenue.update();
    },

    updateExpenseChart() {
        // Calculate Total Revenue (All Time: Sales + Won Tenders)
        const sales = window.SalesManager ? window.SalesManager.sales : [];
        const tenders = window.TendersManager ? window.TendersManager.tenders : [];

        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const wonTenders = tenders.filter(t => t.status === 'won');
        const tenderRevenue = wonTenders.reduce((sum, t) => sum + (parseFloat(t.awardAmount) || parseFloat(t.bidAmount) || 0), 0);
        const grandTotalRevenue = totalSales + tenderRevenue;

        // Calculate Total Expenses (All Time: Expenses + Tender Expenses)
        const expenses = window.ExpensesManager ? window.ExpensesManager.expenses : [];

        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const tenderExpenses = tenders.reduce((sum, t) => {
            return sum + (t.expenses ? t.expenses.reduce((s, e) => s + e.amount, 0) : 0);
        }, 0);
        const grandTotalExpenses = totalExpenses + tenderExpenses;

        this.charts.expense.data.datasets[0].data = [grandTotalRevenue, grandTotalExpenses];
        this.charts.expense.update();
    }
};

window.Dashboard = Dashboard;
