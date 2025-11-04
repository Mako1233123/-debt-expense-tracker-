// Initialize app data
let appData = {
    salary: 18000,
    initialDebt: 150000,
    expenses: [],
    debtPayments: []
};

// Chart instances
let budgetChart = null;
let categoryChart = null;

// DOM elements
const navTabs = document.querySelectorAll('.nav-tab');
const sections = document.querySelectorAll('.section');
const expenseForm = document.getElementById('expense-form');
const makePaymentBtn = document.getElementById('make-payment');
const resetMonthBtn = document.getElementById('reset-month');
const clearAllBtn = document.getElementById('clear-all');
const editSalaryBtn = document.getElementById('edit-salary');
const editDebtBtn = document.getElementById('edit-debt');
const notification = document.getElementById('notification');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    try {
        loadData();
        updateDashboard();
        updateExpenseSummary();
        updateDebtPaymentSection();
        setupEventListeners();
        setDefaultDates();
        updateRecentExpenses();
        setupCharts();
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing application', 'error');
    }
});

// Set default dates to today
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('payment-date').value = today;
}

// Load data from localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('debtExpenseTracker');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Validate loaded data
            if (isValidAppData(parsedData)) {
                appData = parsedData;
            } else {
                console.warn('Invalid data in localStorage, using defaults');
                showNotification('Loaded data was invalid, using default values', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading saved data', 'error');
    }
}

