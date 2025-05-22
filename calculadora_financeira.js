// calculadora_financeira.js

// Função para calcular corretamente o total de juros
function calcularTotalJuros(n, i, pmt, pv) {
    // O cálculo do total de juros deve ser consistente, independentemente dos sinais
    // A variável isFinanciamento foi removida pois não estava sendo utilizada.
    // A lógica abaixo funciona para financiamentos e investimentos devido ao uso de Math.abs()
    // e à forma como o saldo e juros são calculados.

    if (i === 0) {
        // Com taxa zero, não há juros
        return 0;
    }
    
    // Principal (valor do empréstimo/investimento inicial)
    const principal = Math.abs(pv);
    
    // Para calcular juros corretamente, vamos simular a amortização
    let saldo = principal; // Saldo devedor (financiamento) ou saldo investido
    let totalJurosCalculado = 0;
    
    for (let periodo = 1; periodo <= n; periodo++) {
        // Juros do período sobre o saldo atual
        const jurosPeriodo = saldo * i;
        totalJurosCalculado += jurosPeriodo;
        
        // Amortização: parte do pagamento que reduz o principal
        // Math.abs(pmt) é o valor total do pagamento/aporte
        const amortizacao = Math.abs(pmt) - jurosPeriodo;
        
        // Atualizar saldo: reduzir o principal pela amortização
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
    const closeModalBtn = document.getElementById('closeModal'); // Renomeado para evitar conflito com a variável 'closeModal' da calculadora.js se estivessem no mesmo escopo global
    const historyContent = document.getElementById('historyContent');
    
    const amortizationModal = document.getElementById('amortizationModal');
    const closeAmortizationModalBtn = document.getElementById('closeAmortizationModal'); // Renomeado
    const amortizationContent = document.getElementById('amortizationContent');
    
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
        dropdownList.style.display = 'none';
        
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
                dropdownList.style.display = 'none';
                localStorage.setItem('lastCalculateField', option.value);
                // console.log("Campo a calcular selecionado:", option.value);
            });
            dropdownList.appendChild(dropdownItem);
        }
        
        dropdownButton.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownList.style.display = dropdownList.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', () => { dropdownList.style.display = 'none'; });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdownList.style.display = 'none'; });
        
        customDropdown.appendChild(dropdownButton);
        customDropdown.appendChild(dropdownList);
        originalSelect.parentNode.insertBefore(customDropdown, originalSelect.nextSibling);
        
        // Os estilos CSS para o dropdown personalizado são mantidos aqui para encapsulamento,
        // mas poderiam ser movidos para o arquivo CSS principal.
        const style = document.createElement('style');
        style.textContent = `
            .custom-dropdown { position: relative; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .dropdown-button { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #dee2e6; border-radius: 5px; cursor: pointer; background-color: white; transition: border-color 0.3s; font-size: 16px; }
            .dropdown-button:hover, .dropdown-button:focus { outline: none; border-color: #3a7ca5; box-shadow: 0 0 0 2px rgba(58, 124, 165, 0.2); }
            .dropdown-icon { margin-left: 8px; color: #3a7ca5; }
            .dropdown-list { position: absolute; top: 100%; left: 0; width: 100%; background-color: white; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); z-index: 100; max-height: 300px; overflow-y: auto; }
            .dropdown-item { padding: 6px 12px; cursor: pointer; transition: background-color 0.2s; }
            .dropdown-item:hover { background-color: #f8f9fa; }
            .dropdown-item.selected { background-color: #e9f2f7; color: #3a7ca5; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }
    
    if (calculateFieldSelect) {
        calculateFieldSelect.addEventListener('change', function(event) {
            // console.log("Campo a calcular alterado via select original:", calculateFieldSelect.value);
        });
        if (localStorage.getItem('lastCalculateField')) {
            calculateFieldSelect.value = localStorage.getItem('lastCalculateField');
        }
    }
    
    // Event listeners para botões
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
    
    // Ajuste de sinais (manual, não mais automático para FV)
    if (paymentInput) paymentInput.addEventListener('input', adjustSignals); // Pode ser removido se não houver mais lógica em adjustSignals
    if (presentValueInput) presentValueInput.addEventListener('input', adjustSignals); // Idem


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
            showError("Erro ao dividir taxa: " + error.message);
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
            inputElement.value = (-val).toFixed(2); // Garante 2 casas decimais após inversão
        }
        setTimeout(() => { adjustingSignals = false; }, 100); // Reduzido timeout
    }
    
    // Função adjustSignals mantida caso haja lógica futura, mas atualmente não faz muito.
    function adjustSignals() {
        if (adjustingSignals) return;
        adjustingSignals = true;
        // Nenhuma lógica de ajuste automático de sinal ativa por padrão agora.
        // O usuário tem controle total sobre os sinais dos campos.
        adjustingSignals = false;
    }
    
    function clearFields() {
        if(periodsInput) periodsInput.value = "12";
        if(rateInput) rateInput.value = "1.0"; // Mantido como 1.0 para taxa
        if(paymentInput) paymentInput.value = "0.00";
        if(presentValueInput) presentValueInput.value = "1000.00";
        if(futureValueInput) futureValueInput.value = "0.00";
        if(resultContainer) resultContainer.classList.remove('visible');
        hideError();
        
        if (interestValueElement) interestValueElement.textContent = '';
        if (totalPaymentsElement) totalPaymentsElement.textContent = '';
    }
    
    function formatCurrency(value) {
        if (isNaN(value) || value === null) return "0,00"; // Ou algum placeholder
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
        const record = { type, calculatedValue, originalValue, n, i, pmt, pv, fv, interestAmount, totalPayments, date: new Date().toLocaleString() };
        calculationHistory.unshift(record);
        if (calculationHistory.length > MAX_HISTORY) calculationHistory.pop();
    }
    
    function showHistory() {
        if (!historyContent || !historyModal) return;
        if (calculationHistory.length === 0) {
            historyContent.innerHTML = '<div class="empty-history">Não há cálculos no histórico.</div>';
        } else {
            historyContent.innerHTML = '';
            calculationHistory.forEach((calc, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                // AJUSTE: Texto do histórico para totalPayments
                historyItem.innerHTML = `
                    <div class="history-detail">${index + 1}. Cálculo de ${getLabelForField(calc.type)}:</div>
                    <div class="history-detail history-result">Resultado: ${calc.type === 'rate' ? formatRate(calc.calculatedValue) + "%" : formatCurrency(calc.calculatedValue)}</div>
                    <div class="history-detail">Períodos: ${calc.n}, Taxa: ${formatRate(calc.i)}%, PMT: ${formatCurrency(calc.pmt)}</div>
                    <div class="history-detail">PV: ${formatCurrency(calc.pv)}, FV: ${formatCurrency(calc.fv)}</div>
                    <div class="history-detail">Total dos Juros: ${formatCurrency(calc.interestAmount)}</div>
                    <div class="history-detail">Total das Prestações/Aportes: ${formatCurrency(calc.totalPayments)}</div>
                `;
                historyContent.appendChild(historyItem);
            });
        }
        historyModal.style.display = "block";
    }
    
    function showAmortizationTable() {
        if (!amortizationContent || !amortizationModal) return;
        try {
            hideError();
            const n = parseInt(periodsInput.value) || 0;
            const i = (parseFloat(rateInput.value) || 0) / 100;
            let pmtVal = parseFloat(paymentInput.value) || 0; // Renomeado para evitar conflito com parâmetro pmt
            const pv = parseFloat(presentValueInput.value) || 0;
            const fv = parseFloat(futureValueInput.value) || 0;

            if (n <= 0) throw new Error("O número de períodos deve ser maior que zero.");
            if (i <= 0 && pmtVal !== 0) throw new Error("A taxa deve ser maior que zero para amortização com prestações.");
            if (i === 0 && pmtVal === 0 && pv === -fv) { // Caso de taxa zero e sem prestações, só transferência
                 amortizationContent.innerHTML = '<div class="empty-amortization">Com taxa zero e sem prestações, a amortização é direta. O saldo final será igual ao valor futuro.</div>';
                 amortizationModal.style.display = "block";
                 return;
            }
             if (i === 0 && pmtVal === 0 && pv !== -fv) {
                throw new Error("Com taxa e prestação zero, PV deve ser o oposto de FV para uma amortização válida.");
            }


            const amortizationData = calculateAmortizationTable(n, i, pmtVal, pv, fv);
            
            if (amortizationData.length === 0) {
                amortizationContent.innerHTML = '<div class="empty-amortization">Não foi possível gerar a tabela com os valores informados. Verifique se PMT é suficiente para cobrir os juros.</div>';
            } else {
                const totalPrincipal = amortizationData.reduce((sum, row) => sum + row.principalPayment, 0);
                const totalInterest = amortizationData.reduce((sum, row) => sum + row.interestPayment, 0);
                const totalPayment = amortizationData.reduce((sum, row) => sum + row.payment, 0);
                
                let tableHTML = `
                    <div class="amortization-summary">
                        <p>Total das Prestações: ${formatCurrency(totalPayment)}</p>
                        <p>Total do Principal Amortizado: ${formatCurrency(totalPrincipal)}</p>
                        <p>Total de Juros Pagos/Recebidos: ${formatCurrency(totalInterest)}</p>
                    </div>
                    <table class="amortization-table">
                        <thead><tr><th>Período</th><th>Prestação</th><th>Juros</th><th>Juros Acum.</th><th>Principal</th><th>Principal Acum.</th><th>Saldo Final</th></tr></thead>
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
            amortizationModal.style.display = "block";
        } catch (error) {
            showError("Amortização: " + error.message);
        }
    }
    
    // Função para calcular tabela de amortização
    function calculateAmortizationTable(n, i, pmt, pv, fv) {
        // Se pmt não for fornecido (ou zero) e for necessário, calcula.
        // No entanto, para amortização, pmt geralmente é um input.
        // Se pmt é zero e i > 0, pode ser um cenário de capitalização/descapitalização sem fluxos intermediários.
        let pmtCalculado = pmt;
        if (pmtCalculado === 0 && pv !== 0 && fv !== 0 && i > 0) { // Se PMT é zero, não há amortização periódica, só juros sobre saldo.
            // Para este caso, a tabela de amortização tradicional não se aplica da mesma forma.
            // Poderíamos mostrar a evolução do saldo com juros.
            // Por ora, se pmt é zero, vamos assumir que é um financiamento/investimento que será liquidado no final,
            // ou que o pmt deveria ter sido calculado.
            // Se o objetivo é mostrar uma tabela onde o PMT cobre os juros e amortiza, PMT não pode ser 0 (a menos que i=0).
            // Vamos calcular o PMT necessário se ele for 0 e não for taxa zero.
            if (i !== 0) {
                 pmtCalculado = calculatePayment(n, i, pv, fv);
            } else if (pv + fv !== 0) { // Taxa zero, pmt zero, mas pv+fv !=0
                pmtCalculado = -(pv + fv) / n; // Amortização linear
            }
        }


        const table = [];
        let currentBalance = pv; // Usar pv diretamente, seu sinal indica direção
        let cumulativeInterest = 0;
        let cumulativePrincipal = 0;

        // Convenção: pv > 0 é um empréstimo recebido, pmt < 0 são pagamentos.
        // pv < 0 é um investimento feito, pmt > 0 são recebimentos/resgates parciais.

        for (let period = 1; period <= n; period++) {
            const interestForPeriod = currentBalance * i;
            // O sinal de pmtCalculado deve ser oposto ao de pv para amortizar um financiamento,
            // ou pode ser na mesma direção para aportes adicionais a um investimento.
            // Para uma tabela de amortização padrão, pmt visa reduzir o saldo (ou aumentar se for investimento e pmt for aporte).
            
            // Se pv > 0 (empréstimo), esperamos pmtCalculado < 0.
            // Se pv < 0 (investimento), esperamos pmtCalculado > 0 para retiradas, ou < 0 para aportes.
            // Vamos assumir que pmtCalculado é o fluxo de caixa do período.
            
            let principalPaymentPart;
            if (i === 0) { // Sem juros
                principalPaymentPart = -pmtCalculado; // Amortização é o próprio pagamento (com sinal invertido de PMT)
            } else {
                 principalPaymentPart = -pmtCalculado - interestForPeriod;
            }


            // Ajustes para exibição e acúmulo (usando valores absolutos onde apropriado para totais)
            const displayPmt = Math.abs(pmtCalculado);
            const displayInterest = Math.abs(interestForPeriod);
            const displayPrincipal = Math.abs(principalPaymentPart); // O quanto do principal foi "movido"

            cumulativeInterest += displayInterest;
            cumulativePrincipal += displayPrincipal;
            
            currentBalance += interestForPeriod + pmtCalculado; // Saldo é afetado por juros e pelo PMT
                                                                // (ou currentBalance -= principalPaymentPart) -> currentBalance = currentBalance - (-pmt - interest) = currentBalance + pmt + interest

            // Correção para o saldo final no último período para bater com FV
            if (period === n && fv !== 0 && Math.abs(currentBalance - fv) > 0.01) {
                // Ajustar o último PMT ou a última amortização para que o saldo final seja FV
                // Essa é uma simplificação; uma tabela de amortização real ajustaria a última parcela.
                // Por ora, vamos apenas notar a diferença se houver.
                // Se quisermos que o saldo final seja exatamente fv, o último pmt pode precisar ser ajustado.
                // Aqui, vamos assumir que pmt é fixo.
                if (Math.abs(currentBalance - fv) > 0.01) { // Se não bate com FV (desconsiderando arredondamentos)
                    // Se FV é o objetivo, o último PMT pode ter sido diferente.
                    // Ou, se o PMT é fixo, o FV pode ser o resultado natural.
                    // Para fins de tabela, vamos forçar o último saldo a ser FV e a última amortização/PMT pode ser diferente.
                    // Esta parte pode ser complexa se pmt é fixo. Vamos manter o fluxo natural.
                }
            }


            table.push({
                period: period,
                payment: displayPmt, // O que é pago/recebido
                interestPayment: displayInterest, // Juros do período
                cumulativeInterest: cumulativeInterest,
                principalPayment: displayPrincipal, // Amortização do principal
                cumulativePrincipal: cumulativePrincipal,
                endingBalance: currentBalance 
            });

            // Pequena tolerância para zerar o saldo
            if (Math.abs(currentBalance - fv) < 0.005 && period <=n) {
                 // Se o saldo atingiu o FV (ou zero se FV=0) antes do tempo com o PMT dado,
                 // pode indicar que o PMT era maior que o necessário, ou N menor.
                 // Para a tabela, podemos continuar ou parar. Vamos continuar para mostrar todos os N períodos.
            }
        }
        return table;
    }
    
    function getLabelForField(field) {
        const labels = { periods: 'Períodos (n)', rate: 'Taxa (i)', payment: 'Prestação (PMT)', presentValue: 'Valor Atual (PV)', futureValue: 'Valor Futuro (FV)'};
        return labels[field] || field;
    }
    
    // Mantida para possível uso futuro, mas atualmente não ajusta sinais.
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
            // Usar os valores diretamente dos inputs, pois adjustSignalsBeforeCalculation não faz transformações
            const n_val = parseInt(periodsInput.value) || 0;
            const i_val = (parseFloat(rateInput.value) || 0) / 100;
            const pmt_val = parseFloat(paymentInput.value) || 0;
            const pv_val = parseFloat(presentValueInput.value) || 0;
            const fv_val = parseFloat(futureValueInput.value) || 0;
            const fieldToCalculate = calculateFieldSelect.value;
            
            validateInput(n_val, i_val, pmt_val, pv_val, fv_val, fieldToCalculate);
            
            let result;
            let originalValueInput; // O valor que estava no campo a ser calculado
            
            switch (fieldToCalculate) {
                case 'periods':
                    originalValueInput = n_val;
                    result = calculatePeriods(i_val, pmt_val, pv_val, fv_val);
                    if (result !== null) periodsInput.value = Math.round(result);
                    break;
                case 'rate':
                    originalValueInput = parseFloat(rateInput.value); // Taxa em %
                    result = calculateRate(n_val, pmt_val, pv_val, fv_val); // Retorna taxa em %
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
                
                // Obter valores atualizados para cálculo de juros e total
                const finalN = parseInt(periodsInput.value) || 0;
                const finalRatePercent = parseFloat(rateInput.value) || 0; // Taxa em %
                const finalI = finalRatePercent / 100; // Taxa decimal
                const finalPmt = parseFloat(paymentInput.value) || 0;
                const finalPv = parseFloat(presentValueInput.value) || 0;
                //const finalFv = parseFloat(futureValueInput.value) || 0; // Não usado diretamente aqui

                let interestAmount = 0;
                let totalPrincipalPayments = 0; // Soma dos PMTs (ou o principal se não houver PMT)

                // A função calcularTotalJuros simula a amortização.
                // PV e PMT para calcularTotalJuros devem ter a convenção de sinais correta (ex: PV > 0, PMT < 0 para empréstimo)
                // As funções de cálculo (calculatePayment, etc.) já retornam PMT com sinal apropriado.
                // Se PV é calculado, 'result' é o PV. Se PMT é calculado, 'finalPmt' é o PMT.
                
                // Total de pagamentos/aportes é a soma dos PMTs
                totalPrincipalPayments = Math.abs(finalPmt * finalN);

                // Para calcular juros, precisamos do PV e PMT consistentes.
                // Se PV foi calculado, usamos `result` (que é o PV calculado).
                // Se PMT foi calculado, usamos `finalPmt`.
                // O PV usado para `calcularTotalJuros` deve ser o valor inicial do fluxo.
                interestAmount = calcularTotalJuros(finalN, finalI, finalPmt, finalPv);


                if (interestValueElement) interestValueElement.textContent = formatCurrency(interestAmount);
                if (totalPaymentsElement) totalPaymentsElement.textContent = formatCurrency(totalPrincipalPayments);
                
                resultContainer.classList.add('visible');
                
                addToHistory(fieldToCalculate, result, originalValueInput, finalN, finalRatePercent, finalPmt, finalPv, parseFloat(futureValueInput.value), interestAmount, totalPrincipalPayments);
            } else if (result === null || !isFinite(result)) {
                showError("Não foi possível calcular o valor ou resultado é inválido.");
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
        // i é taxa decimal aqui. Permitir taxa zero.
        if (fieldToCalculate !== 'rate' && i < 0 && Math.abs(i) > 1e-9) { // Permitir i=0
             //throw new Error("A taxa (i) não pode ser negativa."); // Taxa negativa pode ser válida em alguns contextos teóricos.
        }

        // Validações específicas para cálculo de NPER (Períodos)
        if (fieldToCalculate === 'periods') {
            if (i === 0) { // Taxa zero
                if (pmt === 0) { // Taxa zero e PMT zero
                    if (pv === 0 && fv === 0) throw new Error("Todos os valores são zero, não é possível calcular períodos.");
                    if (pv + fv !== 0) throw new Error("Com taxa e PMT zero, PV deve ser o oposto de FV para calcular períodos.");
                } else { // Taxa zero, PMT não zero
                    if (pv + fv === 0 && pmt !== 0) { /*ok, N=0*/ }
                    else if (pmt > 0 && pv + fv > 0) throw new Error("Conflito de sinais: com PMT positivo (entrada), PV+FV (saída líquida) não pode ser positivo.");
                    else if (pmt < 0 && pv + fv < 0) throw new Error("Conflito de sinais: com PMT negativo (saída), PV+FV (entrada líquida) não pode ser negativo.");
                }
            } else { // Taxa não zero
                if (pmt === 0) { // Taxa não zero, PMT zero
                    if (pv === 0 && fv === 0) throw new Error("PV e FV são zero com PMT zero, não é possível calcular períodos.");
                    if (pv === 0 || fv === 0) { /* ok, um é zero */ }
                    else if ((pv > 0 && fv > 0 && fv <= pv) || (pv < 0 && fv < 0 && fv >= pv)) {
                         //throw new Error("Com PMT zero, para taxa positiva, |FV| deve ser > |PV| se ambos têm mesmo sinal (ou oposto se sinais diferentes).");
                    }
                     if ( (pv > 0 && fv <0 && Math.abs(fv) < Math.abs(pv) ) || (pv < 0 && fv > 0 && Math.abs(fv) > Math.abs(pv) )  ){
                        // Ex: pv=100, fv=-50. Impossível.
                        // Ex: pv=-100, fv=200. Ok.
                     }
                } else { // Taxa não zero, PMT não zero
                    // Esta é a situação mais complexa, geralmente resolvida numericamente.
                    // A fórmula de NPER pode ter log de negativo se os sinais não forem consistentes.
                    // Ex: pv=1000, pmt=10, i=0.01, fv=0. É um cenário onde fv é alcançado por pagamentos.
                    // Se pv=1000, pmt=-100 (pagando), i=0.01, fv=2000 (quer que o empréstimo aumente mesmo pagando?) -> erro no log
                    if ( (-pmt/i + pv) !==0 && (fv + pmt/i) / (-pmt/i + pv) <=0 ){
                         //throw new Error("Combinação de valores inválida para cálculo de períodos (log de não positivo). Verifique os sinais de PV, PMT e FV.");
                    }
                }
            }
        }
        // Outras validações podem ser adicionadas aqui para RATE, PMT, PV, FV.
        return true;
    }
    
    // Funções de cálculo financeiro (PV, FV, PMT, NPER, RATE)
    // Essas funções assumem que 'i' é a taxa por período (decimal) e 'n' é o número de períodos.
    // A convenção de sinais é importante: dinheiro recebido é positivo, dinheiro pago é negativo.

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
            if (factor - 1 === 0) throw new Error("Configuração inválida para calcular PMT (divisão por zero no fator).");
            // Fórmula padrão PMT: PMT = (PV*i*(1+i)^n + FV*i) / ((1+i)^n - 1)
            // Ajustada para convenção de sinais (PV positivo, PMT geralmente negativo)
             pmt = - (fv * i + pv * i * factor) / (factor - 1);
        }
        calculationCache[cacheKey] = pmt;
        return pmt;
    }
    
    function calculatePeriods(i, pmt, pv, fv) { // NPER
        const cacheKey = `N_${i}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        let n;
        if (i === 0) {
            if (pmt === 0) { // Taxa zero, PMT zero
                 // Se pv + fv = 0, qualquer n > 0 é teoricamente válido, mas não calculável.
                 // A validação já deve ter pego se pv + fv != 0.
                if (pv + fv !== 0) throw new Error("Com taxa e PMT zero, PV deve ser oposto de FV.");
                return 0; // Ou indefinido, pois não há fluxo para determinar N.
            }
            n = -(pv + fv) / pmt;
        } else {
            // Se pmt é zero (só pv e fv)
            if (pmt === 0) {
                if (pv === 0 && fv === 0) return 0; // Ou erro
                if (pv === 0 || fv === 0 || (pv > 0 && fv < 0) || (pv < 0 && fv > 0)) { // Sinais opostos ou um é zero
                     // log(negativo) or log(0) error
                     if (fv / -pv <= 0 ) throw new Error("Com PMT zero, FV e -PV devem ter mesmo sinal e ser > 0 para log.");
                     n = Math.log(fv / -pv) / Math.log(1 + i);
                } else { // Mesmo sinal
                    if (-fv / pv <= 0) throw new Error("Com PMT zero, -FV e PV devem ter mesmo sinal e ser > 0 para log.");
                     n = Math.log(-fv / pv) / Math.log(1 + i); // FV = PV * (1+i)^N
                }

            } else {
                 // Fórmula NPER: log((pmt + fv*i) / (pmt + pv*i)) / log(1+i) -- esta é uma variação
                 // Outra: N = ln(-(fv*i + pmt)/(pv*i + pmt)) / ln(1+i)
                 // Garantir que os argumentos do log sejam positivos
                const term1 = pmt + fv * i;
                const term2 = pmt + pv * i;
                if (term1 === 0 || term2 === 0 || (term1 / term2 <= 0)) {
                    // Tentar busca binária se a fórmula direta falhar devido a log(negativo/zero)
                    // console.warn("Fórmula NPER direta resultaria em log inválido, tentando busca binária.");
                    return calculatePeriodsBinarySearch(i, pmt, pv, fv);
                }
                 n = Math.log(term1 / term2) / Math.log(1 + i);
            }
        }
        if (n < 0 || !isFinite(n)) {
            // Se o cálculo resultar em N negativo ou infinito, tentar busca binária
            // console.warn(`NPER calculado ${n} inválido, tentando busca binária.`);
            return calculatePeriodsBinarySearch(i, pmt, pv, fv);
        }
        calculationCache[cacheKey] = n;
        return n;
    }
    
    // calculatePeriodsBinarySearch, calculateRateZeroPayment, calculateRateNewtonRaphson, calculateRate
    // são mantidas como no script original, pois são métodos numéricos padrão.
    // Pequenos ajustes ou comentários podem ser adicionados se necessário, mas a lógica central é padrão.

    function calculateRate(n, pmt, pv, fv) { // Retorna taxa em %
        const cacheKey = `I_${n}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        if (n <= 0) throw new Error("NPER deve ser positivo para calcular RATE.");

        // Caso especial: PMT é zero
        if (pmt === 0) {
            if (pv + fv === 0 && pv === 0) return 0; // Todos zero
            if (pv + fv === 0) return 0; // Ex: pv = -100, fv = 100. Taxa é 0 se n>0. Se n=0, indefinido.
            if (pv === 0) throw new Error("PV não pode ser zero com PMT zero para calcular RATE (a menos que FV também seja zero).");
            // FV = -PV * (1+i)^n  => (1+i)^n = -FV/PV => 1+i = (-FV/PV)^(1/n)
            if (-fv / pv <= 0) throw new Error("Com PMT zero, (-FV/PV) deve ser positivo para calcular RATE.");
            const rate = (Math.pow(-fv / pv, 1 / n) - 1) * 100;
            calculationCache[cacheKey] = rate;
            return rate;
        }

        // Iteração para encontrar a taxa (método de Newton-Raphson ou similar)
        // Chute inicial
        let rateGuess = 0.1; // 10%
        const MAX_ITER = 100;
        const TOLERANCE = 1e-7;

        for (let iter = 0; iter < MAX_ITER; iter++) {
            const guessFactor = Math.pow(1 + rateGuess, n);
            // f(i) = pv * (1+i)^n + pmt * ((1+i)^n - 1)/i + fv = 0
            let fValue = pv * guessFactor + pmt * (guessFactor - 1) / (rateGuess === 0 ? 1e-10 : rateGuess) + fv;
            
            // Derivada de f(i) em relação a i:
            // f'(i) = n*pv*(1+i)^(n-1) + pmt * [ n*i*(1+i)^(n-1) - ((1+i)^n - 1) ] / i^2
            let fDerivative;
            if (rateGuess === 0) { // Aproximação para derivada em i=0
                fDerivative = n * pv + pmt * n * (n - 1) / 2; // Usando expansão de Taylor
            } else {
                 fDerivative = n * pv * Math.pow(1 + rateGuess, n - 1) +
                                pmt * (n * rateGuess * Math.pow(1 + rateGuess, n - 1) - (guessFactor - 1)) / Math.pow(rateGuess, 2);
            }

            if (Math.abs(fDerivative) < 1e-10) { // Derivada muito pequena, pode não convergir bem
                // console.warn("Derivada próxima de zero na iteração da taxa.");
                break; // Ou tentar um chute diferente
            }

            const newRateGuess = rateGuess - fValue / fDerivative;

            if (Math.abs(newRateGuess - rateGuess) < TOLERANCE) {
                calculationCache[cacheKey] = newRateGuess * 100;
                return newRateGuess * 100; // Taxa em %
            }
            rateGuess = newRateGuess;

            if (rateGuess < -0.99) rateGuess = -0.99; // Limitar taxa negativa para evitar problemas
            if (rateGuess > 10) rateGuess = 10; // Limitar taxa positiva muito alta (1000%)
        }
        throw new Error("Não foi possível convergir para uma taxa de juros. Verifique os valores de entrada.");
    }

});