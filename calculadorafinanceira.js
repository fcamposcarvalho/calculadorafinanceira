// financialcalculator.js

// Função para calcular corretamente o total de juros
function calcularTotalJuros(n, i, pmt, pv) {
    if (i === 0) {
        return 0;
    }
    const principal = Math.abs(pv);
    let saldo = principal; 
    let totalJurosCalculado = 0;
    
    for (let periodo = 1; periodo <= n; periodo++) {
        const jurosPeriodo = saldo * i;
        totalJurosCalculado += jurosPeriodo;
        const amortizacao = Math.abs(pmt) - jurosPeriodo;
        saldo -= amortizacao;
    }
    return Math.abs(totalJurosCalculado);
}

// Configuração inicial
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const periodsInput = document.getElementById('periods');
    const rateInput = document.getElementById('rate');
    const paymentInput = document.getElementById('payment');
    const presentValueInput = document.getElementById('presentValue');
    const futureValueInput = document.getElementById('futureValue');
    const calculateFieldSelect = document.getElementById('calculateField');
    const calculateBtn = document.getElementById('calculateBtn');
    const amortizationBtn = document.getElementById('amortizationBtn');
    const historyBtn = document.getElementById('historyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultValue = document.getElementById('resultValue');
    const interestValueElement = document.getElementById('interestValue'); 
    const totalPaymentsElement = document.getElementById('totalPayments'); 
    const errorMessage = document.getElementById('errorMessage');
    const togglePaymentBtn = document.getElementById('togglePayment');
    const togglePVBtn = document.getElementById('togglePV');
    const toggleFVBtn = document.getElementById('toggleFV');
    const multiplyPeriodsBtn = document.getElementById('multiplyPeriods');
    const divideRateBtn = document.getElementById('divideRate');
    
    createCustomDropdown();
    
    const historyModal = document.getElementById('historyModal');
    const closeModalBtn = document.getElementById('closeModal');
    const historyContent = document.getElementById('historyContent');
    
    const amortizationModal = document.getElementById('amortizationModal');
    const closeAmortizationModalBtn = document.getElementById('closeAmortizationModal');
    const amortizationContent = document.getElementById('amortizationContent');
    const amortizationModalContentEl = amortizationModal ? amortizationModal.querySelector('.modal-content') : null; // Para o drag


    let calculationHistory = [];
    const MAX_HISTORY = 10;
    const calculationCache = {};
    let adjustingSignals = false;
    
    function createCustomDropdown() {
        const originalSelect = document.getElementById('calculateField');
        if (!originalSelect) return;
        
        const selectedValue = originalSelect.value;
        originalSelect.style.display = 'none';
        
        const customDropdown = document.createElement('div');
        customDropdown.className = 'custom-dropdown';
        
        const dropdownButton = document.createElement('div');
        dropdownButton.className = 'dropdown-button';
        dropdownButton.setAttribute('tabindex', '0'); 
        
        let selectedText = '';
        for (let i = 0; i < originalSelect.options.length; i++) {
            if (originalSelect.options[i].value === selectedValue) {
                selectedText = originalSelect.options[i].text; 
                break;
            }
        }
        dropdownButton.textContent = selectedText;
        
        const dropdownIcon = document.createElement('span');
        dropdownIcon.className = 'dropdown-icon';
        dropdownIcon.innerHTML = '▼'; 
        dropdownButton.appendChild(dropdownIcon);
        
        const dropdownList = document.createElement('div');
        dropdownList.className = 'dropdown-list';
        // dropdownList.style.display = 'none'; // Controlado pela classe 'visible' agora

        for (let i = 0; i < originalSelect.options.length; i++) {
            const option = originalSelect.options[i];
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';
            if (option.value === selectedValue) {
                dropdownItem.classList.add('selected');
            }
            dropdownItem.setAttribute('data-value', option.value);
            dropdownItem.textContent = option.text; 
            
            dropdownItem.addEventListener('click', function(e) {
                e.stopPropagation();
                originalSelect.value = option.value;
                const event = new Event('change', { bubbles: true });
                originalSelect.dispatchEvent(event);
                dropdownButton.textContent = option.text;
                dropdownButton.appendChild(dropdownIcon); 
                dropdownList.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('selected'));
                dropdownItem.classList.add('selected');
                dropdownList.classList.remove('visible'); // Alterna visibilidade
                localStorage.setItem('lastCalculateField', option.value);
            });
            dropdownList.appendChild(dropdownItem);
        }
        
        dropdownButton.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownList.classList.toggle('visible'); // Alterna visibilidade
        });
        
        document.addEventListener('click', () => { dropdownList.classList.remove('visible'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdownList.classList.remove('visible'); });
        
        customDropdown.appendChild(dropdownButton);
        customDropdown.appendChild(dropdownList);
        originalSelect.parentNode.insertBefore(customDropdown, originalSelect.nextSibling);
    }
    
    if (calculateFieldSelect) {
        calculateFieldSelect.addEventListener('change', function(event) {
            // console.log("Campo de cálculo alterado via select original:", calculateFieldSelect.value);
        });
        if (localStorage.getItem('lastCalculateField')) {
            calculateFieldSelect.value = localStorage.getItem('lastCalculateField');
            const customDropdownButton = calculateFieldSelect.parentNode.querySelector('.dropdown-button');
            const customDropdownList = calculateFieldSelect.parentNode.querySelector('.dropdown-list');
            if (customDropdownButton && customDropdownList) {
                 for (let i = 0; i < calculateFieldSelect.options.length; i++) {
                    if (calculateFieldSelect.options[i].value === calculateFieldSelect.value) {
                        customDropdownButton.firstChild.textContent = calculateFieldSelect.options[i].text; 
                        customDropdownList.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('selected'));
                        const selectedItem = customDropdownList.querySelector(`.dropdown-item[data-value="${calculateFieldSelect.value}"]`);
                        if (selectedItem) selectedItem.classList.add('selected');
                        break;
                    }
                }
            }
        }
    }
    
    if (togglePaymentBtn) togglePaymentBtn.addEventListener('click', () => invertSign('payment'));
    if (togglePVBtn) togglePVBtn.addEventListener('click', () => invertSign('presentValue'));
    if (toggleFVBtn) toggleFVBtn.addEventListener('click', () => invertSign('futureValue'));
    if (multiplyPeriodsBtn) multiplyPeriodsBtn.addEventListener('click', multiplyPeriods);
    if (divideRateBtn) divideRateBtn.addEventListener('click', divideRate);
    if (calculateBtn) calculateBtn.addEventListener('click', calculate);
    if (amortizationBtn) amortizationBtn.addEventListener('click', showAmortizationTable);
    if (historyBtn) historyBtn.addEventListener('click', showHistory);
    if (clearBtn) clearBtn.addEventListener('click', clearFields);
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { if(historyModal) historyModal.style.display = "none"; });
    if (closeAmortizationModalBtn) closeAmortizationModalBtn.addEventListener('click', () => { if(amortizationModal) amortizationModal.style.display = "none"; });
    
    window.addEventListener('click', function(event) {
        if (historyModal && event.target === historyModal) historyModal.style.display = "none";
        if (amortizationModal && event.target === amortizationModal) amortizationModal.style.display = "none";
    });
    
    if (paymentInput) paymentInput.addEventListener('input', adjustSignals);
    if (presentValueInput) presentValueInput.addEventListener('input', adjustSignals);


    function multiplyPeriods() {
        try {
            const periodValue = parseInt(periodsInput.value) || 0;
            periodsInput.value = periodValue * 12;
        } catch (error) {
            showError("Erro ao multiplicar períodos: " + error.message);
        }
    }
    
    function divideRate() {
        try {
            const rateValue = parseFloat(rateInput.value) || 0;
            rateInput.value = (rateValue / 12).toFixed(8);
        } catch (error) {
            showError("Erro ao dividir a taxa: " + error.message);
        }
    }
    
    function invertSign(field) {
        adjustingSignals = true;
        let inputElement;
        if (field === 'payment') inputElement = paymentInput;
        else if (field === 'presentValue') inputElement = presentValueInput;
        else if (field === 'futureValue') inputElement = futureValueInput;

        if (inputElement) {
            let val = parseFloat(inputElement.value) || 0;
            inputElement.value = (-val).toFixed(2);
        }
        setTimeout(() => { adjustingSignals = false; }, 100);
    }
    
    function adjustSignals() {
        if (adjustingSignals) return;
        adjustingSignals = true;
        adjustingSignals = false;
    }
    
    function clearFields() {
        if(periodsInput) periodsInput.value = "12";
        if(rateInput) rateInput.value = "1.0"; 
        if(paymentInput) paymentInput.value = "0.00";
        if(presentValueInput) presentValueInput.value = "1000.00";
        if(futureValueInput) futureValueInput.value = "0.00";
        if(resultContainer) resultContainer.classList.remove('visible');
        hideError();
        
        if (interestValueElement) interestValueElement.textContent = '';
        if (totalPaymentsElement) totalPaymentsElement.textContent = '';
    }
    
    function formatCurrency(value) {
        if (isNaN(value) || value === null) return "0,00"; 
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    
    function formatRate(value) {
         if (isNaN(value) || value === null) return "0,00000000";
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(value);
    }
    
    function showError(message) {
        if(errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('visible');
        }
    }
    
    function hideError() {
        if(errorMessage) {
            errorMessage.textContent = '';
            errorMessage.classList.remove('visible');
        }
    }
    
    function addToHistory(type, calculatedValue, originalValue, n, i, pmt, pv, fv, interestAmount, totalPayments) {
        const record = { type, calculatedValue, originalValue, n, i, pmt, pv, fv, interestAmount, totalPayments, date: new Date().toLocaleString('pt-BR') };
        calculationHistory.unshift(record);
        if (calculationHistory.length > MAX_HISTORY) calculationHistory.pop();
    }
    
    function showHistory() {
        if (!historyContent || !historyModal) return;

        const historyModalContentEl = historyModal.querySelector('.modal-content');
        if (historyModalContentEl) { // Reseta a posição para centralização
            historyModalContentEl.style.position = '';
            historyModalContentEl.style.left = '';
            historyModalContentEl.style.top = '';
        }

        if (calculationHistory.length === 0) {
            historyContent.innerHTML = '<div class="empty-history">Nenhum cálculo no histórico.</div>';
        } else {
            historyContent.innerHTML = '';
            calculationHistory.forEach((calc, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-detail">${index + 1}. Cálculo de ${getLabelForField(calc.type)}:</div>
                    <div class="history-detail history-result">Resultado: ${calc.type === 'rate' ? formatRate(calc.calculatedValue) + "%" : formatCurrency(calc.calculatedValue)}</div>
                    <div class="history-detail">Períodos: ${calc.n}, Taxa: ${formatRate(calc.i)}%, PMT: ${formatCurrency(calc.pmt)}</div>
                    <div class="history-detail">PV: ${formatCurrency(calc.pv)}, FV: ${formatCurrency(calc.fv)}</div>
                    <div class="history-detail">Total de Juros: ${formatCurrency(calc.interestAmount)}</div>
                    <div class="history-detail">Total de Pagamentos/Contribuições: ${formatCurrency(calc.totalPayments)}</div>
                `;
                historyContent.appendChild(historyItem);
            });
        }
        historyModal.style.display = "flex"; // MODIFICADO para flex
    }
    
    function showAmortizationTable() {
        if (!amortizationContent || !amortizationModal || !amortizationModalContentEl) return;
        try {
            hideError();
            const n = parseInt(periodsInput.value) || 0;
            const i = (parseFloat(rateInput.value) || 0) / 100;
            let pmtVal = parseFloat(paymentInput.value) || 0;
            const pv = parseFloat(presentValueInput.value) || 0;
            const fv = parseFloat(futureValueInput.value) || 0;

            if (n <= 0) throw new Error("O número de períodos deve ser maior que zero.");
            if (i <= 0 && pmtVal !== 0) throw new Error("A taxa deve ser maior que zero para amortização com pagamentos.");
            if (i === 0 && pmtVal === 0 && pv === -fv) {
                 amortizationContent.innerHTML = '<div class="empty-amortization">Com taxa zero e sem pagamentos, a amortização é direta. O saldo final será igual ao valor futuro.</div>';
                 if (amortizationModalContentEl) { // Reseta posição
                    amortizationModalContentEl.style.position = '';
                    amortizationModalContentEl.style.left = '';
                    amortizationModalContentEl.style.top = '';
                 }
                 amortizationModal.style.display = "flex"; // MODIFICADO para flex
                 return;
            }
             if (i === 0 && pmtVal === 0 && pv !== -fv) {
                throw new Error("Com taxa e pagamento zero, o PV deve ser o oposto do FV para uma amortização válida.");
            }

            const amortizationData = calculateAmortizationTable(n, i, pmtVal, pv, fv);
            
            if (amortizationData.length === 0) {
                amortizationContent.innerHTML = '<div class="empty-amortization">Não foi possível gerar a tabela com os valores fornecidos. Verifique se o PMT é suficiente para cobrir os juros.</div>';
            } else {
                const totalPrincipal = amortizationData.reduce((sum, row) => sum + row.principalPayment, 0);
                const totalInterest = amortizationData.reduce((sum, row) => sum + row.interestPayment, 0);
                const totalPayment = amortizationData.reduce((sum, row) => sum + row.payment, 0);
                
                let tableHTML = `
                    <div class="amortization-summary">
                        <p>Total de Pagamentos: ${formatCurrency(totalPayment)}</p>
                        <p>Total de Principal Amortizado: ${formatCurrency(totalPrincipal)}</p>
                        <p>Total de Juros Pagos/Recebidos: ${formatCurrency(totalInterest)}</p>
                    </div>
                    <table class="amortization-table">
                        <thead><tr><th>Período</th><th>Pagamento</th><th>Juros</th><th>Juros Acum.</th><th>Principal</th><th>Principal Acum.</th><th>Saldo Final</th></tr></thead>
                        <tbody>`;
                amortizationData.forEach(row => {
                    tableHTML += `<tr>
                        <td>${row.period}</td><td>${formatCurrency(row.payment)}</td><td>${formatCurrency(row.interestPayment)}</td>
                        <td>${formatCurrency(row.cumulativeInterest)}</td><td>${formatCurrency(row.principalPayment)}</td>
                        <td>${formatCurrency(row.cumulativePrincipal)}</td><td>${formatCurrency(row.endingBalance)}</td>
                    </tr>`;
                });
                tableHTML += `<tr><td>Total</td><td>${formatCurrency(totalPayment)}</td><td>${formatCurrency(totalInterest)}</td><td>-</td><td>${formatCurrency(totalPrincipal)}</td><td>-</td><td>-</td></tr></tbody></table>`;
                amortizationContent.innerHTML = tableHTML;
            }
            // Resetar posição para centralização via flexbox antes de exibir
            if (amortizationModalContentEl) {
                amortizationModalContentEl.style.position = '';
                amortizationModalContentEl.style.left = '';
                amortizationModalContentEl.style.top = '';
            }
            amortizationModal.style.display = "flex"; // MODIFICADO para flex
        } catch (error) {
            showError("Amortização: " + error.message);
        }
    }
    
    function calculateAmortizationTable(n, i, pmt, pv, fv) {
        let pmtCalculado = pmt;
        if (pmtCalculado === 0 && pv !== 0 && fv !== 0 && i > 0) {
            if (i !== 0) {
                 pmtCalculado = calculatePayment(n, i, pv, fv);
            } else if (pv + fv !== 0) { 
                pmtCalculado = -(pv + fv) / n; 
            }
        }

        const table = [];
        let currentBalance = pv;
        let cumulativeInterest = 0;
        let cumulativePrincipal = 0;

        for (let period = 1; period <= n; period++) {
            const interestForPeriod = currentBalance * i;
            let principalPaymentPart;
            if (i === 0) { 
                principalPaymentPart = -pmtCalculado;
            } else {
                 principalPaymentPart = -pmtCalculado - interestForPeriod;
            }

            const displayPmt = Math.abs(pmtCalculado);
            const displayInterest = Math.abs(interestForPeriod);
            const displayPrincipal = Math.abs(principalPaymentPart);

            cumulativeInterest += displayInterest;
            cumulativePrincipal += displayPrincipal;
            
            currentBalance += interestForPeriod + pmtCalculado;

            table.push({
                period: period,
                payment: displayPmt,
                interestPayment: displayInterest,
                cumulativeInterest: cumulativeInterest,
                principalPayment: displayPrincipal,
                cumulativePrincipal: cumulativePrincipal,
                endingBalance: currentBalance 
            });
        }
        return table;
    }
    
    function getLabelForField(field) {
        const labels = { periods: 'Períodos (n)', rate: 'Taxa (i)', payment: 'Pagamento (PMT)', presentValue: 'Valor Presente (PV)', futureValue: 'Valor Futuro (FV)'};
        return labels[field] || field;
    }
    
    function adjustSignalsBeforeCalculation() {
        return {
            pmt: parseFloat(paymentInput.value) || 0,
            pv: parseFloat(presentValueInput.value) || 0,
            fv: parseFloat(futureValueInput.value) || 0
        };
    }
    
    function calculate() {
        hideError();
        try {
            const n_val = parseInt(periodsInput.value) || 0;
            const i_val = (parseFloat(rateInput.value) || 0) / 100;
            const pmt_val = parseFloat(paymentInput.value) || 0;
            const pv_val = parseFloat(presentValueInput.value) || 0;
            const fv_val = parseFloat(futureValueInput.value) || 0;
            const fieldToCalculate = calculateFieldSelect.value;
            
            validateInput(n_val, i_val, pmt_val, pv_val, fv_val, fieldToCalculate);
            
            let result;
            let originalValueInput;
            
            switch (fieldToCalculate) {
                case 'periods':
                    originalValueInput = n_val;
                    result = calculatePeriods(i_val, pmt_val, pv_val, fv_val);
                    if (result !== null) periodsInput.value = Math.round(result);
                    break;
                case 'rate':
                    originalValueInput = parseFloat(rateInput.value);
                    result = calculateRate(n_val, pmt_val, pv_val, fv_val); 
                    if (result !== null) rateInput.value = result.toFixed(8);
                    break;
                case 'payment':
                    originalValueInput = pmt_val;
                    result = calculatePayment(n_val, i_val, pv_val, fv_val);
                    if (result !== null) paymentInput.value = result.toFixed(2);
                    break;
                case 'presentValue':
                    originalValueInput = pv_val;
                    result = calculatePresentValue(n_val, i_val, pmt_val, fv_val);
                    if (result !== null) presentValueInput.value = result.toFixed(2);
                    break;
                case 'futureValue':
                    originalValueInput = fv_val;
                    result = calculateFutureValue(n_val, i_val, pmt_val, pv_val);
                    if (result !== null) futureValueInput.value = result.toFixed(2);
                    break;
                default:
                    throw new Error("Campo de cálculo desconhecido.");
            }
            
            if (result !== null && isFinite(result)) {
                resultValue.textContent = fieldToCalculate === 'rate' ? formatRate(result) + "%" : formatCurrency(result);
                
                const finalN = parseInt(periodsInput.value) || 0;
                const finalRatePercent = parseFloat(rateInput.value) || 0;
                const finalI = finalRatePercent / 100;
                const finalPmt = parseFloat(paymentInput.value) || 0;
                const finalPv = parseFloat(presentValueInput.value) || 0;

                let interestAmount = 0;
                let totalPrincipalPayments = 0;
                
                totalPrincipalPayments = Math.abs(finalPmt * finalN);
                interestAmount = calcularTotalJuros(finalN, finalI, finalPmt, finalPv);

                if (interestValueElement) interestValueElement.textContent = formatCurrency(interestAmount);
                if (totalPaymentsElement) totalPaymentsElement.textContent = formatCurrency(totalPrincipalPayments);
                
                resultContainer.classList.add('visible');
                
                addToHistory(fieldToCalculate, result, originalValueInput, finalN, finalRatePercent, finalPmt, finalPv, parseFloat(futureValueInput.value), interestAmount, totalPrincipalPayments);
            } else if (result === null || !isFinite(result)) {
                showError("Não foi possível calcular o valor ou o resultado é inválido.");
                if(resultValue) resultValue.textContent = "-";
                 if (interestValueElement) interestValueElement.textContent = '-';
                if (totalPaymentsElement) totalPaymentsElement.textContent = '-';
            }
            
        } catch (error) {
            showError(error.message);
            if(resultContainer) resultContainer.classList.remove('visible');
        }
    }
    
    function validateInput(n, i, pmt, pv, fv, fieldToCalculate) {
        if (fieldToCalculate !== 'periods' && (n <= 0 || !Number.isInteger(n))) {
            throw new Error("O número de períodos (n) deve ser um inteiro positivo.");
        }
        // Nenhuma validação para taxa negativa aqui, permite cálculos teóricos.

        if (fieldToCalculate === 'periods') {
            if (i === 0) { 
                if (pmt === 0) { 
                    if (pv === 0 && fv === 0) throw new Error("Todos os valores são zero, não é possível calcular os períodos.");
                    if (pv + fv !== 0) throw new Error("Com taxa e PMT zero, o PV deve ser o oposto do FV para calcular os períodos.");
                } else { 
                    if (pv + fv === 0 && pmt !== 0) { /*ok, N=0*/ }
                    else if (pmt > 0 && pv + fv > 0) throw new Error("Conflito de sinais: com PMT positivo (entrada), PV+FV (saída líquida) não pode ser positivo.");
                    else if (pmt < 0 && pv + fv < 0) throw new Error("Conflito de sinais: com PMT negativo (saída), PV+FV (entrada líquida) não pode ser negativo.");
                }
            } // Nenhuma validação extensiva para i != 0, pois métodos numéricos podem lidar com mais casos.
        }
        return true;
    }
    
    function calculatePresentValue(n, i, pmt, fv) {
        const cacheKey = `PV_${n}_${i}_${pmt}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];
        let pv;
        if (i === 0) {
            pv = - (fv + pmt * n);
        } else {
            const factor = Math.pow(1 + i, n);
            pv = - (fv + pmt * (factor - 1) / i) / factor;
        }
        calculationCache[cacheKey] = pv;
        return pv;
    }
    
    function calculateFutureValue(n, i, pmt, pv) {
        const cacheKey = `FV_${n}_${i}_${pmt}_${pv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];
        let fv;
        if (i === 0) {
            fv = - (pv + pmt * n);
        } else {
            const factor = Math.pow(1 + i, n);
            fv = - (pv * factor + pmt * (factor - 1) / i);
        }
        calculationCache[cacheKey] = fv;
        return fv;
    }
    
    function calculatePayment(n, i, pv, fv) {
        const cacheKey = `PMT_${n}_${i}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];
        let pmt;
        if (i === 0) {
            if (n === 0) throw new Error("NPER não pode ser zero para calcular PMT com taxa zero.");
            pmt = - (pv + fv) / n;
        } else {
            const factor = Math.pow(1 + i, n);
            if (factor - 1 === 0 && i !== 0) { 
                 if (n===0) throw new Error("NPER não pode ser zero para calcular PMT com taxa diferente de zero se isso levar a divisão por zero.");
                 throw new Error("Configuração inválida para cálculo de PMT (divisão por zero no fator).");
            }
             pmt = - (fv * i + pv * i * factor) / (factor - 1);
        }
        calculationCache[cacheKey] = pmt;
        return pmt;
    }
    
// financialcalculator.js

// ... (código anterior do arquivo)

    function calculatePeriods(i, pmt, pv, fv) { // NPER
        const cacheKey = `N_${i}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        let n;
        if (i === 0) {
            if (pmt === 0) {
                if (pv + fv !== 0) throw new Error("Com taxa e PMT zero, o PV deve ser o oposto do FV.");
                return 0; 
            }
            n = -(pv + fv) / pmt;
        } else { // i não é 0
            if (pmt === 0) {
                // --- INÍCIO DA MODIFICAÇÃO ---
                if (pv === 0) {
                    throw new Error("Com PMT zero, o Valor Presente (PV) não pode ser zero.");
                }
                const ratio = -fv / pv;
                if (ratio <= 0) {
                    // Mensagem de erro melhorada, explicando a convenção de sinais.
                    throw new Error("Com PMT zero, o Valor Presente (PV) e o Valor Futuro (FV) devem ter sinais opostos.");
                }
                if (1 + i <= 0) {
                    throw new Error("A taxa não pode ser -100% ou menor para este cálculo.");
                }
                n = Math.log(ratio) / Math.log(1 + i);
                // --- FIM DA MODIFICAÇÃO ---
            } else {
                const term1_val = pmt + fv * i;
                const term2_val = pmt + pv * i;
                if (term2_val === 0 || (term1_val / term2_val <= 0) || (term1_val === 0 && term2_val === 0) ) {
                    return calculatePeriodsBinarySearch(i, pmt, pv, fv); 
                }
                 n = Math.log(term1_val / term2_val) / Math.log(1 + i);
            }
        }
        if (n < 0 || !isFinite(n)) {
            return calculatePeriodsBinarySearch(i, pmt, pv, fv);
        }
        cacheKey[cacheKey] = n;
        return n;
    }

    function calculatePeriodsBinarySearch(rate, pmt, pv, fv, maxN = 10000, tolerance = 1e-6) {
        if (rate === 0) { 
            if (pmt === 0) return (pv + fv === 0) ? 0 : null; 
            if (pmt !== 0) return -(pv + fv) / pmt;
            return null;
        }

        // Determina se a função FV(n) é crescente ou decrescente em relação a n.
        const trend_term = pmt + pv * rate;
        const isIncreasing = (rate > 0) ? (trend_term < 0) : (trend_term > 0);

        // Calcula os valores nos limites do intervalo de busca [0, maxN]
        const fv_at_n0 = calculateFutureValue(0, rate, pmt, pv);
        const fv_at_nMax = calculateFutureValue(maxN, rate, pmt, pv);

        // Verifica se uma solução é matematicamente possível dentro do intervalo.
        if (isIncreasing) {
            if (fv < fv_at_n0 || fv > fv_at_nMax) return null;
        } else { // se for decrescente
            if (fv > fv_at_n0 || fv < fv_at_nMax) return null;
        }

        let low = 0;
        let high = maxN;

        for (let iter = 0; iter < 100; iter++) { 
            let n = (low + high) / 2;
            const fv_calculated = calculateFutureValue(n, rate, pmt, pv);
            
            if (isIncreasing) {
                if (fv_calculated < fv) {
                    low = n;
                } else {
                    high = n;
                }
            } else { // Decrescente
                if (fv_calculated > fv) {
                    low = n;
                } else {
                    high = n;
                }
            }
            
            // Interrompe o loop se a convergência for alcançada.
            if (high - low < tolerance) break;
        }
        
        // Após o loop, 'low' e 'high' definem um intervalo muito pequeno contendo a raiz.
        const final_n = (low + high) / 2;
        const final_fv = calculateFutureValue(final_n, rate, pmt, pv);

        // A tolerância anterior (ex: 1e-5) era muito restrita para valores grandes de FV.
        // Uma tolerância absoluta de 0.01 (um centavo) é mais prática para cálculos financeiros.
        if (Math.abs(final_fv - fv) < 0.01) { 
            return final_n;
        }
        
        return null; // Retorna nulo se nenhuma solução for encontrada com a precisão desejada.
    }

 // financialcalculator.js

// ... (código anterior do arquivo)

    function calculateRate(n, pmt, pv, fv) { // Retorna a taxa em %
        const cacheKey = `I_${n}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        if (n <= 0) throw new Error("O NPER deve ser positivo para calcular a TAXA.");

        if (pmt === 0) {
            // --- INÍCIO DA MODIFICAÇÃO ---
            if (pv === 0) {
                throw new Error("Com PMT zero, o Valor Presente (PV) não pode ser zero para calcular a Taxa.");
            }
            // Adiciona a verificação de sinais opostos, que é a causa do erro.
            if (Math.sign(pv) === Math.sign(fv)) {
                throw new Error("Com PMT zero, o Valor Presente (PV) e o Valor Futuro (FV) devem ter sinais opostos.");
            }
            // --- FIM DA MODIFICAÇÃO ---

            let base = -fv / pv;
            // A verificação de raiz par de número negativo se torna desnecessária com a validação de sinais acima,
            // pois 'base' será sempre positiva.

            // Caso especial: se fv é 0, a taxa que zera o valor é -100%.
            if (base === 0 && fv === 0) return -100; 

            const rate = (Math.pow(base, 1 / n) - 1) * 100;
            calculationCache[cacheKey] = rate;
            return rate;
        }

        let rateGuess = 0.1; 
        const MAX_ITER = 100;
        const TOLERANCE = 1e-7; 

        for (let iter = 0; iter < MAX_ITER; iter++) {
            if (rateGuess <= -1 + 1e-9) rateGuess = -1 + 1e-9; 

            const guessFactor = Math.pow(1 + rateGuess, n);
            let fValue;
            if (Math.abs(rateGuess) < 1e-9) { 
                 fValue = pv + pmt * n + fv;
            } else {
                 fValue = pv * guessFactor + pmt * (guessFactor - 1) / rateGuess + fv;
            }
            
            if (Math.abs(fValue) < TOLERANCE) { 
                calculationCache[cacheKey] = rateGuess * 100;
                return rateGuess * 100;
            }

            let fDerivative;
            if (Math.abs(rateGuess) < 1e-9) { 
                 fDerivative = n * pv + pmt * n * (n - 1) / 2; 
                 if (n===1) fDerivative = pv; 
            } else {
                 fDerivative = n * pv * Math.pow(1 + rateGuess, n - 1) +
                                pmt * (n * rateGuess * Math.pow(1 + rateGuess, n - 1) - (guessFactor - 1)) / Math.pow(rateGuess, 2);
            }

            if (Math.abs(fDerivative) < 1e-10) {
                break; 
            }

            const newRateGuess = rateGuess - fValue / fDerivative;

            if (Math.abs(newRateGuess - rateGuess) < TOLERANCE) {
                calculationCache[cacheKey] = newRateGuess * 100;
                return newRateGuess * 100;
            }
            rateGuess = newRateGuess;

            if (rateGuess < -0.999) rateGuess = -0.999; 
            if (rateGuess > 10) rateGuess = 10; 
        }
        throw new Error("Não foi possível convergir para uma taxa de juros. Verifique os valores de entrada ou tente uma estimativa inicial diferente, se possível.");
    }

    // --- LÓGICA DE ARRASTAR PARA O MODAL DE AMORTIZAÇÃO ---
    if (amortizationModal && amortizationModalContentEl) {
        let isAmortizationDragging = false;
        let amortizationDragOffsetX, amortizationDragOffsetY;

        amortizationModalContentEl.style.cursor = 'grab'; 

        amortizationModalContentEl.addEventListener('mousedown', function(e) {
            const targetTagName = e.target.tagName.toLowerCase();
            const isInteractiveElement = ['button', 'input', 'select', 'textarea', 'table', 'td', 'th', 'tr', 'tbody', 'thead'].includes(targetTagName) ||
                                         e.target.classList.contains('close') ||
                                         e.target.closest('.amortization-table') || 
                                         e.target.closest('.amortization-summary');  

            if (isInteractiveElement) return; 

            isAmortizationDragging = true;

            if (getComputedStyle(amortizationModalContentEl).position !== 'absolute') {
                const rect = amortizationModalContentEl.getBoundingClientRect();
                amortizationModalContentEl.style.position = 'absolute';
                amortizationModalContentEl.style.left = rect.left + 'px';
                amortizationModalContentEl.style.top = rect.top + 'px';
                amortizationModalContentEl.style.margin = '0'; 
            }
            
            amortizationDragOffsetX = e.clientX - amortizationModalContentEl.offsetLeft;
            amortizationDragOffsetY = e.clientY - amortizationModalContentEl.offsetTop;
            amortizationModalContentEl.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; 

            document.addEventListener('mousemove', onAmortizationMouseMove);
            document.addEventListener('mouseup', onAmortizationMouseUp);
        });

        function onAmortizationMouseMove(e) {
            if (!isAmortizationDragging) return;
            e.preventDefault();
            let newLeft = e.clientX - amortizationDragOffsetX;
            let newTop = e.clientY - amortizationDragOffsetY;

            const vpWidth = window.innerWidth;
            const vpHeight = window.innerHeight;
            const modalWidth = amortizationModalContentEl.offsetWidth;
            const modalHeight = amortizationModalContentEl.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, vpWidth - modalWidth));
            newTop = Math.max(0, Math.min(newTop, vpHeight - modalHeight));

            amortizationModalContentEl.style.left = newLeft + 'px';
            amortizationModalContentEl.style.top = newTop + 'px';
        }

        function onAmortizationMouseUp() {
            if (!isAmortizationDragging) return;
            isAmortizationDragging = false;
            amortizationModalContentEl.style.cursor = 'grab';
            document.body.style.userSelect = ''; 
            document.removeEventListener('mousemove', onAmortizationMouseMove);
            document.removeEventListener('mouseup', onAmortizationMouseUp);
        }
    }
    // --- FIM DA LÓGICA DE ARRASTAR PARA O MODAL DE AMORTIZAÇÃO ---

});