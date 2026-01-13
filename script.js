class EMICalculator {
    constructor() {
        this.originalChart = null;
        this.comparisonChart = null;
        this.currentDate = new Date();
        this.advancedEvents = {
            partPayments: [],
            rateChanges: [],
            emiChanges: []
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Initialize theme
        this.initializeTheme();
        
        document.getElementById('calculate').addEventListener('click', () => this.calculateEMI());

        
        // Advanced scenarios
        document.getElementById('add-part-payment').addEventListener('click', () => this.addPartPaymentEvent());
        document.getElementById('add-rate-change').addEventListener('click', () => this.addRateChangeEvent());
        document.getElementById('add-emi-change').addEventListener('click', () => this.addEmiChangeEvent());
        document.getElementById('add-gradual-increase').addEventListener('click', () => this.addGradualIncrease());
        document.getElementById('calculate-advanced-scenario').addEventListener('click', () => this.calculateAdvancedScenario());
        document.getElementById('clear-all-events').addEventListener('click', () => this.clearAllEvents());
        
        // Set default gradual increase start date
        this.setDefaultGradualStartDate();



        // Set default loan start date to today
        this.setDefaultLoanStartDate();
        
        // Auto-calculate with default values
        setTimeout(() => {
            this.calculateEMI();
            this.hideCalculateButton();
        }, 100);
        
        // Auto-calculate on input change and manage button visibility
        ['principal', 'rate', 'tenure', 'loan-start-date'].forEach(id => {
            const element = document.getElementById(id);
            element.addEventListener('input', () => {
                this.calculateEMI();
                this.hideCalculateButton();
            });
            element.addEventListener('focus', () => this.hideCalculateButton());
        });
        
        document.getElementById('loan-start-date').addEventListener('change', () => {
            this.calculateEMI();
            this.hideCalculateButton();
        });

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
        
        // Show the loan amortization section for regular calculations
        document.querySelector('.chart-section h2').style.display = 'block';
        document.getElementById('loan-closure-info').style.display = 'block';
        
        // Hide optimized strategy results when calculating regular EMI
        const prepaymentResults = document.getElementById('prepayment-results');
        if (prepaymentResults) {
            prepaymentResults.innerHTML = '';
        }
        

        
        // Reset comparison data and hide comparison chart
        this.hasComparison = false;
        this.comparisonTableData = null;
        document.getElementById('comparison-chart-container').style.display = 'none';
        document.querySelector('.charts-grid').classList.remove('comparison');
        
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

            const monthlyIncrease = increasedEMI - originalEMI;
            const totalSavings = interestSavings;
            const roi = ((totalSavings / (monthlyIncrease * newTenureMonths)) * 100);
            
            scenarioHTML += `
                <div style="background: #e8f4f8; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #3498db;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 8px;">
                        <div>
                            <strong>${percent}% EMI Increase</strong><br>
                            <small>Monthly: +${this.formatCurrency(monthlyIncrease)}</small>
                        </div>
                        <div style="text-align: right;">
                            <strong>Time Saved: ${timeSavings.toFixed(1)} years</strong><br>
                            <small>Interest Saved: ${this.formatCurrency(interestSavings)}</small>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.3); padding: 8px; border-radius: 4px; font-size: 0.9rem;">
                        <strong>Analysis:</strong> Extra ${this.formatCurrency(monthlyIncrease)}/month saves ${this.formatCurrency(interestSavings)} 
                        (ROI: ${roi.toFixed(1)}% on additional payments)
                    </div>
                </div>
            `;
        });

        scenarioHTML += '</div>';
        document.getElementById('prepayment-results').innerHTML += scenarioHTML;
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
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#2c3e50';
        const gridColor = isDark ? '#4a5568' : '#e9ecef';
        const isMobile = window.innerWidth <= 768;
        
        return {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            size: isMobile ? 9 : 12,
                            weight: '600'
                        },
                        padding: isMobile ? 8 : 20,
                        boxWidth: isMobile ? 12 : 20,
                        usePointStyle: isMobile
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#2d3748' : 'rgba(0,0,0,0.8)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: isDark ? '#4a5568' : '#ccc',
                    borderWidth: 1,
                    titleFont: {
                        size: isMobile ? 10 : 12
                    },
                    bodyFont: {
                        size: isMobile ? 9 : 11
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Timeline',
                        color: textColor,
                        font: {
                            size: isMobile ? 10 : 12,
                            weight: '600'
                        }
                    },
                    ticks: {
                        maxRotation: isMobile ? 90 : 45,
                        minRotation: 45,
                        color: textColor,
                        font: {
                            size: isMobile ? 8 : 10
                        },
                        maxTicksLimit: isMobile ? 12 : 24
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'EMI Components (₹)',
                        color: textColor,
                        font: {
                            size: isMobile ? 10 : 12,
                            weight: '600'
                        }
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: isMobile ? 8 : 10
                        },
                        callback: function (value) {
                            if (isMobile) {
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(0) + 'L';
                                return '₹' + (value / 1000).toFixed(0) + 'K';
                            }
                            return '₹' + (value / 1000).toFixed(0) + 'K';
                        },
                        maxTicksLimit: isMobile ? 4 : 8
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Outstanding Balance (₹)',
                        color: textColor,
                        font: {
                            size: isMobile ? 10 : 12,
                            weight: '600'
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: isMobile ? 8 : 10
                        },
                        callback: function (value) {
                            if (isMobile) {
                                if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                return '₹' + (value / 100000).toFixed(0) + 'L';
                            }
                            return '₹' + (value / 100000).toFixed(1) + 'L';
                        },
                        maxTicksLimit: isMobile ? 4 : 6
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

        return `${monthNames[installmentDate.getMonth()]} ${installmentDate.getFullYear()-2000}`;
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

    convertAmountToWords(amount) {
        if (amount >= 10000000) { // 1 crore or more
            const crores = (amount / 10000000).toFixed(1);
            return `${crores} crore${crores != 1 ? 's' : ''}`;
        } else if (amount >= 100000) { // 1 lakh or more
            const lakhs = (amount / 100000).toFixed(1);
            return `${lakhs} lakh${lakhs != 1 ? 's' : ''}`;
        } else if (amount >= 1000) { // 1 thousand or more
            const thousands = (amount / 1000).toFixed(0);
            return `${thousands} thousand`;
        } else {
            return `${Math.round(amount)}`;
        }
    }

    getTimeSavedInWords(monthsSaved) {
        const yearsSaved = Math.floor(monthsSaved / 12);
        const remainingMonths = monthsSaved % 12;
        
        let timeSavedText = '';
        if (yearsSaved > 0) {
            timeSavedText = `${yearsSaved} year${yearsSaved > 1 ? 's' : ''}`;
            if (remainingMonths > 0) {
                timeSavedText += ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
            }
        } else {
            timeSavedText = `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
        return timeSavedText;
    }

    hideCalculateButton() {
        document.getElementById('calculate').style.display = 'none';
    }

    showCalculateButton() {
        document.getElementById('calculate').style.display = 'block';
    }



    initializeTheme() {
        // Load saved theme or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Add theme toggle event listener
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Update button text
        this.updateThemeButton();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.updateThemeButton();
        
        // Save theme preference
        localStorage.setItem('theme', newTheme);
        
        // Update charts if they exist
        setTimeout(() => {
            if (this.originalChart) {
                this.updateChartTheme(this.originalChart);
            }
            if (this.comparisonChart) {
                this.updateChartTheme(this.comparisonChart);
            }
        }, 100);
    }

    updateThemeButton() {
        const theme = document.documentElement.getAttribute('data-theme');
        const button = document.getElementById('theme-toggle');
        
        if (theme === 'dark') {
            button.innerHTML = '☀️';
        } else {
            button.innerHTML = '🌙';
        }
    }

    updateChartTheme(chart) {
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark';
        
        // Update legend
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#2c3e50';
        }
        
        // Update scales
        if (chart.options.scales) {
            Object.keys(chart.options.scales).forEach(scaleKey => {
                const scale = chart.options.scales[scaleKey];
                if (scale.ticks) {
                    scale.ticks.color = isDark ? '#e2e8f0' : '#2c3e50';
                }
                if (scale.grid) {
                    scale.grid.color = isDark ? '#4a5568' : '#e9ecef';
                }
                if (scale.title) {
                    scale.title.color = isDark ? '#e2e8f0' : '#2c3e50';
                }
            });
        }
        
        // Update tooltip styles
        if (chart.options.plugins && chart.options.plugins.tooltip) {
            chart.options.plugins.tooltip.backgroundColor = isDark ? '#2d3748' : 'rgba(0,0,0,0.8)';
            chart.options.plugins.tooltip.titleColor = isDark ? '#e2e8f0' : '#fff';
            chart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#fff';
            chart.options.plugins.tooltip.borderColor = isDark ? '#4a5568' : '#ccc';
        }
        
        chart.update('none');
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

    setDefaultGradualStartDate() {
        const loanStart = this.getLoanStartDate();
        const gradualStart = new Date(loanStart);
        gradualStart.setFullYear(gradualStart.getFullYear() + 1); // Start gradual increase after 1 year
        
        const year = gradualStart.getFullYear();
        const month = String(gradualStart.getMonth() + 1).padStart(2, '0');
        const day = String(gradualStart.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        document.getElementById('gradual-start-date').value = defaultDate;
    }

    getDefaultEventDate(monthsFromStart) {
        const loanStart = this.getLoanStartDate();
        const eventDate = new Date(loanStart);
        eventDate.setMonth(eventDate.getMonth() + monthsFromStart);
        
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    dateToMonthNumber(dateString) {
        const eventDate = new Date(dateString);
        const loanStart = this.getLoanStartDate();
        
        const yearDiff = eventDate.getFullYear() - loanStart.getFullYear();
        const monthDiff = eventDate.getMonth() - loanStart.getMonth();
        const dayDiff = eventDate.getDate() - loanStart.getDate();
        
        let totalMonths = yearDiff * 12 + monthDiff;
        if (dayDiff >= 0) totalMonths += 1; // Round up if event is on or after loan start day
        
        return Math.max(1, totalMonths);
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
            let isEmiChange = false;
            
            if (specialEvents) {
                if (specialEvents.multipleEvents) {
                    // Handle multiple events
                    const monthEvents = specialEvents.events.filter(event => event.month === month);
                    
                    // Process events in order: part payments first, then rate changes, then EMI changes
                    monthEvents.forEach(event => {
                        if (event.type === 'partPayment') {
                            partPayment += event.amount;
                        }
                    });
                    
                    monthEvents.forEach(event => {
                        if (event.type === 'rateChange') {
                            currentRate = event.newRate / (12 * 100);
                            isRateChange = true;
                        }
                    });
                    
                    monthEvents.forEach(event => {
                        if (event.type === 'emiChange') {
                            currentEMI = event.newEMI;
                            isEmiChange = true;
                        }
                    });
                } else {
                    // Handle single events (backward compatibility)
                    if (specialEvents.partPayment && month === specialEvents.partPaymentMonth) {
                        partPayment = specialEvents.partPaymentAmount;
                    }
                    if (specialEvents.rateChange && month === specialEvents.rateChangeMonth) {
                        currentRate = specialEvents.newRate / (12 * 100);
                        isRateChange = true;
                    }
                    if (specialEvents.emiChange && month >= specialEvents.emiChangeMonth) {
                        currentEMI = specialEvents.newEMI;
                        isEmiChange = true;
                    }
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
                isEmiChange,
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
                        ${this.hasComparison ? `<th colspan="3" class="comparison-header">Optimized Schedule</th>${window.innerWidth > 768 ? '<th colspan="2" class="comparison-header">Savings</th>' : ''}` : ''}
                    </tr>
                    <tr>
                        <th>Principal (₹)</th>
                        <th>Interest (₹)</th>
                        <th>Outstanding (₹)</th>
                        ${this.hasComparison ? `
                            <th class="comparison-column">Principal (₹)</th>
                            <th>Interest (₹)</th>
                            <th>Outstanding (₹)</th>
                            ${window.innerWidth > 768 ? `
                                <th class="comparison-column">Interest Diff (₹)</th>
                                <th>Outstanding Diff (₹)</th>
                            ` : ''}
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
                            <td class="currency"><strong>${this.formatCurrencyMobile(yearlyOriginalPrincipal)}</strong></td>
                            <td class="currency"><strong>${this.formatCurrencyMobile(yearlyOriginalInterest)}</strong></td>
                            <td></td>
                            ${this.hasComparison ? `
                                <td class="currency comparison-column"><strong>${this.formatCurrencyMobile(yearlyComparisonPrincipal)}</strong></td>
                                <td class="currency"><strong>${this.formatCurrencyMobile(yearlyComparisonInterest)}</strong></td>
                                ${window.innerWidth > 768 ? `
                                    <td></td>
                                    <td class="currency comparison-column ${yearlyInterestSavings >= 0 ? 'savings-positive' : 'savings-negative'}">
                                        <strong>${yearlyInterestSavings >= 0 ? '+' : ''}${this.formatCurrencyMobile(yearlyInterestSavings)}</strong>
                                    </td>
                                    <td></td>
                                ` : ''}
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
            
            let rowClass = '';
            if (originalRow.partPayment > 0 || (comparisonRow && comparisonRow.partPayment > 0)) {
                rowClass = 'part-payment-row';
            } else if (originalRow.isRateChange || (comparisonRow && comparisonRow.isRateChange)) {
                rowClass = 'rate-change-row';
            } else if (originalRow.isEmiChange || (comparisonRow && comparisonRow.isEmiChange)) {
                rowClass = 'rate-change-row'; // Use same styling as rate change
            }
            
            // Calculate differences
            const interestDiff = comparisonRow ? originalRow.interest - comparisonRow.interest : 0;
            const outstandingDiff = comparisonRow ? originalRow.outstandingBalance - comparisonRow.outstandingBalance : 0;
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td>${originalRow.date.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        year: '2-digit' 
                    })}</td>
                    <td class="currency">${this.formatCurrencyMobile(originalRow.principal)}</td>
                    <td class="currency">${this.formatCurrencyMobile(originalRow.interest)}</td>
                    <td class="currency">${this.formatCurrencyMobile(originalRow.outstandingBalance)}</td>
                    ${this.hasComparison && comparisonRow ? `
                        <td class="currency comparison-column">${this.formatCurrencyMobile(comparisonRow.principal)}</td>
                        <td class="currency">${this.formatCurrencyMobile(comparisonRow.interest)}</td>
                        <td class="currency">${this.formatCurrencyMobile(comparisonRow.outstandingBalance)}</td>
                        ${window.innerWidth > 768 ? `
                            <td class="currency comparison-column ${interestDiff >= 0 ? 'savings-positive' : 'savings-negative'}">
                                ${interestDiff !== 0 ? (interestDiff >= 0 ? '+' : '') + this.formatCurrencyMobile(interestDiff) : '-'}
                            </td>
                            <td class="currency ${outstandingDiff >= 0 ? 'savings-positive' : 'savings-negative'}">
                                ${outstandingDiff !== 0 ? (outstandingDiff >= 0 ? '+' : '') + this.formatCurrencyMobile(outstandingDiff) : '-'}
                            </td>
                        ` : ''}
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
                    <td class="currency"><strong>${this.formatCurrencyMobile(yearlyOriginalPrincipal)}</strong></td>
                    <td class="currency"><strong>${this.formatCurrencyMobile(yearlyOriginalInterest)}</strong></td>
                    <td></td>
                    ${this.hasComparison ? `
                        <td class="currency comparison-column"><strong>${this.formatCurrencyMobile(yearlyComparisonPrincipal)}</strong></td>
                        <td class="currency"><strong>${this.formatCurrencyMobile(yearlyComparisonInterest)}</strong></td>
                        ${window.innerWidth > 768 ? `
                            <td></td>
                            <td class="currency comparison-column ${yearlyInterestSavings >= 0 ? 'savings-positive' : 'savings-negative'}">
                                <strong>${yearlyInterestSavings >= 0 ? '+' : ''}${this.formatCurrencyMobile(yearlyInterestSavings)}</strong>
                            </td>
                            <td></td>
                        ` : ''}
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

    addPartPaymentEvent() {
        const id = Date.now();
        const defaultDate = this.getDefaultEventDate(1); // 12 months from loan start
        this.advancedEvents.partPayments.push({
            id,
            date: defaultDate,
            amount: 100000
        });
        this.renderPartPayments();
    }

    addRateChangeEvent() {
        const id = Date.now();
        const defaultDate = this.getDefaultEventDate(1);
        this.advancedEvents.rateChanges.push({
            id,
            date: defaultDate,
            newRate: 7.5
        });
        this.renderRateChanges();
    }

    addEmiChangeEvent() {
        const id = Date.now();
        const currentEMI = this.getCurrentEMI();
        const defaultDate = this.getDefaultEventDate(1);
        this.advancedEvents.emiChanges.push({
            id,
            date: defaultDate,
            newEMI: Math.round(currentEMI * 1.1)
        });
        this.renderEmiChanges();
    }

    getCurrentEMI() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);
        
        if (!principal || !annualRate || !tenureYears) return 50000;
        
        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;
        
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
               (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    }

    renderPartPayments() {
        const container = document.getElementById('part-payments-list');
        container.innerHTML = this.advancedEvents.partPayments.map(event => `
            <div class="scenario-item">
                <input type="date" value="${event.date}" 
                       onchange="calculator.updatePartPayment(${event.id}, 'date', this.value)"
                       style="width: 100%;">
                <input type="number" value="${event.amount}" min="1000" step="1000"
                       onchange="calculator.updatePartPayment(${event.id}, 'amount', this.value)"
                       placeholder="Amount (₹)" style="width: 100%;">
                <span style="font-size: 0.8rem;">${new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}: ${this.formatCurrency(event.amount)}</span>
                <button class="remove-btn" onclick="calculator.removePartPayment(${event.id})">Remove</button>
            </div>
        `).join('');
    }

    renderRateChanges() {
        const container = document.getElementById('rate-changes-list');
        container.innerHTML = this.advancedEvents.rateChanges.map(event => `
            <div class="scenario-item">
                <input type="date" value="${event.date}"
                       onchange="calculator.updateRateChange(${event.id}, 'date', this.value)"
                       style="width: 100%;">
                <input type="number" value="${event.newRate}" min="0.01" max="50" step="0.01"
                       onchange="calculator.updateRateChange(${event.id}, 'newRate', this.value)"
                       placeholder="New Rate (%)" style="width: 100%;">
                <span style="font-size: 0.8rem;">${new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}: ${event.newRate}%</span>
                <button class="remove-btn" onclick="calculator.removeRateChange(${event.id})">Remove</button>
            </div>
        `).join('');
    }

    renderEmiChanges() {
        const container = document.getElementById('emi-changes-list');
        container.innerHTML = this.advancedEvents.emiChanges.map(event => `
            <div class="scenario-item ${event.isGradual ? 'gradual-item' : ''}">
                <input type="date" value="${event.date}"
                       onchange="calculator.updateEmiChange(${event.id}, 'date', this.value)"
                       style="width: 100%;" ${event.isGradual ? 'disabled' : ''}>
                <input type="number" value="${event.newEMI}" min="1000" step="100"
                       onchange="calculator.updateEmiChange(${event.id}, 'newEMI', this.value)"
                       placeholder="New EMI (₹)" style="width: 100%;">
                <span style="font-size: 0.8rem;">
                    ${new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}: ${this.formatCurrency(event.newEMI)}
                    ${event.isGradual ? ` (Year ${event.gradualYear})` : ''}
                </span>
                <button class="remove-btn" onclick="calculator.removeEmiChange(${event.id})">Remove</button>
            </div>
        `).join('');
    }

    updatePartPayment(id, field, value) {
        const event = this.advancedEvents.partPayments.find(e => e.id === id);
        if (event) {
            if (field === 'date') {
                event[field] = value;
            } else {
                event[field] = parseFloat(value);
            }
            this.renderPartPayments();
        }
    }

    updateRateChange(id, field, value) {
        const event = this.advancedEvents.rateChanges.find(e => e.id === id);
        if (event) {
            if (field === 'date') {
                event[field] = value;
            } else {
                event[field] = parseFloat(value);
            }
            this.renderRateChanges();
        }
    }

    updateEmiChange(id, field, value) {
        const event = this.advancedEvents.emiChanges.find(e => e.id === id);
        if (event) {
            if (field === 'date') {
                event[field] = value;
            } else {
                event[field] = parseFloat(value);
            }
            this.renderEmiChanges();
        }
    }

    removePartPayment(id) {
        this.advancedEvents.partPayments = this.advancedEvents.partPayments.filter(e => e.id !== id);
        this.renderPartPayments();
    }

    removeRateChange(id) {
        this.advancedEvents.rateChanges = this.advancedEvents.rateChanges.filter(e => e.id !== id);
        this.renderRateChanges();
    }

    removeEmiChange(id) {
        this.advancedEvents.emiChanges = this.advancedEvents.emiChanges.filter(e => e.id !== id);
        this.renderEmiChanges();
    }

    addGradualIncrease() {
        const startDate = document.getElementById('gradual-start-date').value;
        const increasePercent = parseFloat(document.getElementById('gradual-increase-percent').value);
        const maxYears = parseInt(document.getElementById('gradual-max-years').value);
        
        if (!startDate || !increasePercent || !maxYears) {
            alert('Please fill in all gradual increase fields');
            return;
        }
        
        const currentEMI = this.getCurrentEMI();
        let emi = currentEMI;
        
        for (let year = 0; year < maxYears; year++) {
            const eventDate = new Date(startDate);
            eventDate.setFullYear(eventDate.getFullYear() + year);
            
            emi = emi * (1 + increasePercent / 100);
            
            const year_str = eventDate.getFullYear();
            const month_str = String(eventDate.getMonth() + 1).padStart(2, '0');
            const day_str = String(eventDate.getDate()).padStart(2, '0');
            const dateString = `${year_str}-${month_str}-${day_str}`;
            
            this.advancedEvents.emiChanges.push({
                id: Date.now() + year,
                date: dateString,
                newEMI: Math.round(emi),
                isGradual: true,
                gradualYear: year + 1
            });
        }
        
        this.renderEmiChanges();
        
        // Show success message
        const message = `Added ${maxYears} gradual EMI increases starting ${startDate} with ${increasePercent}% annual growth`;
        document.getElementById('prepayment-results').innerHTML = `
            <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                <strong>✓ Gradual Increase Added:</strong> ${message}
            </div>
        `;
    }

    clearAllEvents() {
        this.advancedEvents = {
            partPayments: [],
            rateChanges: [],
            emiChanges: []
        };
        this.renderPartPayments();
        this.renderRateChanges();
        this.renderEmiChanges();
        document.getElementById('prepayment-results').innerHTML = '';
    }

    calculateAdvancedScenario() {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const tenureYears = parseFloat(document.getElementById('tenure').value);

        if (!principal || !annualRate || !tenureYears) {
            alert('Please fill in basic loan details first');
            return;
        }

        // Combine all events and sort by date, then convert to month numbers
        const allEvents = [
            ...this.advancedEvents.partPayments.map(e => ({...e, type: 'partPayment', month: this.dateToMonthNumber(e.date)})),
            ...this.advancedEvents.rateChanges.map(e => ({...e, type: 'rateChange', month: this.dateToMonthNumber(e.date)})),
            ...this.advancedEvents.emiChanges.map(e => ({...e, type: 'emiChange', month: this.dateToMonthNumber(e.date)}))
        ].sort((a, b) => a.month - b.month);

        const monthlyRate = annualRate / (12 * 100);
        const tenureMonths = tenureYears * 12;

        // Calculate original scenario
        const originalEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                           (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        const originalTotalAmount = originalEMI * tenureMonths;
        const originalInterest = originalTotalAmount - principal;

        // Calculate advanced scenario
        const advancedResult = this.calculateAdvancedSchedule(principal, monthlyRate, originalEMI, tenureMonths, allEvents);

        this.displayAdvancedResults({
            originalEMI,
            originalInterest,
            originalTotalAmount,
            originalTenure: tenureYears,
            advancedResult,
            events: allEvents
        });
    }

    calculateAdvancedSchedule(principal, monthlyRate, initialEMI, maxTenure, events) {
        let outstandingBalance = principal;
        let currentEMI = initialEMI;
        let currentRate = monthlyRate;
        let totalPaid = 0;
        let totalInterest = 0;
        let totalPartPayments = 0;
        let month = 1;

        const eventsByMonth = {};
        events.forEach(event => {
            if (!eventsByMonth[event.month]) eventsByMonth[event.month] = [];
            eventsByMonth[event.month].push(event);
        });

        while (outstandingBalance > 1 && month <= maxTenure) {
            // Apply events for this month
            if (eventsByMonth[month]) {
                eventsByMonth[month].forEach(event => {
                    if (event.type === 'partPayment') {
                        outstandingBalance = Math.max(0, outstandingBalance - event.amount);
                        totalPartPayments += event.amount;
                    } else if (event.type === 'rateChange') {
                        currentRate = event.newRate / (12 * 100);
                    } else if (event.type === 'emiChange') {
                        currentEMI = event.newEMI;
                    }
                });
            }

            if (outstandingBalance <= 1) break;

            const interestComponent = outstandingBalance * currentRate;
            const principalComponent = Math.max(0, Math.min(currentEMI - interestComponent, outstandingBalance));
            
            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);
            totalPaid += currentEMI;
            totalInterest += interestComponent;
            
            month++;
        }

        return {
            actualTenure: month - 1,
            totalPaid,
            totalInterest,
            totalPartPayments,
            finalBalance: outstandingBalance
        };
    }

    displayAdvancedResults(data) {
        const resultsContainer = document.getElementById('prepayment-results');
        
        const timeSaved = data.originalTenure - (data.advancedResult.actualTenure / 12);
        const interestSaved = data.originalInterest - data.advancedResult.totalInterest;
        const totalSaved = interestSaved;

        // Calculate loan closure dates
        const loanStartDate = this.getLoanStartDate();
        const originalClosureDate = this.getInstallmentDate(loanStartDate, data.originalTenure * 12);
        const optimizedClosureDate = this.getInstallmentDate(loanStartDate, data.advancedResult.actualTenure);
        
        // Convert savings to words
        const savingsInWords = this.convertAmountToWords(interestSaved);
        const timeSavedInWords = this.getTimeSavedInWords(Math.round(timeSaved * 12));
        
        resultsContainer.innerHTML = `
            <div class="scenario-summary">
                <h4>Optimized Strategy Results</h4>
                
                <div class="savings-highlight">
                    <div style="text-align: center;">
                        <div style="font-size: 1.1rem; margin-bottom: 8px;">💰 Total Savings</div>
                        <div class="savings-amount">${this.formatCurrency(interestSaved)}</div>
                        <div style="font-size: 1rem; margin-top: 8px; font-weight: 600; color: #ffd700;">
                            You save approximately <strong>${savingsInWords}</strong> in interest!
                        </div>
                        <div style="font-size: 0.9rem; margin-top: 5px; opacity: 0.9;">Complete your loan <strong>${timeSavedInWords}</strong> earlier!</div>
                    </div>
                </div>
                
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <strong>📅 Original Timeline</strong>
                        <div class="value">${data.originalTenure} years</div>
                        <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">
                            Start: ${loanStartDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}<br>
                            End: ${originalClosureDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 6px; color: #ff6b6b;">
                            Interest: ${this.formatCurrency(data.originalInterest)}
                        </div>
                    </div>
                    <div class="comparison-item">
                        <strong>🚀 Optimized Timeline</strong>
                        <div class="value">${(data.advancedResult.actualTenure / 12).toFixed(1)} years</div>
                        <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">
                            Start: ${loanStartDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}<br>
                            End: ${optimizedClosureDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 6px; color: #4ecdc4;">
                            Interest: ${this.formatCurrency(data.advancedResult.totalInterest)}
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; border-left: 4px solid #4ecdc4;">
                    <div style="font-size: 1rem; margin-bottom: 10px; text-align: center; font-weight: 600;">
                        🎯 Your Optimization Strategy
                    </div>
                    <div style="text-align: center; margin-bottom: 15px; font-size: 0.9rem; opacity: 0.9;">
                        By implementing ${data.events.length} strategic action${data.events.length > 1 ? 's' : ''}, you'll save <strong>${savingsInWords}</strong> and finish <strong>${timeSavedInWords}</strong> early.
                    </div>
                    <div class="event-timeline">
                        ${data.events.map(event => {
                            const eventDate = new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                            if (event.type === 'partPayment') {
                                return `<span class="strategy-badge">${eventDate}: Part Payment ${this.formatCurrency(event.amount)}</span>`;
                            } else if (event.type === 'rateChange') {
                                return `<span class="strategy-badge">${eventDate}: Rate ${event.newRate}%</span>`;
                            } else if (event.type === 'emiChange') {
                                return `<span class="strategy-badge">${eventDate}: EMI ${this.formatCurrency(event.newEMI)}${event.isGradual ? ' (Auto)' : ''}</span>`;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        // Hide the separate loan amortization section since we've merged the info
        document.querySelector('.chart-section h2').style.display = 'none';
        document.getElementById('loan-closure-info').style.display = 'none';
        

        
        // Generate advanced comparison chart and table
        this.generateAdvancedComparisonChart(data);
    }

    generateAdvancedComparisonChart(data) {
        const principal = this.getPrincipalValue();
        const annualRate = parseFloat(document.getElementById('rate').value);
        const monthlyRate = annualRate / (12 * 100);
        
        // Combine all events for the detailed schedule
        const allEvents = [
            ...this.advancedEvents.partPayments.map(e => ({...e, type: 'partPayment', month: this.dateToMonthNumber(e.date)})),
            ...this.advancedEvents.rateChanges.map(e => ({...e, type: 'rateChange', month: this.dateToMonthNumber(e.date)})),
            ...this.advancedEvents.emiChanges.map(e => ({...e, type: 'emiChange', month: this.dateToMonthNumber(e.date)}))
        ].sort((a, b) => a.month - b.month);

        const specialEvents = {
            multipleEvents: true,
            events: allEvents
        };

        const newTenureMonths = data.advancedResult.actualTenure;
        
        // Generate the advanced chart data
        const chartData = this.calculateAdvancedAmortizationSchedule(principal, monthlyRate, data.originalEMI, newTenureMonths, allEvents);
        
        // Create the comparison chart
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

        // Generate the installment table
        this.generateInstallmentTable('comparison', principal, monthlyRate, data.originalEMI, newTenureMonths, specialEvents);

        // Show comparison chart
        document.getElementById('comparison-chart-container').style.display = 'block';
        document.querySelector('.charts-grid').classList.add('comparison');
        
        // Update loan closure info
        const originalTenure = parseFloat(document.getElementById('tenure').value) * 12;
        this.displayLoanClosureInfo(originalTenure, newTenureMonths);
    }

    calculateAdvancedAmortizationSchedule(principal, monthlyRate, initialEMI, maxTenure, events) {
        const dateLabels = [];
        const principalComponents = [];
        const interestComponents = [];
        const outstandingBalances = [];
        
        let outstandingBalance = principal;
        let currentEMI = initialEMI;
        let currentRate = monthlyRate;
        const startDate = this.getLoanStartDate();
        
        // Create events lookup by month
        const eventsByMonth = {};
        events.forEach(event => {
            if (!eventsByMonth[event.month]) eventsByMonth[event.month] = [];
            eventsByMonth[event.month].push(event);
        });
        
        // Sample every few months for better chart readability
        const sampleInterval = Math.max(1, Math.floor(maxTenure / 15));
        
        for (let month = 1; month <= maxTenure && outstandingBalance > 1; month++) {
            const installmentDate = this.getInstallmentDate(startDate, month);
            
            // Apply events for this month
            if (eventsByMonth[month]) {
                eventsByMonth[month].forEach(event => {
                    if (event.type === 'partPayment') {
                        outstandingBalance = Math.max(0, outstandingBalance - event.amount);
                    } else if (event.type === 'rateChange') {
                        currentRate = event.newRate / (12 * 100);
                    } else if (event.type === 'emiChange') {
                        currentEMI = event.newEMI;
                    }
                });
            }
            
            if (outstandingBalance <= 1) break;
            
            const interestComponent = outstandingBalance * currentRate;
            const principalComponent = Math.max(0, Math.min(currentEMI - interestComponent, outstandingBalance));
            outstandingBalance = Math.max(0, outstandingBalance - principalComponent);
            
            if (month % sampleInterval === 0 || month === 1 || month === maxTenure || eventsByMonth[month] || outstandingBalance <= 1) {
                dateLabels.push(this.getDateLabel(month));
                principalComponents.push(Math.round(principalComponent));
                interestComponents.push(Math.round(interestComponent));
                outstandingBalances.push(Math.round(outstandingBalance));
            }
            
            if (outstandingBalance <= 1) break;
        }
        
        return {
            dateLabels,
            principalComponents,
            interestComponents,
            outstandingBalances
        };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatCurrencyMobile(amount) {
        if (window.innerWidth <= 768) {
            if (amount >= 10000000) { // 1 crore
                return `₹${(amount / 10000000).toFixed(1)}Cr`;
            } else if (amount >= 100000) { // 1 lakh
                return `₹${(amount / 100000).toFixed(1)}L`;
            } else if (amount >= 1000) { // 1 thousand
                return `₹${(amount / 1000).toFixed(0)}K`;
            } else {
                return `₹${Math.round(amount)}`;
            }
        }
        return this.formatCurrency(amount);
    }
}

// Initialize the calculator when the page loads
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new EMICalculator();
});