// Validate app data structure
function isValidAppData(data) {
    return data && 
            typeof data.salary === 'number' && 
            typeof data.initialDebt === 'number' &&
            Array.isArray(data.expenses) &&
            Array.isArray(data.debtPayments);
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('debtExpenseTracker', JSON.stringify(appData));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data to storage', 'error');
        return false;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('i');
    const title = notification.querySelector('.notification-title');
    const messageEl = notification.querySelector('.notification-message');
    
    notification.className = `notification ${type}`;
    title.textContent = type === 'success' ? 'Success' : 'Error';
    messageEl.textContent = message;
    
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Validate expense data
function validateExpense(expense) {
    if (!expense.category || !expense.amount || !expense.date) {
        return 'All required fields must be filled';
    }
    
    if (expense.amount <= 0) {
        return 'Amount must be greater than 0';
    }
    
    const expenseDate = new Date(expense.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (expenseDate > today) {
        return 'Expense date cannot be in the future';
    }
    
    return null;
}

// Validate payment data
function validatePayment(payment) {
    if (!payment.amount || !payment.date) {
        return 'All required fields must be filled';
    }
    
    if (payment.amount <= 0) {
        return 'Amount must be greater than 0';
    }
    
    const paymentDate = new Date(payment.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (paymentDate > today) {
        return 'Payment date cannot be in the future';
    }
    
    return null;
}

// Setup event listeners
function setupEventListeners() {
    // Navigation tabs
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            
            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                    // Update charts when switching to dashboard
                    if (targetId === 'dashboard') {
                        setTimeout(() => {
                            updateCharts();
                        }, 100);
                    }
                }
            });
        });
    });

    // Add expense form
    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<div class="loading"></div> Adding...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            try {
                const category = document.getElementById('category').value;
                const amount = parseFloat(document.getElementById('amount').value);
                const date = document.getElementById('date').value;
                const description = document.getElementById('description').value.trim();
                
                const expense = {
                    id: Date.now(),
                    category,
                    amount,
                    date,
                    description
                };
                
                const validationError = validateExpense(expense);
                if (validationError) {
                    showNotification(validationError, 'error');
                    return;
                }
                
                appData.expenses.push(expense);
                
                if (saveData()) {
                    updateDashboard();
                    updateExpenseSummary();
                    updateRecentExpenses();
                    
                    // Reset form
                    expenseForm.reset();
                    setDefaultDates();
                    
                    showNotification('Expense added successfully!');
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                showNotification('Error adding expense', 'error');
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }, 500);
    });

    // Quick add buttons
    document.querySelectorAll('.quick-actions .btn').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const amount = this.getAttribute('data-amount');
            
            document.getElementById('category').value = category;
            document.getElementById('amount').value = amount;
            document.getElementById('description').focus();
        });
    });

    // Make debt payment
    makePaymentBtn.addEventListener('click', function() {
        const originalText = this.innerHTML;
        
        // Show loading state
        this.innerHTML = '<div class="loading"></div> Processing...';
        this.disabled = true;
        
        setTimeout(() => {
            try {
                const amount = parseFloat(document.getElementById('payment-amount').value);
                const date = document.getElementById('payment-date').value;
                
                const payment = {
                    id: Date.now(),
                    amount,
                    date
                };
                
                const validationError = validatePayment(payment);
                if (validationError) {
                    showNotification(validationError, 'error');
                    return;
                }
                
                appData.debtPayments.push(payment);
                
                if (saveData()) {
                    updateDashboard();
                    updateDebtPaymentSection();
                    
                    // Reset form
                    document.getElementById('payment-amount').value = 2500;
                    setDefaultDates();
                    
                    showNotification('Payment recorded successfully!');
                }
            } catch (error) {
                console.error('Error recording payment:', error);
                showNotification('Error recording payment', 'error');
            } finally {
                // Restore button state
                this.innerHTML = originalText;
                this.disabled = false;
            }
        }, 500);
    });

    // Reset month
    resetMonthBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset this month? This will clear all expenses and debt payments for the current month.')) {
            appData.expenses = [];
            appData.debtPayments = [];
            
            if (saveData()) {
                updateDashboard();
                updateExpenseSummary();
                updateDebtPaymentSection();
                updateRecentExpenses();
                showNotification('Month reset successfully!');
            }
        }
    });

    // Clear all data
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            appData = {
                salary: 18000,
                initialDebt: 150000,
                expenses: [],
                debtPayments: []
            };
            
            if (saveData()) {
                updateDashboard();
                updateExpenseSummary();
                updateDebtPaymentSection();
                updateRecentExpenses();
                showNotification('All data cleared!');
            }
        }
    });

    // Edit salary
    editSalaryBtn.addEventListener('click', function() {
        const newSalary = prompt('Enter new monthly salary:', appData.salary);
        if (newSalary !== null) {
            const salaryValue = parseFloat(newSalary);
            if (!isNaN(salaryValue) && salaryValue > 0) {
                appData.salary = salaryValue;
                
                if (saveData()) {
                    updateDashboard();
                    showNotification('Salary updated successfully!');
                }
            } else {
                showNotification('Please enter a valid salary amount', 'error');
            }
        }
    });

    // Edit debt
    editDebtBtn.addEventListener('click', function() {
        const newDebt = prompt('Enter new initial debt amount:', appData.initialDebt);
        if (newDebt !== null) {
            const debtValue = parseFloat(newDebt);
            if (!isNaN(debtValue) && debtValue >= 0) {
                appData.initialDebt = debtValue;
                
                if (saveData()) {
                    updateDashboard();
                    showNotification('Debt amount updated successfully!');
                }
            } else {
                showNotification('Please enter a valid debt amount', 'error');
            }
        }
    });

    // Export data
    document.getElementById('export-data').addEventListener('click', function() {
        try {
            const dataStr = JSON.stringify(appData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'debt-expense-data.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            showNotification('Data exported successfully!');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Error exporting data', 'error');
        }
    });

    // Print report
    document.getElementById('print-report').addEventListener('click', function() {
        window.print();
    });

    // Handle window resize for charts
    window.addEventListener('resize', function() {
        updateCharts();
    });
}

