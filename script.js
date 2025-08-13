class EMICalculator {
    constructor() {
        this.originalChart = null;
        this.comparisonChart = null;
        this.currentDate = new Date();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('calculate').addEventListener('click', () => this.calculateEMI());
        document.getElementById('calculate-prepayment').addEventListener('click', () => this.calculatePrepayment());
        document.getElementById('calculate-custom-emi').addEventListener('click', () => this.calculateCustomEMI());
        document.getElementById('calculate-part-payment').addEventListener('click', () => this.calculatePartPayment());
        document.getElementById('calculate-rate-change').addEventListener('click', () => this.calculateRateChange());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Set default loan start date to today
        this.setDefaultLoanStartDate();
        
        // Auto-calculate on input change
        ['principal', 'rate', 'tenure', 'loan-start-date'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.calculateEMI());
        });
        
        document.getElementById('loan-start-date').addEventListener('change', () => this.calculateEMI());

        // Add currency formatting for principal input
        document.getElementById('principal').addEventListener('input', (e) => {
            this.formatPrincipalInput(e.target);
        });

        document.getElementById('principal').addEventListener('blur', (e) => {
            this.formatPrincipalInput(e.target);
        });

        // Table controls
        document.getElementById('show-years').addEventListener('change', () => {
            this.updateTableDisplay();
        });
    }

    calculateEMI() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);

        if (!principal || !annualRate || !tenureYears) {
            document.getElementById('results').style.display = 'none';
            return;
        }

        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        const totalAmount = emi * tenureMonths;
        const totalInterest = totalAmount - principal;

        this.displayResults(emi, totalInterest, totalAmount);
        this.generateOriginalChart(principal, monthlyRate, emi, tenureMonths);
        this.displayLoanClosureInfo(tenureMonths);
        this.generateInstallmentTable('original', principal, monthlyRate, emi, tenureMonths);
        document.getElementById('results').style.display = 'block';
        document.getElementById('installment-section').style.display = 'block';
    }

    displayResults(emi, totalInterest, totalAmount) {
        document.getElementById('emi-amount').textContent = this.formatCurrency(emi);
        document.getElementById('total-interest').textContent = this.formatCurrency(totalInterest);
        document.getElementById('total-amount').textContent = this.formatCurrency(totalAmount);
    }

    calculatePrepayment() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);
        const increasePercent = parseFloat(document.getElementById('increase-percent').value);

        if (!principal || !annualRate || !tenureYears || !increasePercent) {
            return;
        }

        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        // Calculate original EMI
        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        // Calculate increased EMI
        const increasedEMI = originalEMI * (1 + increasePercent / 100);

        // Calculate new tenure with increased EMI
        const newTenureMonths = this.calculateNewTenure(principal, monthlyRate, increasedEMI);
        const newTenureYears = newTenureMonths / 12;

        // Calculate savings
        const originalTotalAmount = originalEMI * tenureMonths;
        const originalInterest = originalTotalAmount - principal;
        const newTotalAmount = increasedEMI * newTenureMonths;
        const newInterest = newTotalAmount - principal;
        const interestSavings = originalInterest - newInterest;
        const timeSavings = tenureMonths - newTenureMonths;

        this.displayPrepaymentResults({
            originalEMI,
            increasedEMI,
            originalTenure: tenureYears,
            newTenure: newTenureYears,
            interestSavings,
            timeSavings: timeSavings / 12,
            increaseAmount: increasedEMI - originalEMI
        });
    }

    calculateNewTenure(principal, monthlyRate, emi) {
        // Using logarithmic formula to find tenure
        // n = -log(1 - (P * r / EMI)) / log(1 + r)
        if (emi <= principal * monthlyRate) {
            return 999; // EMI too low, loan will never be paid off
        }

        const numerator = Math.log(1 - (principal * monthlyRate / emi));
        const denominator = Math.log(1 + monthlyRate);
        return Math.ceil(-numerator / denominator);
    }

    displayPrepaymentResults(data) {
        const resultsContainer = document.getElementById('prepayment-results');

        resultsContainer.innerHTML = `
            <div class="savings-card">
                <h3>Prepayment Benefits</h3>
                <div class="savings-grid">
                    <div class="savings-item">
                        <span class="label">New EMI</span>
                        <span class="value">${this.formatCurrency(data.increasedEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">EMI Increase</span>
                        <span class="value">${this.formatCurrency(data.increaseAmount)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New Tenure</span>
                        <span class="value">${data.newTenure.toFixed(1)} years</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Time Saved</span>
                        <span class="value">${data.timeSavings.toFixed(1)} years</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Interest Saved</span>
                        <span class="value">${this.formatCurrency(data.interestSavings)}</span>
                    </div>
                </div>
            </div>
        `;

        // Generate multiple prepayment scenarios
        this.generatePrepaymentScenarios();

        // Generate comparison chart
        this.generateComparisonChart(data);
        
        // Generate comparison table for EMI increase
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);
        const newTenureMonths = Math.ceil(data.newTenure * 12);
        this.generateInstallmentTable('comparison', principal, monthlyRate, data.increasedEMI, newTenureMonths);
    }

    generatePrepaymentScenarios() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);

        const scenarios = [5, 10, 15, 20, 25];
        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        let scenarioHTML = '<div style="margin-top: 20px;"><h3 style="color: #2c3e50; margin-bottom: 15px;">Quick Comparison</h3>';

        scenarios.forEach(percent => {
            const increasedEMI = originalEMI * (1 + percent / 100);
            const newTenureMonths = this.calculateNewTenure(principal, monthlyRate, increasedEMI);
            const interestSavings = (originalEMI * tenureMonths) - (increasedEMI * newTenureMonths);
            const timeSavings = (tenureMonths - newTenureMonths) / 12;

            scenarioHTML += `
                <div style="background: #e8f4f8; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #3498db;">
                    <strong>${percent}% EMI Increase:</strong> 
                    Save ${this.formatCurrency(interestSavings)} in interest, 
                    Complete loan ${timeSavings.toFixed(1)} years earlier
                </div>
            `;
        });

        scenarioHTML += '</div>';
        document.getElementById('prepayment-results').innerHTML += scenarioHTML;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Clear previous results
        document.getElementById('prepayment-results').innerHTML = '';
    }

    calculateCustomEMI() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const customEMI = parseFloat(document.getElementById('custom-emi').value);

        if (!principal || !annualRate || !customEMI) {
            alert('Please fill in all required fields');
            return;
        }

        const monthlyRate = annualRate / (12 * 100);

        // Calculate minimum EMI required
        const minEMI = principal * monthlyRate;

        if (customEMI <= minEMI) {
            alert(`EMI too low! Minimum EMI required: ${this.formatCurrency(minEMI)}`);
            return;
        }

        // Calculate new tenure with custom EMI
        const newTenureMonths = this.calculateNewTenure(principal, monthlyRate, customEMI);
        const newTenureYears = newTenureMonths / 12;

        // Calculate original EMI for comparison
        const originalTenure = parseFloat(document.getElementById('tenure').value);
        const originalTenureMonths = originalTenure * 12;
        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, originalTenureMonths)) /
            (Math.pow(1 + monthlyRate, originalTenureMonths) - 1);

        // Calculate savings
        const originalTotalAmount = originalEMI * originalTenureMonths;
        const originalInterest = originalTotalAmount - principal;
        const newTotalAmount = customEMI * newTenureMonths;
        const newInterest = newTotalAmount - principal;
        const interestSavings = originalInterest - newInterest;
        const timeSavings = (originalTenureMonths - newTenureMonths) / 12;
        const emiIncrease = customEMI - originalEMI;

        this.displayCustomEMIResults({
            originalEMI,
            customEMI,
            originalTenure,
            newTenure: newTenureYears,
            interestSavings,
            timeSavings,
            emiIncrease,
            newTotalAmount,
            originalTotalAmount
        });
    }

    displayCustomEMIResults(data) {
        const resultsContainer = document.getElementById('prepayment-results');

        const increasePercent = ((data.emiIncrease / data.originalEMI) * 100).toFixed(1);

        resultsContainer.innerHTML = `
            <div class="savings-card">
                <h3>Custom EMI Analysis</h3>
                <div class="savings-grid">
                    <div class="savings-item">
                        <span class="label">Original EMI</span>
                        <span class="value">${this.formatCurrency(data.originalEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Your EMI</span>
                        <span class="value">${this.formatCurrency(data.customEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">EMI Increase</span>
                        <span class="value">${this.formatCurrency(data.emiIncrease)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Increase %</span>
                        <span class="value">${increasePercent}%</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New Tenure</span>
                        <span class="value">${data.newTenure.toFixed(1)} years</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Time Saved</span>
                        <span class="value">${data.timeSavings.toFixed(1)} years</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Interest Saved</span>
                        <span class="value">${this.formatCurrency(data.interestSavings)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Total Payable</span>
                        <span class="value">${this.formatCurrency(data.newTotalAmount)}</span>
                    </div>
                </div>
            </div>
        `;

        // Add comparison summary
        const comparisonHTML = `
            <div style="margin-top: 20px; padding: 20px; background: #e8f5e8; border-radius: 10px; border-left: 4px solid #27ae60;">
                <h4 style="color: #27ae60; margin-bottom: 10px;">Summary</h4>
                <p style="margin-bottom: 8px;"><strong>Loan Duration:</strong> Reduced from ${data.originalTenure} years to ${data.newTenure.toFixed(1)} years</p>
                <p style="margin-bottom: 8px;"><strong>Monthly Increase:</strong> Pay ${this.formatCurrency(data.emiIncrease)} more per month (${increasePercent}% increase)</p>
                <p style="margin-bottom: 8px;"><strong>Total Savings:</strong> Save ${this.formatCurrency(data.interestSavings)} in interest over the loan period</p>
                <p><strong>Early Closure:</strong> Complete your loan ${data.timeSavings.toFixed(1)} years earlier</p>
            </div>
        `;

        resultsContainer.innerHTML += comparisonHTML;

        // Generate comparison chart for custom EMI
        this.generateCustomEMIComparisonChart(data);
        
        // Generate comparison table for custom EMI
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);
        const newTenureMonths = Math.ceil(data.newTenure * 12);
        this.generateInstallmentTable('comparison', principal, monthlyRate, data.customEMI, newTenureMonths);
    }

    calculatePartPayment() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);
        const partPaymentAmount = parseFloat(document.getElementById('part-payment-amount').value);
        const partPaymentMonth = parseInt(document.getElementById('part-payment-month').value);
        const partPaymentOption = document.getElementById('part-payment-option').value;

        if (!principal || !annualRate || !tenureYears || !partPaymentAmount || !partPaymentMonth) {
            alert('Please fill in all required fields');
            return;
        }

        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        // Calculate original EMI
        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        // Calculate outstanding balance at part payment month
        let outstandingBalance = principal;
        for (let month = 1; month < partPaymentMonth; month++) {
            const interestComponent = outstandingBalance * monthlyRate;
            const principalComponent = originalEMI - interestComponent;
            outstandingBalance -= principalComponent;
        }

        // Apply part payment
        const newOutstandingBalance = outstandingBalance - partPaymentAmount;
        const remainingMonths = tenureMonths - partPaymentMonth;

        let newEMI, newTenure;

        if (partPaymentOption === 'tenure') {
            // Keep EMI same, reduce tenure
            newEMI = originalEMI;
            newTenure = this.calculateNewTenure(newOutstandingBalance, monthlyRate, newEMI);
        } else {
            // Keep tenure same, reduce EMI
            newTenure = remainingMonths;
            newEMI = (newOutstandingBalance * monthlyRate * Math.pow(1 + monthlyRate, newTenure)) /
                (Math.pow(1 + monthlyRate, newTenure) - 1);
        }

        // Calculate savings
        const originalRemainingAmount = originalEMI * remainingMonths;
        const newRemainingAmount = newEMI * newTenure;
        // Interest savings is the difference in total payments minus the part payment amount
        const totalSavings = originalRemainingAmount - newRemainingAmount;
        const interestSavings = totalSavings; // This already accounts for the reduced payments
        const timeSavings = (remainingMonths - newTenure) / 12;

        this.displayPartPaymentResults({
            originalEMI,
            newEMI,
            partPaymentAmount,
            partPaymentMonth,
            originalTenure: tenureYears,
            newTenure: (partPaymentMonth + newTenure) / 12,
            interestSavings,
            timeSavings,
            outstandingBalance,
            newOutstandingBalance,
            option: partPaymentOption
        });
    }

    displayPartPaymentResults(data) {
        const resultsContainer = document.getElementById('prepayment-results');

        resultsContainer.innerHTML = `
            <div class="savings-card">
                <h3>Part Payment Impact</h3>
                <div class="savings-grid">
                    <div class="savings-item">
                        <span class="label">Part Payment</span>
                        <span class="value">${this.formatCurrency(data.partPaymentAmount)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Payment Month</span>
                        <span class="value">${data.partPaymentMonth}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Outstanding Before</span>
                        <span class="value">${this.formatCurrency(data.outstandingBalance)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Outstanding After</span>
                        <span class="value">${this.formatCurrency(data.newOutstandingBalance)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Original EMI</span>
                        <span class="value">${this.formatCurrency(data.originalEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New EMI</span>
                        <span class="value">${this.formatCurrency(data.newEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New Total Tenure</span>
                        <span class="value">${data.newTenure.toFixed(1)} years</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Interest Saved</span>
                        <span class="value">${this.formatCurrency(data.interestSavings)}</span>
                    </div>
                </div>
            </div>
        `;

        // Add summary
        const benefit = data.option === 'tenure' ?
            `Complete loan ${data.timeSavings.toFixed(1)} years earlier` :
            `Reduce EMI by ${this.formatCurrency(data.originalEMI - data.newEMI)}`;

        const summaryHTML = `
            <div style="margin-top: 20px; padding: 20px; background: #e8f5e8; border-radius: 10px; border-left: 4px solid #27ae60;">
                <h4 style="color: #27ae60; margin-bottom: 10px;">Part Payment Summary</h4>
                <p style="margin-bottom: 8px;"><strong>Strategy:</strong> ${data.option === 'tenure' ? 'Reduce loan tenure' : 'Reduce EMI amount'}</p>
                <p style="margin-bottom: 8px;"><strong>Benefit:</strong> ${benefit}</p>
                <p style="margin-bottom: 8px;"><strong>Interest Savings:</strong> ${this.formatCurrency(data.interestSavings)}</p>
                <p><strong>Total Investment:</strong> ${this.formatCurrency(data.partPaymentAmount)} part payment saves ${this.formatCurrency(data.interestSavings)} in interest</p>
            </div>
        `;

        resultsContainer.innerHTML += summaryHTML;

        // Generate comparison chart for part payment
        this.generatePartPaymentComparisonChart(data);
        
        // Generate comparison table for part payment
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);
        const newTenureMonths = Math.ceil(data.newTenure * 12);
        const specialEvents = {
            partPayment: true,
            partPaymentMonth: data.partPaymentMonth,
            partPaymentAmount: data.partPaymentAmount,
            emiChange: data.option === 'emi',
            emiChangeMonth: data.partPaymentMonth,
            newEMI: data.newEMI
        };
        this.generateInstallmentTable('comparison', principal, monthlyRate, data.originalEMI, newTenureMonths, specialEvents);
    }

    calculateRateChange() {
        const principal = this.getPrincipalValue();
        const originalRate = parseFloat(document.getElementById('rate').value);
        const newRate = parseFloat(document.getElementById('new-interest-rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);
        const rateChangeMonth = parseInt(document.getElementById('rate-change-month').value);
        const rateChangeOption = document.getElementById('rate-change-option').value;

        if (!principal || !originalRate || !newRate || !tenureYears || !rateChangeMonth) {
            alert('Please fill in all required fields');
            return;
        }

        const originalMonthlyRate = originalRate / (12 * 100);
        const newMonthlyRate = newRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        // Calculate original EMI
        const originalEMI = (principal * originalMonthlyRate * Math.pow(1 + originalMonthlyRate, tenureMonths)) /
            (Math.pow(1 + originalMonthlyRate, tenureMonths) - 1);

        // Calculate outstanding balance at rate change month
        let outstandingBalance = principal;
        for (let month = 1; month < rateChangeMonth; month++) {
            const interestComponent = outstandingBalance * originalMonthlyRate;
            const principalComponent = originalEMI - interestComponent;
            outstandingBalance -= principalComponent;
        }

        const remainingMonths = tenureMonths - rateChangeMonth;
        let newEMI, newTotalTenure;

        if (rateChangeOption === 'tenure') {
            // Keep tenure same, calculate new EMI
            newEMI = (outstandingBalance * newMonthlyRate * Math.pow(1 + newMonthlyRate, remainingMonths)) /
                (Math.pow(1 + newMonthlyRate, remainingMonths) - 1);
            newTotalTenure = tenureMonths;
        } else {
            // Keep EMI same, calculate new tenure
            newEMI = originalEMI;
            const newRemainingTenure = this.calculateNewTenure(outstandingBalance, newMonthlyRate, newEMI);
            newTotalTenure = rateChangeMonth + newRemainingTenure;
        }

        // Calculate cost comparison
        const originalTotalAmount = originalEMI * tenureMonths;
        const originalInterest = originalTotalAmount - principal;

        const newTotalAmount = (originalEMI * rateChangeMonth) + (newEMI * (newTotalTenure - rateChangeMonth));
        const newInterest = newTotalAmount - principal;

        const interestDifference = newInterest - originalInterest;
        const timeDifference = (newTotalTenure - tenureMonths) / 12;

        this.displayRateChangeResults({
            originalEMI,
            newEMI,
            originalRate,
            newRate,
            rateChangeMonth,
            originalTenure: tenureYears,
            newTenure: newTotalTenure / 12,
            originalInterest,
            newInterest,
            interestDifference,
            timeDifference,
            outstandingBalance,
            option: rateChangeOption
        });
    }

    displayRateChangeResults(data) {
        const resultsContainer = document.getElementById('prepayment-results');

        const rateDirection = data.newRate > data.originalRate ? 'increase' : 'decrease';
        const rateChange = Math.abs(data.newRate - data.originalRate);

        resultsContainer.innerHTML = `
            <div class="savings-card">
                <h3>Interest Rate Change Impact</h3>
                <div class="savings-grid">
                    <div class="savings-item">
                        <span class="label">Original Rate</span>
                        <span class="value">${data.originalRate.toFixed(2)}%</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New Rate</span>
                        <span class="value">${data.newRate.toFixed(2)}%</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Rate Change</span>
                        <span class="value">${rateDirection === 'increase' ? '+' : '-'}${rateChange.toFixed(2)}%</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Change Month</span>
                        <span class="value">${data.rateChangeMonth}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Original EMI</span>
                        <span class="value">${this.formatCurrency(data.originalEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">New EMI</span>
                        <span class="value">${this.formatCurrency(data.newEMI)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Outstanding Balance</span>
                        <span class="value">${this.formatCurrency(data.outstandingBalance)}</span>
                    </div>
                    <div class="savings-item">
                        <span class="label">Interest Impact</span>
                        <span class="value">${data.interestDifference >= 0 ? '+' : ''}${this.formatCurrency(data.interestDifference)}</span>
                    </div>
                </div>
            </div>
        `;

        // Add detailed comparison
        const impactType = data.interestDifference >= 0 ? 'increase' : 'savings';
        const impactColor = data.interestDifference >= 0 ? '#e74c3c' : '#27ae60';

        const comparisonHTML = `
            <div style="margin-top: 20px; padding: 20px; background: ${data.interestDifference >= 0 ? '#fdf2f2' : '#e8f5e8'}; border-radius: 10px; border-left: 4px solid ${impactColor};">
                <h4 style="color: ${impactColor}; margin-bottom: 10px;">Rate Change Summary</h4>
                <p style="margin-bottom: 8px;"><strong>Strategy:</strong> ${data.option === 'tenure' ? 'Keep same tenure, adjust EMI' : 'Keep same EMI, adjust tenure'}</p>
                <p style="margin-bottom: 8px;"><strong>Rate Change:</strong> ${data.originalRate.toFixed(2)}% to ${data.newRate.toFixed(2)}% after ${data.rateChangeMonth} months</p>
                <p style="margin-bottom: 8px;"><strong>EMI Change:</strong> ${this.formatCurrency(data.newEMI - data.originalEMI)} per month</p>
                <p style="margin-bottom: 8px;"><strong>Tenure Change:</strong> ${data.timeDifference >= 0 ? '+' : ''}${data.timeDifference.toFixed(1)} years</p>
                <p><strong>Total Interest ${impactType}:</strong> ${Math.abs(data.interestDifference) < 1 ? 'Minimal change' : this.formatCurrency(Math.abs(data.interestDifference))}</p>
            </div>
        `;

        resultsContainer.innerHTML += comparisonHTML;

        // Generate multiple rate scenarios
        this.generateRateScenarios();

        // Generate comparison chart for rate change
        this.generateRateChangeComparisonChart(data);
        
        // Generate comparison table for rate change
        const principal = this.getPrincipalValue();
        const newTenureMonths = Math.ceil(data.newTenure * 12);
        const specialEvents = {
            rateChange: true,
            rateChangeMonth: data.rateChangeMonth,
            newRate: data.newRate,
            emiChange: data.option === 'tenure',
            emiChangeMonth: data.rateChangeMonth,
            newEMI: data.newEMI
        };
        const originalRate = parseFloat(document.getElementById('rate').value);
        const originalMonthlyRate = originalRate / (12 * 100);
        this.generateInstallmentTable('comparison', principal, originalMonthlyRate, data.originalEMI, newTenureMonths, specialEvents);
    }

    generateRateScenarios() {
        const originalRate = parseFloat(document.getElementById('rate').value);
        const principal = this.getPrincipalValue();
        const tenureYears = parseFloat(document.getElementById('tenure').value);

        const scenarios = [-1, -0.5, -0.2, -0.1, 0.1, 0.2, 0.5, 1]; // Rate changes in percentage points
        const monthlyRate = originalRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        const originalTotalAmount = originalEMI * tenureMonths;
        const originalInterest = originalTotalAmount - principal;

        let scenarioHTML = '<div style="margin-top: 20px;"><h3 style="color: #2c3e50; margin-bottom: 15px;">Rate Change Scenarios</h3>';

        scenarios.forEach(rateChange => {
            const newRate = originalRate + rateChange;
            if (newRate > 0) {
                const newMonthlyRate = newRate / (12 * 100);
                const newEMI = (principal * newMonthlyRate * Math.pow(1 + newMonthlyRate, tenureMonths)) /
                    (Math.pow(1 + newMonthlyRate, tenureMonths) - 1);
                const newTotalAmount = newEMI * tenureMonths;
                const newInterest = newTotalAmount - principal;
                const interestDifference = newInterest - originalInterest;
                const emiDifference = newEMI - originalEMI;

                const cardColor = interestDifference >= 0 ? '#fdf2f2' : '#e8f5e8';
                const borderColor = interestDifference >= 0 ? '#e74c3c' : '#27ae60';

                scenarioHTML += `
                    <div style="background: ${cardColor}; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid ${borderColor};">
                        <strong>${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(2)}% Rate Change (${newRate.toFixed(2)}%):</strong><br>
                        EMI: ${this.formatCurrency(newEMI)} (${emiDifference >= 0 ? '+' : ''}${this.formatCurrency(emiDifference)})<br>
                        Interest Impact: ${interestDifference >= 0 ? '+' : ''}${this.formatCurrency(interestDifference)}
                    </div>
                `;
            }
        });

        scenarioHTML += '</div>';
        document.getElementById('prepayment-results').innerHTML += scenarioHTML;
    }

    generateRateChangeComparisonChart(data) {
        const principal = this.getPrincipalValue();
        const originalRate = parseFloat(document.getElementById('rate').value);
        const originalMonthlyRate = originalRate / (12 * 100);
        const newMonthlyRate = data.newRate / (12 * 100);

        const newTotalTenureMonths = Math.ceil(data.newTenure * 12);
        const chartData = this.calculateRateChangeSchedule(
            principal,
            originalMonthlyRate,
            newMonthlyRate,
            data.originalEMI,
            data.newEMI,
            data.rateChangeMonth,
            newTotalTenureMonths
        );

        console.log('Generating rate change comparison chart with:', {
            principal,
            originalRate,
            newRate: data.newRate,
            rateChangeMonth: data.rateChangeMonth,
            newTotalTenureMonths
        });

        // Ensure we have valid data
        if (chartData.dateLabels.length === 0 || newTotalTenureMonths <= 0) {
            console.error('No chart data generated for rate change comparison', { newTotalTenureMonths, chartData });
            return;
        }

        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        const ctx = document.getElementById('comparisonChart').getContext('2d');

        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.dateLabels,
                datasets: [
                    {
                        label: 'Principal Component',
                        data: chartData.principalComponents,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Interest Component',
                        data: chartData.interestComponents,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Outstanding Balance',
                        data: chartData.outstandingBalances,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: this.getChartOptions()
        });

        // Show comparison chart
        document.getElementById('comparison-chart-container').style.display = 'block';
        document.querySelector('.charts-grid').classList.add('comparison');

        // Update loan closure info
        const originalTenure = parseFloat(document.getElementById('tenure').value) * 12;
        this.displayLoanClosureInfo(originalTenure, newTotalTenureMonths);
    }

    calculateRateChangeSchedule(principal, originalMonthlyRate, newMonthlyRate, originalEMI, newEMI, rateChangeMonth, totalTenureMonths) {
        const dateLabels = [];
        const principalComponents = [];
        const interestComponents = [];
        const outstandingBalances = [];

        let outstandingBalance = principal;

        // Sample every few months for better chart readability
        const sampleInterval = Math.max(1, Math.floor(totalTenureMonths / 15));

        for (let month = 1; month <= totalTenureMonths && outstandingBalance > 1; month++) {
            let currentEMI = month <= rateChangeMonth ? originalEMI : newEMI;
            let currentRate = month <= rateChangeMonth ? originalMonthlyRate : newMonthlyRate;

            const interestComponent = outstandingBalance * currentRate;
            const principalComponent = Math.max(0, Math.min(currentEMI - interestComponent, outstandingBalance));
            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);

            if (month % sampleInterval === 0 || month === 1 || month === totalTenureMonths || month === rateChangeMonth || outstandingBalance <= 1) {
                dateLabels.push(this.getDateLabel(month));
                principalComponents.push(Math.round(principalComponent));
                interestComponents.push(Math.round(interestComponent));
                outstandingBalances.push(Math.round(outstandingBalance));
            }

            // Break if loan is paid off
            if (outstandingBalance <= 1) {
                break;
            }
        }

        return {
            dateLabels,
            principalComponents,
            interestComponents,
            outstandingBalances
        };
    }

    generateOriginalChart(principal, monthlyRate, emi, tenureMonths) {
        const chartData = this.calculateAmortizationSchedule(principal, monthlyRate, emi, tenureMonths);

        if (this.originalChart) {
            this.originalChart.destroy();
        }

        const ctx = document.getElementById('originalChart').getContext('2d');

        this.originalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.dateLabels,
                datasets: [
                    {
                        label: 'Principal Component',
                        data: chartData.principalComponents,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Interest Component',
                        data: chartData.interestComponents,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Outstanding Balance',
                        data: chartData.outstandingBalances,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: this.getChartOptions()
        });

        // Hide comparison chart
        document.getElementById('comparison-chart-container').style.display = 'none';
        document.querySelector('.charts-grid').classList.remove('comparison');
    }

    generateComparisonChart(data) {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);

        const newTenureMonths = Math.ceil(data.newTenure * 12);

        console.log('Generating comparison chart with:', {
            principal,
            monthlyRate,
            increasedEMI: data.increasedEMI,
            newTenureMonths
        });

        const chartData = this.calculateAmortizationSchedule(principal, monthlyRate, data.increasedEMI, newTenureMonths);

        console.log('Chart data generated:', chartData);

        // Ensure we have valid data
        if (chartData.dateLabels.length === 0 || newTenureMonths <= 0) {
            console.error('No chart data generated for comparison', { newTenureMonths, chartData });
            return;
        }

        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        const ctx = document.getElementById('comparisonChart').getContext('2d');

        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.dateLabels,
                datasets: [
                    {
                        label: 'Principal Component',
                        data: chartData.principalComponents,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Interest Component',
                        data: chartData.interestComponents,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Outstanding Balance',
                        data: chartData.outstandingBalances,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: this.getChartOptions()
        });

        // Show comparison chart
        document.getElementById('comparison-chart-container').style.display = 'block';
        document.querySelector('.charts-grid').classList.add('comparison');

        // Update loan closure info
        const originalTenure = parseFloat(document.getElementById('tenure').value) * 12;
        this.displayLoanClosureInfo(originalTenure, newTenureMonths);
    }

    generateCustomEMIComparisonChart(data) {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);

        const newTenureMonths = Math.ceil(data.newTenure * 12);

        console.log('Generating custom EMI comparison chart with:', {
            principal,
            monthlyRate,
            customEMI: data.customEMI,
            newTenureMonths
        });

        const chartData = this.calculateAmortizationSchedule(principal, monthlyRate, data.customEMI, newTenureMonths);

        // Ensure we have valid data
        if (chartData.dateLabels.length === 0 || newTenureMonths <= 0) {
            console.error('No chart data generated for custom EMI comparison', { newTenureMonths, chartData });
            return;
        }

        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        const ctx = document.getElementById('comparisonChart').getContext('2d');

        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.dateLabels,
                datasets: [
                    {
                        label: 'Principal Component',
                        data: chartData.principalComponents,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Interest Component',
                        data: chartData.interestComponents,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Outstanding Balance',
                        data: chartData.outstandingBalances,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: this.getChartOptions()
        });

        // Show comparison chart
        document.getElementById('comparison-chart-container').style.display = 'block';
        document.querySelector('.charts-grid').classList.add('comparison');

        // Update loan closure info
        const originalTenure = parseFloat(document.getElementById('tenure').value) * 12;
        this.displayLoanClosureInfo(originalTenure, newTenureMonths);
    }

    generatePartPaymentComparisonChart(data) {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);

        const newTenureMonths = Math.ceil(data.newTenure * 12);
        const chartData = this.calculatePartPaymentSchedule(principal, monthlyRate, data.originalEMI, data.newEMI, data.partPaymentMonth, data.partPaymentAmount, newTenureMonths);

        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        const ctx = document.getElementById('comparisonChart').getContext('2d');

        this.comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.dateLabels,
                datasets: [
                    {
                        label: 'Principal Component',
                        data: chartData.principalComponents,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Interest Component',
                        data: chartData.interestComponents,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Outstanding Balance',
                        data: chartData.outstandingBalances,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: this.getChartOptions()
        });

        // Show comparison chart
        document.getElementById('comparison-chart-container').style.display = 'block';
        document.querySelector('.charts-grid').classList.add('comparison');

        // Update loan closure info
        const originalTenure = parseFloat(document.getElementById('tenure').value) * 12;
        this.displayLoanClosureInfo(originalTenure, newTenureMonths);
    }

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Timeline'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'EMI Components (₹)'
                    },
                    ticks: {
                        callback: function (value) {
                            return '₹' + (value / 1000).toFixed(0) + 'K';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Outstanding Balance (₹)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function (value) {
                            return '₹' + (value / 100000).toFixed(1) + 'L';
                        }
                    }
                }
            }
        };
    }

    calculateAmortizationSchedule(principal, monthlyRate, emi, tenureMonths) {
        const dateLabels = [];
        const principalComponents = [];
        const interestComponents = [];
        const outstandingBalances = [];

        let outstandingBalance = principal;

        // Ensure we have valid inputs
        if (tenureMonths <= 0 || emi <= 0 || principal <= 0) {
            console.error('Invalid inputs for amortization schedule:', { principal, emi, tenureMonths });
            return { dateLabels, principalComponents, interestComponents, outstandingBalances };
        }

        // Sample every few months for better chart readability, but ensure we have at least 5 points
        const sampleInterval = Math.max(1, Math.floor(tenureMonths / 15));

        for (let month = 1; month <= tenureMonths && outstandingBalance > 1; month++) {
            const interestComponent = outstandingBalance * monthlyRate;
            const principalComponent = Math.max(0, Math.min(emi - interestComponent, outstandingBalance));
            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);

            if (month % sampleInterval === 0 || month === 1 || month === tenureMonths || outstandingBalance <= 1) {
                dateLabels.push(this.getDateLabel(month));
                principalComponents.push(Math.round(principalComponent));
                interestComponents.push(Math.round(interestComponent));
                outstandingBalances.push(Math.round(outstandingBalance));
            }

            // Break if loan is paid off
            if (outstandingBalance <= 1) {
                break;
            }
        }

        console.log('Amortization schedule calculated:', {
            tenureMonths,
            dataPoints: dateLabels.length,
            firstDate: dateLabels[0],
            lastDate: dateLabels[dateLabels.length - 1]
        });

        return {
            dateLabels,
            principalComponents,
            interestComponents,
            outstandingBalances
        };
    }

    calculatePartPaymentSchedule(principal, monthlyRate, originalEMI, newEMI, partPaymentMonth, partPaymentAmount, totalTenureMonths) {
        const dateLabels = [];
        const principalComponents = [];
        const interestComponents = [];
        const outstandingBalances = [];

        let outstandingBalance = principal;

        // Sample every 6 months for better chart readability, but ensure we have at least 10 points
        const sampleInterval = Math.max(1, Math.floor(totalTenureMonths / 20));

        for (let month = 1; month <= totalTenureMonths; month++) {
            let currentEMI = month <= partPaymentMonth ? originalEMI : newEMI;

            const interestComponent = outstandingBalance * monthlyRate;
            let principalComponent = Math.max(0, currentEMI - interestComponent);

            // Apply part payment at the specified month
            if (month === partPaymentMonth) {
                outstandingBalance = Math.max(0, outstandingBalance - partPaymentAmount);
                // Recalculate interest and principal after part payment
                const newInterestComponent = outstandingBalance * monthlyRate;
                principalComponent = Math.max(0, currentEMI - newInterestComponent);
            }

            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);

            if (month % sampleInterval === 0 || month === 1 || month === totalTenureMonths || month === partPaymentMonth) {
                dateLabels.push(this.getDateLabel(month));
                principalComponents.push(Math.round(principalComponent));
                interestComponents.push(Math.round(interestComponent));
                outstandingBalances.push(Math.round(outstandingBalance));
            }
        }

        return {
            dateLabels,
            principalComponents,
            interestComponents,
            outstandingBalances
        };
    }

    getDateLabel(monthNumber) {
        const startDate = this.getLoanStartDate();
        const installmentDate = this.getInstallmentDate(startDate, monthNumber);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${monthNames[installmentDate.getMonth()]} ${installmentDate.getFullYear()}`;
    }

    displayLoanClosureInfo(originalTenureMonths, newTenureMonths = null) {
        const loanStartDate = this.getLoanStartDate();
        const originalClosureDate = this.getInstallmentDate(loanStartDate, originalTenureMonths);

        let infoHTML = `
            <h3>Loan Closure Timeline</h3>
            <div class="closure-dates">
                <div class="closure-date-item">
                    <span class="label">Loan Start Date</span>
                    <span class="value">${loanStartDate.toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    })}</span>
                </div>
                <div class="closure-date-item">
                    <span class="label">Original Closure Date</span>
                    <span class="value">${originalClosureDate.toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    })}</span>
                </div>
        `;

        if (newTenureMonths && newTenureMonths !== originalTenureMonths) {
            const newClosureDate = this.getInstallmentDate(loanStartDate, newTenureMonths);

            const monthsSaved = originalTenureMonths - newTenureMonths;
            const yearsSaved = Math.floor(monthsSaved / 12);
            const remainingMonths = monthsSaved % 12;

            let timeSavedText = '';
            if (yearsSaved > 0) {
                timeSavedText = `${yearsSaved} year${yearsSaved > 1 ? 's' : ''}`;
                if (remainingMonths > 0) {
                    timeSavedText += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
                }
            } else {
                timeSavedText = `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
            }

            infoHTML += `
                <div class="closure-date-item">
                    <span class="label">New Closure Date</span>
                    <span class="value">${newClosureDate.toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    })}</span>
                </div>
                <div class="closure-date-item">
                    <span class="label">Time Saved</span>
                    <span class="value">${timeSavedText}</span>
                </div>
            `;
        }

        infoHTML += '</div>';
        document.getElementById('loan-closure-info').innerHTML = infoHTML;
    }

    formatPrincipalInput(input) {
        let value = input.value.replace(/,/g, '');
        if (value && !isNaN(value)) {
            // Format with Indian number system (lakhs and crores)
            const formattedValue = new Intl.NumberFormat('en-IN').format(value);
            input.value = formattedValue;
        }
    }

    getPrincipalValue() {
        const value = document.getElementById('principal').value.replace(/,/g, '');
        return parseFloat(value) || 0;
    }

    updateTableDisplay() {
        // Regenerate table with new filters
        if (this.originalTableData) {
            this.displayCombinedInstallmentTable();
        }
    }

    generateInstallmentTable(type, principal, monthlyRate, emi, tenureMonths, specialEvents = null) {
        const tableData = this.calculateDetailedSchedule(principal, monthlyRate, emi, tenureMonths, specialEvents);
        
        if (type === 'original') {
            this.originalTableData = tableData;
            this.hasComparison = false;
        } else {
            this.comparisonTableData = tableData;
            this.hasComparison = true;
        }
        
        this.displayCombinedInstallmentTable();
    }

    setDefaultLoanStartDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        document.getElementById('loan-start-date').value = defaultDate;
    }

    getLoanStartDate() {
        const dateInput = document.getElementById('loan-start-date').value;
        if (!dateInput) {
            return new Date(); // Fallback to current date
        }
        return new Date(dateInput);
    }

    calculateDetailedSchedule(principal, monthlyRate, emi, tenureMonths, specialEvents = null) {
        const schedule = [];
        let outstandingBalance = principal;
        let currentEMI = emi;
        let currentRate = monthlyRate;
        const startDate = this.getLoanStartDate();
        
        for (let month = 1; month <= tenureMonths && outstandingBalance > 1; month++) {
            const installmentDate = this.getInstallmentDate(startDate, month);
            
            // Check for special events (part payment, rate change)
            let partPayment = 0;
            let isRateChange = false;
            
            if (specialEvents) {
                if (specialEvents.partPayment && month === specialEvents.partPaymentMonth) {
                    partPayment = specialEvents.partPaymentAmount;
                }
                if (specialEvents.rateChange && month === specialEvents.rateChangeMonth) {
                    currentRate = specialEvents.newRate / (12 * 100);
                    isRateChange = true;
                }
                if (specialEvents.emiChange && month >= specialEvents.emiChangeMonth) {
                    currentEMI = specialEvents.newEMI;
                }
            }
            
            const interestComponent = outstandingBalance * currentRate;
            let principalComponent = Math.max(0, Math.min(currentEMI - interestComponent, outstandingBalance));
            
            // Apply part payment
            if (partPayment > 0) {
                outstandingBalance = Math.max(0, outstandingBalance - partPayment);
                // Recalculate after part payment
                const newInterestComponent = outstandingBalance * currentRate;
                principalComponent = Math.max(0, Math.min(currentEMI - newInterestComponent, outstandingBalance));
            }
            
            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);
            
            schedule.push({
                month,
                date: installmentDate,
                emi: currentEMI,
                principal: principalComponent,
                interest: interestComponent,
                partPayment,
                outstandingBalance,
                isRateChange,
                currentRate: currentRate * 12 * 100
            });
            
            if (outstandingBalance <= 1) break;
        }
        
        return schedule;
    }

    getInstallmentDate(startDate, monthNumber) {
        const installmentDate = new Date(startDate);
        installmentDate.setMonth(installmentDate.getMonth() + monthNumber - 1);
        
        // Handle month-end dates (e.g., if start date is Jan 31, Feb installment should be Feb 28/29)
        const originalDay = startDate.getDate();
        const lastDayOfMonth = new Date(installmentDate.getFullYear(), installmentDate.getMonth() + 1, 0).getDate();
        
        if (originalDay > lastDayOfMonth) {
            installmentDate.setDate(lastDayOfMonth);
        } else {
            installmentDate.setDate(originalDay);
        }
        
        return installmentDate;
    }

    displayCombinedInstallmentTable() {
        if (!this.originalTableData) return;
        
        const showYears = document.getElementById('show-years').value;
        const maxMonths = showYears === 'all' ? this.originalTableData.length : parseInt(showYears) * 12;
        const originalData = this.originalTableData.slice(0, maxMonths);
        const comparisonData = this.comparisonTableData ? this.comparisonTableData.slice(0, maxMonths) : null;
        
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">Date</th>
                        <th colspan="3">Original Schedule</th>
                        ${this.hasComparison ? '<th colspan="3" class="comparison-header">Optimized Schedule</th><th colspan="2" class="comparison-header">Savings</th>' : ''}
                    </tr>
                    <tr>
                        <th>Principal (₹)</th>
                        <th>Interest (₹)</th>
                        <th>Outstanding (₹)</th>
                        ${this.hasComparison ? `
                            <th class="comparison-column">Principal (₹)</th>
                            <th>Interest (₹)</th>
                            <th>Outstanding (₹)</th>
                            <th class="comparison-column">Interest Diff (₹)</th>
                            <th>Outstanding Diff (₹)</th>
                        ` : ''}
                    </tr>
                </thead>
                <tbody>
        `;
        
        let currentYear = 0;
        let yearlyOriginalPrincipal = 0;
        let yearlyOriginalInterest = 0;
        let yearlyComparisonPrincipal = 0;
        let yearlyComparisonInterest = 0;
        
        originalData.forEach((originalRow, index) => {
            const year = originalRow.date.getFullYear();
            const comparisonRow = comparisonData && comparisonData[index] ? comparisonData[index] : null;
            
            // Add year header
            if (year !== currentYear) {
                if (currentYear !== 0) {
                    // Add yearly total
                    const yearlyInterestSavings = yearlyOriginalInterest - yearlyComparisonInterest;
                    tableHTML += `
                        <tr class="year-total">
                            <td><strong>${currentYear} Total</strong></td>
                            <td class="currency"><strong>${this.formatCurrency(yearlyOriginalPrincipal)}</strong></td>
                            <td class="currency"><strong>${this.formatCurrency(yearlyOriginalInterest)}</strong></td>
                            <td></td>
                            ${this.hasComparison ? `
                                <td class="currency comparison-column"><strong>${this.formatCurrency(yearlyComparisonPrincipal)}</strong></td>
                                <td class="currency"><strong>${this.formatCurrency(yearlyComparisonInterest)}</strong></td>
                                <td></td>
                                <td class="currency comparison-column ${yearlyInterestSavings >= 0 ? 'savings-positive' : 'savings-negative'}">
                                    <strong>${yearlyInterestSavings >= 0 ? '+' : ''}${this.formatCurrency(yearlyInterestSavings)}</strong>
                                </td>
                                <td></td>
                            ` : ''}
                        </tr>
                    `;
                }
                
                currentYear = year;
                yearlyOriginalPrincipal = 0;
                yearlyOriginalInterest = 0;
                yearlyComparisonPrincipal = 0;
                yearlyComparisonInterest = 0;
                
                const colspan = this.hasComparison ? 9 : 4;
                tableHTML += `
                    <tr class="year-header">
                        <td colspan="${colspan}"><strong>${year}</strong></td>
                    </tr>
                `;
            }
            
            yearlyOriginalPrincipal += originalRow.principal;
            yearlyOriginalInterest += originalRow.interest;
            
            if (comparisonRow) {
                yearlyComparisonPrincipal += comparisonRow.principal;
                yearlyComparisonInterest += comparisonRow.interest;
            }
            
            const rowClass = originalRow.partPayment > 0 || (comparisonRow && comparisonRow.partPayment > 0) ? 'part-payment-row' : 
                           originalRow.isRateChange || (comparisonRow && comparisonRow.isRateChange) ? 'rate-change-row' : '';
            
            // Calculate differences
            const interestDiff = comparisonRow ? originalRow.interest - comparisonRow.interest : 0;
            const outstandingDiff = comparisonRow ? originalRow.outstandingBalance - comparisonRow.outstandingBalance : 0;
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td>${originalRow.date.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        year: '2-digit' 
                    })}</td>
                    <td class="currency">${this.formatCurrency(originalRow.principal)}</td>
                    <td class="currency">${this.formatCurrency(originalRow.interest)}</td>
                    <td class="currency">${this.formatCurrency(originalRow.outstandingBalance)}</td>
                    ${this.hasComparison && comparisonRow ? `
                        <td class="currency comparison-column">${this.formatCurrency(comparisonRow.principal)}</td>
                        <td class="currency">${this.formatCurrency(comparisonRow.interest)}</td>
                        <td class="currency">${this.formatCurrency(comparisonRow.outstandingBalance)}</td>
                        <td class="currency comparison-column ${interestDiff >= 0 ? 'savings-positive' : 'savings-negative'}">
                            ${interestDiff !== 0 ? (interestDiff >= 0 ? '+' : '') + this.formatCurrency(interestDiff) : '-'}
                        </td>
                        <td class="currency ${outstandingDiff >= 0 ? 'savings-positive' : 'savings-negative'}">
                            ${outstandingDiff !== 0 ? (outstandingDiff >= 0 ? '+' : '') + this.formatCurrency(outstandingDiff) : '-'}
                        </td>
                    ` : this.hasComparison ? `
                        <td class="comparison-column">-</td>
                        <td>-</td>
                        <td>-</td>
                        <td class="comparison-column">-</td>
                        <td>-</td>
                    ` : ''}
                </tr>
            `;
        });
        
        // Add final year total
        if (currentYear !== 0) {
            const yearlyInterestSavings = yearlyOriginalInterest - yearlyComparisonInterest;
            tableHTML += `
                <tr class="year-total">
                    <td><strong>${currentYear} Total</strong></td>
                    <td class="currency"><strong>${this.formatCurrency(yearlyOriginalPrincipal)}</strong></td>
                    <td class="currency"><strong>${this.formatCurrency(yearlyOriginalInterest)}</strong></td>
                    <td></td>
                    ${this.hasComparison ? `
                        <td class="currency comparison-column"><strong>${this.formatCurrency(yearlyComparisonPrincipal)}</strong></td>
                        <td class="currency"><strong>${this.formatCurrency(yearlyComparisonInterest)}</strong></td>
                        <td></td>
                        <td class="currency comparison-column ${yearlyInterestSavings >= 0 ? 'savings-positive' : 'savings-negative'}">
                            <strong>${yearlyInterestSavings >= 0 ? '+' : ''}${this.formatCurrency(yearlyInterestSavings)}</strong>
                        </td>
                        <td></td>
                    ` : ''}
                </tr>
            `;
        }
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        document.getElementById('installment-table').innerHTML = tableHTML;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EMICalculator();
});