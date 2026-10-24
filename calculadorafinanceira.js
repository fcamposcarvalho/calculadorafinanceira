// financialcalculator.js

// financialcalculator.js -> Substitua a função existente por esta

/**
 * Converte uma string de valor para número, lidando de forma inteligente com os formatos
 * brasileiro (1.000,50) e internacional (1,000.50) usando uma regra de detecção.
 * Aceita "R$", "%" e espaços entre os milhares. Campo vazio vale 0; texto que não é número devolve NaN
 * (antes virava 0 sem aviso: "R$ 1.000,00" era 0, "1 000,50" era 1, "abc" era 0).
 * @param {string} valueString A string a ser convertida.
 * @returns {number} O número convertido, ou NaN se o texto não for um número.
 */
function parseFinancialInput(valueString) {
    if (typeof valueString !== 'string' || valueString.trim() === '') {
        return 0;
    }
    const cleanString = valueString.replace(/R\$/gi, '').replace(/%$/, '').replace(/[\s ]/g, '');
    if (!/^[+-]?[\d.,]*\d[\d.,]*$/.test(cleanString)) return NaN;
    let sanitizedString = cleanString; // Inicializa a variável aqui

    // Heurística de detecção: verifica se há um ponto decimal no formato internacional.
    // A condição é: existe um ponto, e o número de caracteres após ele NÃO é 3,
    // E esse ponto aparece depois da última vírgula (para tratar casos como 1,234.56).
    const lastDotIndex = cleanString.lastIndexOf('.');
    const lastCommaIndex = cleanString.lastIndexOf(',');
    // "0.125" ou ".5": antes do ponto só há zero, então o ponto não pode ser separador de milhar (antes virava 125)
    const zeroIntegerPart = lastCommaIndex === -1 && cleanString.indexOf('.') === lastDotIndex &&
                            /^[+-]?0*$/.test(cleanString.slice(0, lastDotIndex));
    const isInternationalDecimal = lastDotIndex > -1 &&
                                   ((cleanString.length - lastDotIndex - 1) !== 3 || zeroIntegerPart) &&
                                   lastDotIndex > lastCommaIndex;

    if (isInternationalDecimal) {
        // Formato internacional detectado. Remove as vírgulas (milhar).
        // Ex: "1,234,567.89" -> "1234567.89"
        sanitizedString = cleanString.replace(/,/g, '');
    } else {
        // Assume formato brasileiro (ou inteiro com pontos de milhar).
        // Remove os pontos (milhar) e troca a vírgula (decimal) por ponto.
        // Ex: "1.234.567,89" -> "1234567.89"
        // Ex: "200.000.000" -> "200000000"
        sanitizedString = cleanString.replace(/\./g, '').replace(',', '.');
    }

    // Sobrou mais de um separador decimal ("12,5,3", "1.000.5"): não é número
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(sanitizedString)) return NaN;
    return parseFloat(sanitizedString);
}

/**
 * Arredonda em centavos, meio centavo para longe do zero, sem o erro do ponto flutuante: 110.935 × 1,1% = 1.220,285
 * fica guardado como 1.220,28499… e dava 1.220,28 com Math.round(x * 100) / 100. Os centavos saem da parte
 * fracionária (abs − inteiro é exato no binário) e só o que estiver a ~1 ulp do meio centavo conta como meio
 * (janela de no máximo 0,001 centavo: acima de ~R$ 45 bilhões o próprio double já não guarda o centavo exato).
 * @param {number} value O valor a arredondar.
 * @returns {number} O valor em centavos.
 */
function roundCents(value) {
    if (!isFinite(value)) return value;
    const abs = Math.abs(value);
    const whole = Math.floor(abs);
    const fracCents = (abs - whole) * 100;
    const base = Math.floor(fracCents);
    const nearHalf = Math.abs(fracCents - base - 0.5) <= Math.min(abs * 100 * Number.EPSILON, 1e-3);
    const cents = nearHalf ? base + 1 : Math.round(fracCents);
    return Math.sign(value) * (whole + cents / 100);
}

/**
 * Formata um número para o padrão de moeda brasileiro (BRL).
 * @param {number} value O número a ser formatado.
 * @returns {string} A string formatada como moeda.
 */

function formatCurrency(value) {
    if (isNaN(value) || value === null) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(roundCents(value) || 0);
}
// --- FIM DAS FUNÇÕES HELPER ---