// Setup charts
function setupCharts() {
    // Budget chart
    const budgetCtx = document.getElementById('budget-chart').getContext('2d');
    budgetChart = new Chart(budgetCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#606c38',
                    '#dda15e', 
                    '#a7c957'
                ],
                borderWidth: 2,
                borderColor: '#fefae0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₱${context.parsed.toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });

    // Category chart
    const categoryCtx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount (₱)',
                data: [],
                backgroundColor: '#606c38',
                borderColor: '#283618',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₱${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Update charts
function updateCharts() {
    updateBudgetChart();
    updateCategoryChart();
}

// Update dashboard with current data
function updateDashboard() {
    try {
        // Calculate totals
        const totalExpenses = appData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalDebtPaid = appData.debtPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingDebt = Math.max(0, appData.initialDebt - totalDebtPaid);
        const remainingBudget = Math.max(0, appData.salary - totalExpenses - totalDebtPaid);
        
        // Update display
        document.getElementById('salary-display').textContent = `₱${appData.salary.toLocaleString()}`;
        document.getElementById('total-expenses').textContent = `₱${totalExpenses.toLocaleString()}`;
        document.getElementById('remaining-debt').textContent = `₱${remainingDebt.toLocaleString()}`;
        document.getElementById('remaining-budget').textContent = `₱${remainingBudget.toLocaleString()}`;
        
        // Update debt progress
        const debtPaidPercentage = appData.initialDebt > 0 ? (totalDebtPaid / appData.initialDebt) * 100 : 0;
        document.getElementById('debt-progress-bar').style.width = `${debtPaidPercentage}%`;
        document.getElementById('debt-paid').textContent = totalDebtPaid.toLocaleString();
        document.getElementById('debt-remaining').textContent = remainingDebt.toLocaleString();
        
        // Update charts
        updateCharts();
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Error updating dashboard', 'error');
    }
}

// Update expense summary section
function updateExpenseSummary() {
    try {
        const expensesTable = document.getElementById('expenses-table').querySelector('tbody');
        const categoryBreakdown = document.getElementById('category-breakdown');
        
        // Clear existing data
        expensesTable.innerHTML = '';
        categoryBreakdown.innerHTML = '';
        
        // Add expenses to table
        if (appData.expenses.length === 0) {
            expensesTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No expenses recorded yet.</td></tr>';
        } else {
            // Sort expenses by date (newest first)
            const sortedExpenses = [...appData.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            sortedExpenses.forEach(expense => {
                const row = document.createElement('tr');
                // Sanitize description to prevent XSS
                const safeDescription = expense.description ? 
                    expense.description.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-';
                    
                row.innerHTML = `
                    <td>${formatDate(expense.date)}</td>
                    <td>${expense.category}</td>
                    <td>₱${expense.amount.toLocaleString()}</td>
                    <td title="${safeDescription}">${safeDescription}</td>
                    <td>
                        <button class="btn btn-danger delete-expense" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                expensesTable.appendChild(row);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-expense').forEach(button => {
                button.addEventListener('click', function() {
                    const expenseId = parseInt(this.getAttribute('data-id'));
                    if (confirm('Are you sure you want to delete this expense?')) {
                        appData.expenses = appData.expenses.filter(expense => expense.id !== expenseId);
                        
                        if (saveData()) {
                            updateDashboard();
                            updateExpenseSummary();
                            updateRecentExpenses();
                            showNotification('Expense deleted successfully!');
                        }
                    }
                });
            });
        }
        
        // Calculate category breakdown
        const categories = {};
        appData.expenses.forEach(expense => {
            if (categories[expense.category]) {
                categories[expense.category] += expense.amount;
            } else {
                categories[expense.category] = expense.amount;
            }
        });
        
        // Display category breakdown
        if (Object.keys(categories).length === 0) {
            categoryBreakdown.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><h3>No expenses to categorize</h3><p>Add some expenses to see your spending breakdown</p></div>';
        } else {
            const colors = {
                'Food': '#606c38',
                'Travel': '#283618',
                'Utilities': '#dda15e',
                'WiFi': '#bc6c25',
                'Laundry': '#a7c957',
                'Others': '#8a9a5b'
            };
            
            for (const [category, amount] of Object.entries(categories)) {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.innerHTML = `
                    <div class="category-info">
                        <div class="category-color" style="background-color: ${colors[category] || '#606c38'}"></div>
                        <div class="category-name">${category}</div>
                    </div>
                    <div class="category-amount">₱${amount.toLocaleString()}</div>
                `;
                categoryBreakdown.appendChild(categoryItem);
            }
        }
    } catch (error) {
        console.error('Error updating expense summary:', error);
        showNotification('Error updating expense summary', 'error');
    }
}

// Update recent expenses in Add Expense section
function updateRecentExpenses() {
    try {
        const recentExpenses = document.getElementById('recent-expenses');
        
        // Clear existing data
        recentExpenses.innerHTML = '';
        
        // Get last 3 expenses
        const recent = [...appData.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        
        if (recent.length === 0) {
            recentExpenses.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No recent expenses</p></div>';
        } else {
            recent.forEach(expense => {
                const expenseEl = document.createElement('div');
                expenseEl.className = 'category-item';
                expenseEl.innerHTML = `
                    <div class="category-info">
                        <div class="category-name">${expense.category}</div>
                    </div>
                    <div class="category-amount">₱${expense.amount.toLocaleString()}</div>
                `;
                recentExpenses.appendChild(expenseEl);
            });
        }
    } catch (error) {
        console.error('Error updating recent expenses:', error);
    }
}

// Update debt payment section
function updateDebtPaymentSection() {
    try {
        const paymentHistory = document.getElementById('payment-history').querySelector('tbody');
        
        // Clear existing data
        paymentHistory.innerHTML = '';
        
        // Add payments to table
        if (appData.debtPayments.length === 0) {
            paymentHistory.innerHTML = '<tr><td colspan="3" style="text-align: center;">No payments recorded yet.</td></tr>';
        } else {
            // Sort payments by date (newest first)
            const sortedPayments = [...appData.debtPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            sortedPayments.forEach(payment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(payment.date)}</td>
                    <td>₱${payment.amount.toLocaleString()}</td>
                    <td>
                        <button class="btn btn-danger delete-payment" data-id="${payment.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                paymentHistory.appendChild(row);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-payment').forEach(button => {
                button.addEventListener('click', function() {
                    const paymentId = parseInt(this.getAttribute('data-id'));
                    if (confirm('Are you sure you want to delete this payment?')) {
                        appData.debtPayments = appData.debtPayments.filter(payment => payment.id !== paymentId);
                        
                        if (saveData()) {
                            updateDashboard();
                            updateDebtPaymentSection();
                            showNotification('Payment deleted successfully!');
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error updating debt payment section:', error);
        showNotification('Error updating payment history', 'error');
    }
}

// Update budget chart
function updateBudgetChart() {
    if (!budgetChart) return;
    
    try {
        const legendContainer = document.getElementById('budget-legend');
        
        // Clear legend
        legendContainer.innerHTML = '';
        
        // Calculate budget distribution
        const totalExpenses = appData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalDebtPaid = appData.debtPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingBudget = Math.max(0, appData.salary - totalExpenses - totalDebtPaid);
        
        const data = [
            { label: 'Expenses', value: totalExpenses, color: '#606c38' },
            { label: 'Debt Payment', value: totalDebtPaid, color: '#dda15e' },
            { label: 'Remaining', value: remainingBudget, color: '#a7c957' }
        ];
        
        // Filter out zero values
        const filteredData = data.filter(item => item.value > 0);
        
        // Update chart data
        budgetChart.data.labels = filteredData.map(item => item.label);
        budgetChart.data.datasets[0].data = filteredData.map(item => item.value);
        budgetChart.data.datasets[0].backgroundColor = filteredData.map(item => item.color);
        
        // Update legend
        filteredData.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${item.color}"></div>
                <span>${item.label}: ₱${item.value.toLocaleString()}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
        
        budgetChart.update();
    } catch (error) {
        console.error('Error updating budget chart:', error);
    }
}

// Update category chart
function updateCategoryChart() {
    if (!categoryChart) return;
    
    try {
        // Calculate category totals
        const categories = {};
        appData.expenses.forEach(expense => {
            if (categories[expense.category]) {
                categories[expense.category] += expense.amount;
            } else {
                categories[expense.category] = expense.amount;
            }
        });
        
        // Update chart data
        categoryChart.data.labels = Object.keys(categories);
        categoryChart.data.datasets[0].data = Object.values(categories);
        
        categoryChart.update();
    } catch (error) {
        console.error('Error updating category chart:', error);
    }
}

// Format date for display
function formatDate(dateString) {
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
        return 'Invalid Date';
    }
}