// Função para calcular corretamente o total de juros para Tabela Price
function calcularTotalJuros(n, i, pmt, pv) {
    if (i === 0) {
        return 0;
    }
    const principal = Math.abs(pv);
    const pmtVal = roundCents(Math.abs(pmt));
    let saldo = principal; 
    let totalJurosCalculado = 0;
    const nInteiro = Math.ceil(n);
    
    for (let periodo = 1; periodo <= nInteiro; periodo++) {
        const jurosPeriodo = roundCents(saldo * i);
        totalJurosCalculado = roundCents(totalJurosCalculado + jurosPeriodo);
        let amortizacao;
        if (periodo === nInteiro) {
            amortizacao = saldo;
        } else {
            amortizacao = roundCents(pmtVal - jurosPeriodo);
        }
        saldo = roundCents(saldo - amortizacao);
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
    const amortizationPriceBtn = document.getElementById('amortizationPriceBtn');
    const amortizationSacBtn = document.getElementById('amortizationSacBtn');
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
    const nominalRateBtn = document.getElementById('nominalRateBtn');
    const effectiveRateBtn = document.getElementById('effectiveRateBtn');
    
    createCustomDropdown();
    
    const historyModal = document.getElementById('historyModal');
    const closeModalBtn = document.getElementById('closeModal');
    const historyContent = document.getElementById('historyContent');
    
    const amortizationModal = document.getElementById('amortizationModal');
    const closeAmortizationModalBtn = document.getElementById('closeAmortizationModal');
    const amortizationContent = document.getElementById('amortizationContent');
    const amortizationModalTitle = document.getElementById('amortizationModalTitle');
    const amortizationModalContentEl = amortizationModal ? amortizationModal.querySelector('.modal-content') : null;


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
                dropdownList.classList.remove('visible');
                localStorage.setItem('lastCalculateField', option.value);
            });
            dropdownList.appendChild(dropdownItem);
        }
        
        dropdownButton.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownList.classList.toggle('visible');
        });
        
        document.addEventListener('click', () => { dropdownList.classList.remove('visible'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdownList.classList.remove('visible'); });
        
        customDropdown.appendChild(dropdownButton);
        customDropdown.appendChild(dropdownList);
        originalSelect.parentNode.insertBefore(customDropdown, originalSelect.nextSibling);
    }
    
    if (calculateFieldSelect) {
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
    if (nominalRateBtn) nominalRateBtn.addEventListener('click', calculateNominalRate);
    if (effectiveRateBtn) effectiveRateBtn.addEventListener('click', calculateEffectiveRate);
    if (calculateBtn) calculateBtn.addEventListener('click', calculate);
    if (amortizationPriceBtn) amortizationPriceBtn.addEventListener('click', showPriceAmortizationTable);
    if (amortizationSacBtn) amortizationSacBtn.addEventListener('click', showSacAmortizationTable);
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

    // Lê um campo numérico; texto que não é número dá erro com o nome do campo (antes virava 0 sem aviso)
    function readField(input, field) {
        const value = parseFinancialInput(input.value);
        if (isNaN(value)) {
            throw new Error(`Valor inválido em ${getLabelForField(field)}: "${input.value.trim()}". Use números como 1.000,50 ou -250.`);
        }
        return value;
    }

    function multiplyPeriods() {
        try {
            hideError();
            const periodValue = readField(periodsInput, 'periods');
            const newVal = periodValue * 12;
            periodsInput.value = (Math.round(newVal * 10000) / 10000).toString().replace('.', ',');
        } catch (error) {
            showError("Erro ao multiplicar períodos: " + error.message);
        }
    }
    
    function calculateNominalRate() {
        try {
            hideError();
            const rateValue = readField(rateInput, 'rate');
            rateInput.value = (rateValue / 12).toFixed(8).replace('.', ',');
        } catch (error) {
            showError("Erro ao dividir a taxa: " + error.message);
        }
    }

    function calculateEffectiveRate() {
        try {
            hideError();
            const annualRatePercent = readField(rateInput, 'rate');
            if (annualRatePercent <= -100) {
                showError("A taxa anual deve ser maior que -100% para calcular a taxa efetiva.");
                return;
            }
            const annualRateDecimal = annualRatePercent / 100;
            const monthlyEffectiveRate = Math.pow(1 + annualRateDecimal, 1/12) - 1;
            rateInput.value = (monthlyEffectiveRate * 100).toFixed(8).replace('.', ',');
        } catch (error) {
            showError("Erro ao calcular a taxa efetiva: " + error.message);
        }
    }
    
    function invertSign(field) {
        adjustingSignals = true;
        let inputElement;
        if (field === 'payment') inputElement = paymentInput;
        else if (field === 'presentValue') inputElement = presentValueInput;
        else if (field === 'futureValue') inputElement = futureValueInput;

        if (inputElement) {
            try {
                hideError();
                const val = readField(inputElement, field);
                inputElement.value = formatMoneyField(-val);
            } catch (error) {
                showError(error.message);
            }
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
        if(rateInput) rateInput.value = "1,00"; 
        if(paymentInput) paymentInput.value = "0,00";
        if(presentValueInput) presentValueInput.value = "1000,00";
        if(futureValueInput) futureValueInput.value = "0,00";
        if(resultContainer) resultContainer.classList.remove('visible');
        hideError();
        
        if (interestValueElement) interestValueElement.textContent = '';
        if (totalPaymentsElement) totalPaymentsElement.textContent = '';
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
        if (historyModalContentEl) {
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
                    <div class="history-detail history-result">Resultado: ${calc.type === 'rate' ? formatRate(calc.calculatedValue) + "%" : (calc.type === 'periods' ? (Math.round(calc.calculatedValue * 10000) / 10000).toString().replace('.', ',') : formatCurrency(calc.calculatedValue))}</div>
                    <div class="history-detail">Períodos: ${calc.n}, Taxa: ${formatRate(calc.i)}%, PMT: ${formatCurrency(calc.pmt)}</div>
                    <div class="history-detail">PV: ${formatCurrency(calc.pv)}, FV: ${formatCurrency(calc.fv)}</div>
                    <div class="history-detail">Total de Juros: ${formatCurrency(calc.interestAmount)}</div>
                    <div class="history-detail">Total de Pagamentos/Contribuições: ${formatCurrency(calc.totalPayments)}</div>
                `;
                historyContent.appendChild(historyItem);
            });
        }
        historyModal.style.display = "flex";
    }

	function showPriceAmortizationTable() {
		if (!amortizationContent || !amortizationModal || !amortizationModalContentEl) return;
	
		if (amortizationModalTitle) amortizationModalTitle.textContent = "Tabela de Amortização (PRICE)";
	
		try {
			hideError();
			const pmtFromInput = readField(paymentInput, 'payment');
			const nInput = readField(periodsInput, 'periods');
			const n = Math.ceil(nInput) || 0;
			const i = readField(rateInput, 'rate') / 100;
			const pv = readField(presentValueInput, 'presentValue');
			const fv = readField(futureValueInput, 'futureValue');
	
			if (n <= 0) throw new Error("O número de períodos deve ser maior que zero.");
			if (i < 0) throw new Error("A taxa de juros não pode ser negativa.");
			if (pv === 0) throw new Error("Informe o valor financiado (PV).");
			if (Math.abs(fv) > Math.abs(pv)) throw new Error("Para tabela de amortização, o valor residual (FV) deve ser menor ou igual ao capital financiado (PV) em valor absoluto.");
			
			// O FV da tabela é o saldo residual, com qualquer sinal digitado (como na SAC). A parcela sai com o residual do lado
			// oposto ao PV; com o mesmo sinal, a fórmula tratava o FV como valor a receber e a última parcela ficava negativa.
			const residualForPayment = -Math.sign(pv) * Math.abs(fv);
			const pmtCorreto = roundCents(calculatePayment(n, i, pv, residualForPayment));
			const notices = [];
			if (n !== nInput) notices.push(nRoundedNotice(nInput, n));
	
			// A tabela usa o PMT digitado quando ele fecha a conta (até 1 centavo); senão, o que fecha, e avisa
			let pmtParaTabela;
			if (pmtFromInput === 0) {
				pmtParaTabela = pmtCorreto;
				notices.push(`PMT não informado: a tabela usa a parcela que quita o financiamento, ${formatCurrency(Math.abs(pmtCorreto))}.`);
			} else if (Math.abs(Math.abs(pmtCorreto) - Math.abs(pmtFromInput)) > 0.01) {
				pmtParaTabela = pmtCorreto;
				if (n === nInput) {
					notices.push(`O PMT digitado (${formatCurrency(Math.abs(pmtFromInput))}) não quita ${formatCurrency(Math.abs(pv))} em ${installments(n)} a ${formatRate(i * 100)}%: a tabela usa ${formatCurrency(Math.abs(pmtCorreto))}.`);
				}
			} else {
				pmtParaTabela = pmtFromInput;
			}
	
			const amortizationData = calculatePriceAmortizationTable(n, i, pmtParaTabela, pv, fv);
			
			if (amortizationData.length === 0) {
				amortizationContent.innerHTML = '<div class="empty-amortization">Não foi possível gerar a tabela com os valores fornecidos. Verifique os dados.</div>';
			} else {
				displayAmortizationData(amortizationData, notices);
			}
	
			if (amortizationModalContentEl) {
				amortizationModalContentEl.style.position = '';
				amortizationModalContentEl.style.left = '';
				amortizationModalContentEl.style.top = '';
			}
			amortizationModal.style.display = "flex";
		} catch (error) {
			showError("Amortização (PRICE): " + error.message);
		}
	}
 
	function showSacAmortizationTable() {
		if (!amortizationContent || !amortizationModal || !amortizationModalContentEl) return;
	
		try {
			hideError();
			// A SAC não usa o PMT: a parcela sai da amortização constante mais os juros do período
			const fv = readField(futureValueInput, 'futureValue');
			if (amortizationModalTitle) {
				amortizationModalTitle.textContent = fv !== 0 ? "Tabela de Amortização (SAC com Valor Residual)" : "Tabela de Amortização (SAC)";
			}
			const nInput = readField(periodsInput, 'periods');
			const n = Math.ceil(nInput) || 0;
			const i = readField(rateInput, 'rate') / 100;
			const pv = readField(presentValueInput, 'presentValue');
	
			if (n <= 0) throw new Error("O número de períodos deve ser maior que zero.");
			if (i < 0) throw new Error("A taxa de juros não pode ser negativa.");
			if (pv === 0) throw new Error("Informe o valor financiado (PV).");
			if (Math.abs(fv) > Math.abs(pv)) throw new Error("Para tabela SAC, o valor residual (FV) deve ser menor ou igual ao capital financiado (PV) em valor absoluto.");
	
			const amortizationData = calculateSacAmortizationTable(n, i, pv, fv); 
			
			if (amortizationData.length === 0) {
				amortizationContent.innerHTML = '<div class="empty-amortization">Não foi possível gerar a tabela SAC com os valores fornecidos.</div>';
			} else {
				displayAmortizationData(amortizationData, n !== nInput ? [nRoundedNotice(nInput, n)] : []);
			}
			
			if (amortizationModalContentEl) {
				amortizationModalContentEl.style.position = '';
				amortizationModalContentEl.style.left = '';
				amortizationModalContentEl.style.top = '';
			}
			amortizationModal.style.display = "flex";
		} catch (error) {
			showError("Amortização (SAC): " + error.message);
		}
	}
    
	// Aviso quando a tabela não usa exatamente o que foi digitado (antes a troca era silenciosa)
	function nRoundedNotice(nInput, n) {
		const shown = (Math.round(nInput * 10000) / 10000).toString().replace('.', ',');
		return `O número de períodos (${shown}) não é inteiro: a tabela usa ${installments(n)} e recalcula os valores.`;
	}

	function installments(n) {
		return `${n} ${n === 1 ? 'parcela' : 'parcelas'}`;
	}

	function displayAmortizationData(amortizationData, notices = []) {
		// CORREÇÃO: Arredonda cada soma parcial para 2 casas decimais para evitar
		// acúmulo de erros de ponto flutuante IEEE 754 ao somar centenas de parcelas.
		const totalPrincipal = amortizationData.reduce((sum, row) => roundCents(sum + row.principalPayment), 0);
		const totalInterest = amortizationData.reduce((sum, row) => roundCents(sum + row.interestPayment), 0);
		const totalPayment = amortizationData.reduce((sum, row) => roundCents(sum + row.payment), 0);
		
		const noticesHTML = notices.map(text => `<div class="amortization-notice">${text}</div>`).join('');
		let tableHTML = `${noticesHTML}
			<div class="amortization-summary">
				<p>Total de Pagamentos: ${formatCurrency(totalPayment)}</p>
				<p>Total de Principal Amortizado: ${formatCurrency(totalPrincipal)}</p>
				<p>Total de Juros Pagos: ${formatCurrency(totalInterest)}</p>
			</div>
			<!-- ADICIONADO: O container para a rolagem -->
			<div class="amortization-table-container">
				<table class="amortization-table">
					<thead><tr><th>Período</th><th>Pagamento (PMT)</th><th>Juros</th><th>Juros Acum.</th><th>Amortização</th><th>Amort. Acum.</th><th>Saldo Devedor</th></tr></thead>
					<tbody>`;
		amortizationData.forEach(row => {
			tableHTML += `<tr>
				<td>${row.period}</td><td>${formatCurrency(row.payment)}</td><td>${formatCurrency(row.interestPayment)}</td>
				<td>${formatCurrency(row.cumulativeInterest)}</td><td>${formatCurrency(row.principalPayment)}</td>
				<td>${formatCurrency(row.cumulativePrincipal)}</td><td>${formatCurrency(row.endingBalance)}</td>
			</tr>`;
		});
		tableHTML += `<tr><td><strong>Total</strong></td><td><strong>${formatCurrency(totalPayment)}</strong></td><td><strong>${formatCurrency(totalInterest)}</strong></td><td>-</td><td><strong>${formatCurrency(totalPrincipal)}</strong></td><td>-</td><td>-</td></tr></tbody>
				</table>
			</div> <!-- ADICIONADO: Fechamento do container -->`;
		amortizationContent.innerHTML = tableHTML;
	}

	function calculatePriceAmortizationTable(n, i, pmt, pv, fv) {
		const table = [];
		let currentBalance = Math.abs(pv); 
		const paymentAmount = roundCents(Math.abs(pmt)); // PMT arredondado (entrada do usuário)
		const futureValueAmount = Math.abs(fv);
	
		let cumulativeInterest = 0;
		let cumulativePrincipal = 0;
	
		for (let period = 1; period <= n; period++) {
			const interestForPeriod = roundCents(currentBalance * i);
			let principalPaymentPart;
			let currentPayment = paymentAmount;
	
			if (period === n) {
				principalPaymentPart = roundCents(currentBalance - futureValueAmount);
				currentPayment = roundCents(principalPaymentPart + interestForPeriod);
			} else {
				principalPaymentPart = roundCents(paymentAmount - interestForPeriod);
			}
			
			currentBalance = roundCents(currentBalance - principalPaymentPart);
			cumulativeInterest = roundCents(cumulativeInterest + interestForPeriod);
			cumulativePrincipal = roundCents(cumulativePrincipal + principalPaymentPart);
	
			if (period === n) {
				currentBalance = futureValueAmount;
			}
	
			table.push({
				period: period,
				payment: currentPayment,
				interestPayment: interestForPeriod,
				cumulativeInterest: cumulativeInterest,
				principalPayment: principalPaymentPart,
				cumulativePrincipal: cumulativePrincipal,
				endingBalance: currentBalance 
			});
		}
		return table;
	}
	
	function calculateSacAmortizationTable(n, i, pv, fv) { 
		const table = [];
		const principalAmount = Math.abs(pv);
		const futureValueAmount = Math.abs(fv);
	
		if (n <= 0) return table;
	
		let amountToAmortize = principalAmount - futureValueAmount;
		const constantAmortization = roundCents(amountToAmortize / n);
		
		let currentBalance = principalAmount;
		let cumulativeInterest = 0;
		let cumulativePrincipal = 0;
	
		for (let period = 1; period <= n; period++) {
			const interestForPeriod = roundCents(currentBalance * i);
			let principalPaymentForPeriod = constantAmortization;
	
			if (period === n) {
				principalPaymentForPeriod = roundCents(currentBalance - futureValueAmount);
			}
			
			const paymentForPeriod = roundCents(principalPaymentForPeriod + interestForPeriod);
			
			currentBalance = roundCents(currentBalance - principalPaymentForPeriod);
			cumulativeInterest = roundCents(cumulativeInterest + interestForPeriod);
			cumulativePrincipal = roundCents(cumulativePrincipal + principalPaymentForPeriod);
			
			if(period === n) {
				currentBalance = futureValueAmount;
			}
	
			table.push({
				period: period,
				payment: paymentForPeriod,
				interestPayment: interestForPeriod,
				cumulativeInterest: cumulativeInterest,
				principalPayment: principalPaymentForPeriod,
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
    
    function calculate() {
        hideError();
        try {
            const n_val = readField(periodsInput, 'periods');
            const i_val = readField(rateInput, 'rate') / 100;
            const pmt_val = readField(paymentInput, 'payment');
            const pv_val = readField(presentValueInput, 'presentValue');
            const fv_val = readField(futureValueInput, 'futureValue');
            const fieldToCalculate = calculateFieldSelect.value;

            // Convenção da HP 12c: dinheiro que entra é positivo e o que sai é negativo, também com PMT zero.
            // O sinal só é conferido em n e taxa (validateInput), nunca com o valor que está no campo a calcular.
            validateInput(n_val, i_val, pmt_val, pv_val, fv_val, fieldToCalculate);

            let result;
            let originalValueInput;

            switch (fieldToCalculate) {
                case 'periods':
                    originalValueInput = n_val;
                    result = calculatePeriods(i_val, pmt_val, pv_val, fv_val);
                    if (result !== null) {
                        periodsInput.value = (Math.round(result * 10000) / 10000).toString().replace('.', ',');
                    }
                    break;
                case 'rate':
                    originalValueInput = parseFinancialInput(rateInput.value);
                    result = calculateRate(n_val, pmt_val, pv_val, fv_val); 
                    if (result !== null) {
                        rateInput.value = result.toFixed(8).replace('.', ',');
                    }
                    break;
                case 'payment':
                    originalValueInput = pmt_val;
                    result = calculatePayment(n_val, i_val, pv_val, fv_val);
                    if (result !== null) {
                        paymentInput.value = formatMoneyField(result);
                    }
                    break;
                case 'presentValue':
                    originalValueInput = pv_val;
                    result = calculatePresentValue(n_val, i_val, pmt_val, fv_val);
                    if (result !== null) {
                        presentValueInput.value = formatMoneyField(result);
                    }
                    break;
                case 'futureValue':
                    originalValueInput = fv_val;
                    result = calculateFutureValue(n_val, i_val, pmt_val, pv_val);
                    if (result !== null) {
                        futureValueInput.value = formatMoneyField(result);
                    }
                    break;
                default:
                    throw new Error("Campo de cálculo desconhecido.");
            }

            if (result !== null && isFinite(result)) {
                // Reformatar inputs na tela: n com 4 casas, taxa com 8, valores em centavos
                const roundedN = parseFinancialInput(periodsInput.value) || 0;
                periodsInput.value = (Math.round(roundedN * 10000) / 10000).toString().replace('.', ',');
                rateInput.value = parseFinancialInput(rateInput.value).toFixed(8).replace('.', ',');
                paymentInput.value = formatMoneyField(parseFinancialInput(paymentInput.value));
                presentValueInput.value = formatMoneyField(parseFinancialInput(presentValueInput.value));
                futureValueInput.value = formatMoneyField(parseFinancialInput(futureValueInput.value));

                // Formatação do resultado principal no display
                if (fieldToCalculate === 'rate') {
                    resultValue.textContent = formatRate(result) + "%";
                } else if (fieldToCalculate === 'periods') {
                    resultValue.textContent = (Math.round(result * 10000) / 10000).toString().replace('.', ',');
                } else {
                    resultValue.textContent = formatCurrency(Math.abs(result) < 0.005 ? 0 : result);
                }

                const finalN = parseFinancialInput(periodsInput.value) || 0;
                const finalRatePercent = parseFinancialInput(rateInput.value);
                const finalI = finalRatePercent / 100;
                const finalPmt = parseFinancialInput(paymentInput.value);
                const finalPv = parseFinancialInput(presentValueInput.value);
                const finalFv = parseFinancialInput(futureValueInput.value);

                const { interestAmount, totalPrincipalPayments } = summarizeFlows(finalN, finalI, finalPmt, finalPv, finalFv);
                if (interestValueElement) interestValueElement.textContent = formatCurrency(interestAmount);
                if (totalPaymentsElement) totalPaymentsElement.textContent = formatCurrency(totalPrincipalPayments);
                
                resultContainer.classList.add('visible');
                
                addToHistory(fieldToCalculate, result, originalValueInput, finalN, finalRatePercent, finalPmt, finalPv, finalFv, interestAmount, totalPrincipalPayments);
            } else if (result === null || !isFinite(result)) {
                showError(explainNoSolution(fieldToCalculate, n_val, i_val, pmt_val, pv_val, fv_val));
                if(resultValue) resultValue.textContent = "-";
                 if (interestValueElement) interestValueElement.textContent = '-';
                if (totalPaymentsElement) totalPaymentsElement.textContent = '-';
            }
            
        } catch (error) {
            showError(error.message);
            if(resultContainer) resultContainer.classList.remove('visible');
        }
    }
    
    // Valor de dinheiro no campo: centavos, sem "-0,00" e sem notação científica (acima de 10²¹ o toFixed escreve
    // "1.06e+21", que a leitura recusa: o campo mostrava 0,00)
    function formatMoneyField(value) {
        const cents = roundCents(value) || 0;
        if (Math.abs(cents) >= 1e21) return BigInt(Math.round(cents)).toString() + ',00';
        return cents.toFixed(2).replace('.', ',');
    }

    // Juros e total pago. No empréstimo (PV e PMT de sinais opostos; FV, se houver, é o saldo residual do lado do PMT)
    // seguem a tabela PRICE centavo a centavo; nos demais casos (poupança, só PV e FV) os juros são o saldo do fluxo.
    function summarizeFlows(n, i, pmt, pv, fv) {
        const isLoan = pmt !== 0 && pv !== 0 && Math.sign(pv) !== Math.sign(pmt) &&
                       (fv === 0 || Math.sign(fv) === Math.sign(pmt)) && Math.abs(fv) <= Math.abs(pv);
        if (isLoan) {
            const interestAmount = calcularTotalJuros(n, i, pmt, pv);
            return { interestAmount, totalPrincipalPayments: roundCents(Math.abs(pv) - Math.abs(fv) + interestAmount) };
        }
        return { interestAmount: Math.abs(roundCents(pv + pmt * n + fv)), totalPrincipalPayments: Math.abs(pmt * n) };
    }

    // Quando não há solução, diz o motivo em vez do "não foi possível calcular" genérico
    function explainNoSolution(field, n, i, pmt, pv, fv) {
        if (field === 'periods' && i > 0 && pmt !== 0 && pv !== 0 && Math.sign(pmt) !== Math.sign(pv) && Math.abs(pmt) <= Math.abs(pv) * i) {
            return `O pagamento (PMT) de ${formatCurrency(Math.abs(pmt))} não cobre os juros do primeiro período (${formatCurrency(Math.abs(pv) * i)}): o saldo nunca é quitado.`;
        }
        if (field === 'periods') return "Não existe número de períodos que feche este fluxo com esses valores. Confira os valores e os sinais.";
        if (field === 'rate') return "Não existe taxa entre -99% e 10.000% por período que feche este fluxo. Confira os valores e os sinais.";
        return "Não foi possível calcular o valor ou o resultado é inválido.";
    }

    function validateInput(n, i, pmt, pv, fv, fieldToCalculate) {
        if (fieldToCalculate !== 'periods' && (n <= 0 || isNaN(n))) {
            throw new Error("O número de períodos (n) deve ser um número positivo.");
        }
        // n e taxa só têm solução se o fluxo trocar de sinal (como na HP 12c). PV, PMT e FV calculam com qualquer sinal.
        if (fieldToCalculate === 'periods' || fieldToCalculate === 'rate') {
            const known = [pv, pmt, fv].filter(v => v !== 0);
            if (!known.some(v => v > 0) || !known.some(v => v < 0)) {
                throw new Error("Para calcular n ou a taxa, PV, PMT e FV precisam de ao menos um valor positivo (dinheiro que entra) e um negativo (dinheiro que sai), como na HP 12c.");
            }
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
    
    function calculatePeriods(i, pmt, pv, fv) {
        const cacheKey = `N_${i}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        let n;
        if (i === 0) {
            if (pmt === 0) throw new Error("Com taxa e PMT zero, o número de períodos é indeterminado.");
            n = -(pv + fv) / pmt;
        } else {
            if (1 + i <= 0) {
                throw new Error("A taxa não pode ser -100% ou menor para este cálculo.");
            }
            // PV·f + PMT·(f − 1)/i + FV = 0  →  f = (1+i)^n = (PMT − FV·i) / (PMT + PV·i); com PMT zero, f = −FV/PV
            // (antes o numerador era PMT + FV·i: com FV e PMT juntos, o n saía como se o FV tivesse o sinal trocado)
            const numerator = pmt - fv * i;
            const denominator = pmt + pv * i;
            if (denominator === 0 || numerator / denominator <= 0) {
                return calculatePeriodsBinarySearch(i, pmt, pv, fv);
            }
            n = Math.log(numerator / denominator) / Math.log(1 + i);
        }
        if (n < 0 || !isFinite(n)) {
            return calculatePeriodsBinarySearch(i, pmt, pv, fv);
        }
        calculationCache[cacheKey] = n;
        return n;
    }

    function calculatePeriodsBinarySearch(rate, pmt, pv, fv, maxN = 1200, tolerance = 1e-6) {
        if (rate === 0) { 
            if (pmt === 0) return (pv + fv === 0) ? 0 : null; 
            if (pmt !== 0) return -(pv + fv) / pmt;
            return null;
        }

        const trend_term = pmt + pv * rate;
        const isIncreasing = (rate > 0) ? (trend_term < 0) : (trend_term > 0);

        const fv_at_n0 = calculateFutureValue(0, rate, pmt, pv);
        const fv_at_nMax = calculateFutureValue(maxN, rate, pmt, pv);

        if (isIncreasing) {
            if (fv < fv_at_n0 || fv > fv_at_nMax) return null;
        } else {
            if (fv > fv_at_n0 || fv < fv_at_nMax) return null;
        }

        let low = 0;
        let high = maxN;

        for (let iter = 0; iter < 100; iter++) { 
            let n = (low + high) / 2;
            const fv_calculated = calculateFutureValue(n, rate, pmt, pv);
            
            if (isIncreasing) {
                if (fv_calculated < fv) { low = n; } else { high = n; }
            } else {
                if (fv_calculated > fv) { low = n; } else { high = n; }
            }
            
            if (high - low < tolerance) break;
        }
        
        const final_n = (low + high) / 2;
        const final_fv = calculateFutureValue(final_n, rate, pmt, pv);

        if (Math.abs(final_fv - fv) < 0.01) { 
            return final_n;
        }
        
        return null;
    }

    function calculateRate(n, pmt, pv, fv) {
        const cacheKey = `I_${n}_${pmt}_${pv}_${fv}`;
        if (calculationCache[cacheKey] !== undefined) return calculationCache[cacheKey];

        if (n <= 0) throw new Error("O NPER deve ser positivo para calcular a TAXA.");

        if (pmt === 0) {
            if (pv === 0) {
                throw new Error("Com PMT zero, o Valor Presente (PV) não pode ser zero para calcular a Taxa.");
            }
            const base = -fv / pv; // HP 12c: PV e FV com sinais opostos
            if (!(base > 0)) {
                throw new Error("Com PMT zero, PV e FV devem ter sinais opostos (o dinheiro que sai é negativo, como na HP 12c).");
            }

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
        const fallback = calculateRateByBisection(n, pmt, pv, fv);
        if (fallback !== null) calculationCache[cacheKey] = fallback;
        return fallback;
    }

    // Plano B quando o Newton não converge (taxa alta: 30% ao período em 12 parcelas dava erro). Procura um intervalo
    // em que o fluxo troca de sinal, de -99% a 10.000% por período, e fecha por bisseção. O fluxo é dividido por
    // (1+r)^n para não estourar com n grande. Com mais de uma solução, fica a positiva mais próxima de zero.
    function calculateRateByBisection(n, pmt, pv, fv) {
        const g = r => {
            if (Math.abs(r) < 1e-12) return pv + pmt * n + fv;
            const v = Math.pow(1 + r, -n);
            return pv + pmt * (1 - v) / r + fv * v;
        };
        const grid = [-0.99, -0.9, -0.5, -0.2, -0.1, -0.05, -0.01, -0.001, 0, 0.001, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 20, 50, 100];
        const brackets = [];
        for (let k = 1; k < grid.length; k++) {
            const a = grid[k - 1], b = grid[k], ga = g(a), gb = g(b);
            if (!isFinite(ga) || !isFinite(gb)) continue;
            if (ga === 0) return a * 100;
            if (ga * gb < 0) brackets.push([a, b]);
        }
        if (brackets.length === 0) return null;
        let [lo, hi] = brackets.find(([a]) => a >= 0) || brackets[brackets.length - 1];
        let glo = g(lo);
        for (let k = 0; k < 200; k++) {
            const mid = (lo + hi) / 2, gm = g(mid);
            if ((gm > 0) === (glo > 0)) { lo = mid; glo = gm; } else { hi = mid; }
        }
        return (lo + hi) / 2 * 100;
    }

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
});

// --- LÓGICA OTIMIZADA PARA TOOLTIPS CUSTOMIZADAS (BASEADA EM CLIQUE) ---
document.addEventListener('DOMContentLoaded', function() {
    let activeTooltip = null;

    // SUBSTITUA SUA FUNÇÃO 'showTooltip' POR ESTA VERSÃO COMPLETA
    function showTooltip(triggerElement) {
        const message = triggerElement.getAttribute('data-tooltip-message');
        if (!message) return;

        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'custom-tooltip-popup';
        tooltipElement.textContent = message;
        document.body.appendChild(tooltipElement);

        const rect = triggerElement.getBoundingClientRect();
        const screenPadding = 10; // Uma margem de segurança das bordas da tela

        // --- LÓGICA DE POSICIONAMENTO INTELIGENTE ---

        // 1. Posicionamento Vertical (Primeiro, para sabermos a altura)
        let topPos = rect.top - tooltipElement.offsetHeight - 10; // Tenta posicionar 10px acima
        if (topPos < screenPadding) {
            topPos = rect.bottom + 10; // Se não couber, posiciona 10px abaixo
        }
        tooltipElement.style.top = `${topPos}px`;

        // 2. Posicionamento Horizontal (com verificação de bordas)
        let leftPos = rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2); // Tenta centralizar
        
        // VERIFICA SE ESTÁ VAZANDO PELA ESQUERDA
        if (leftPos < screenPadding) {
            leftPos = screenPadding;
        }
        
        // VERIFICA SE ESTÁ VAZANDO PELA DIREITA
        const rightEdge = leftPos + tooltipElement.offsetWidth;
        if (rightEdge > window.innerWidth - screenPadding) {
            leftPos = window.innerWidth - tooltipElement.offsetWidth - screenPadding;
        }
        
        tooltipElement.style.left = `${leftPos}px`;
        
        // --------------------------------------------------
        
        setTimeout(() => tooltipElement.classList.add('visible'), 10);
        
        activeTooltip = tooltipElement;
    }

    // Função para esconder a tooltip ativa (NÃO PRECISA MUDAR)
    function hideTooltip() {
        if (activeTooltip) {
            activeTooltip.classList.remove('visible');
            setTimeout(() => {
                if (activeTooltip) activeTooltip.remove();
                activeTooltip = null;
            }, 300);
        }
    }

    // Lógica de cliques (NÃO PRECISA MUDAR)
    document.querySelectorAll('.tooltip-trigger-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            if (activeTooltip) {
                hideTooltip();
            } else {
                showTooltip(icon);
            }
        });
    });

    document.addEventListener('click', function() {
        if (activeTooltip) {
            hideTooltip();
        }
    });
});
