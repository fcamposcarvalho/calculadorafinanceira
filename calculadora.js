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
    const historyBtn = document.getElementById('historyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultValue = document.getElementById('resultValue');
    const interestValueElement = document.getElementById('interestValue'); // Novo elemento para o valor dos juros
    const errorMessage = document.getElementById('errorMessage');
    const togglePaymentBtn = document.getElementById('togglePayment');
    const togglePVBtn = document.getElementById('togglePV');
    const toggleFVBtn = document.getElementById('toggleFV');
    
    // Criar um dropdown personalizado em substituição ao dropdown nativo
    createCustomDropdown();
    
    // Modal de histórico
    const historyModal = document.getElementById('historyModal');
    const closeModal = document.getElementById('closeModal');
    const historyContent = document.getElementById('historyContent');
    
    // Histórico de cálculos
    let calculationHistory = [];
    const MAX_HISTORY = 10;
    
    // Cache para resultados
    const calculationCache = {};
    
    // Flag para ajuste automático de sinais
    let adjustingSignals = false;
    
    // Função para criar dropdown personalizado
    function createCustomDropdown() {
        // Obter o elemento select original
        const originalSelect = document.getElementById('calculateField');
        if (!originalSelect) return;
        
        // Obter valor selecionado inicialmente
        const selectedValue = originalSelect.value;
        
        // Esconder o select original (mas mantê-lo para funcionamento do formulário)
        originalSelect.style.display = 'none';
        
        // Criar o contêiner do dropdown personalizado
        const customDropdown = document.createElement('div');
        customDropdown.className = 'custom-dropdown';
        
        // Criar o botão de seleção (que mostra o valor atual)
        const dropdownButton = document.createElement('div');
        dropdownButton.className = 'dropdown-button';
        dropdownButton.setAttribute('tabindex', '0'); // Tornar focusável
        
        // Encontrar o texto da opção selecionada
        let selectedText = '';
        for (let i = 0; i < originalSelect.options.length; i++) {
            if (originalSelect.options[i].value === selectedValue) {
                selectedText = originalSelect.options[i].text;
                break;
            }
        }
        
        dropdownButton.textContent = selectedText;
        
        // Adicionar ícone de dropdown
        const dropdownIcon = document.createElement('span');
        dropdownIcon.className = 'dropdown-icon';
        dropdownIcon.innerHTML = '&#9660;'; // Seta para baixo
        dropdownButton.appendChild(dropdownIcon);
        
        // Criar a lista de opções
        const dropdownList = document.createElement('div');
        dropdownList.className = 'dropdown-list';
        dropdownList.style.display = 'none';
        
        // Adicionar opções à lista
        for (let i = 0; i < originalSelect.options.length; i++) {
            const option = originalSelect.options[i];
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';
            if (option.value === selectedValue) {
                dropdownItem.classList.add('selected');
            }
            dropdownItem.setAttribute('data-value', option.value);
            dropdownItem.textContent = option.text;
            
            // Adicionar evento de clique em cada item
            dropdownItem.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Atualizar o select original
                originalSelect.value = option.value;
                
                // Disparar evento de change manualmente
                const event = new Event('change', { bubbles: true });
                originalSelect.dispatchEvent(event);
                
                // Atualizar o botão e a seleção visual
                dropdownButton.textContent = option.text;
                dropdownButton.appendChild(dropdownIcon); // Recolocar o ícone
                
                // Remover classe 'selected' de todos os itens
                const items = dropdownList.querySelectorAll('.dropdown-item');
                items.forEach(item => item.classList.remove('selected'));
                
                // Adicionar classe 'selected' ao item selecionado
                dropdownItem.classList.add('selected');
                
                // Fechar o dropdown
                dropdownList.style.display = 'none';
                
                // Salvar a seleção no localStorage
                localStorage.setItem('lastCalculateField', option.value);
                
                console.log("Campo a calcular selecionado:", option.value);
            });
            
            dropdownList.appendChild(dropdownItem);
        }
        
        // Adicionar evento ao botão para mostrar/esconder lista
        dropdownButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (dropdownList.style.display === 'none') {
                dropdownList.style.display = 'block';
            } else {
                dropdownList.style.display = 'none';
            }
        });
        
        // Fechar o dropdown ao clicar fora
        document.addEventListener('click', function() {
            dropdownList.style.display = 'none';
        });
        
        // Fechar o dropdown ao pressionar ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                dropdownList.style.display = 'none';
            }
        });
        
        // Adicionar elementos ao DOM
        customDropdown.appendChild(dropdownButton);
        customDropdown.appendChild(dropdownList);
        
        // Inserir o dropdown personalizado após o select original
        originalSelect.parentNode.insertBefore(customDropdown, originalSelect.nextSibling);
        
        // Adicionar estilos necessários para o dropdown personalizado
        const style = document.createElement('style');
        style.textContent = `
            .custom-dropdown {
                position: relative;
                width: 100%;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .dropdown-button {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                cursor: pointer;
                background-color: white;
                transition: border-color 0.3s;
                font-size: 16px;
            }
            
            .dropdown-button:hover, .dropdown-button:focus {
                outline: none;
                border-color: #3a7ca5;
                box-shadow: 0 0 0 2px rgba(58, 124, 165, 0.2);
            }
            
            .dropdown-icon {
                margin-left: 8px;
                color: #3a7ca5;
            }
            
            .dropdown-list {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 0 0 5px 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                z-index: 100;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .dropdown-item {
                padding: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .dropdown-item:hover {
                background-color: #f8f9fa;
            }
            
            .dropdown-item.selected {
                background-color: #e9f2f7;
                color: #3a7ca5;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Original Event listener para o dropdown
    calculateFieldSelect.addEventListener('change', function(event) {
        // Esta função ainda é necessária para o funcionamento interno
        console.log("Campo a calcular alterado via select original:", calculateFieldSelect.value);
    });
    
    // Restaurar a última seleção ao carregar a página
    if (localStorage.getItem('lastCalculateField')) {
        calculateFieldSelect.value = localStorage.getItem('lastCalculateField');
        // O dropdown personalizado será criado com o valor restaurado
    }
    
    // Evento para botões de inversão de sinal
    togglePaymentBtn.addEventListener('click', function() {
        invertSign('payment');
    });
    
    togglePVBtn.addEventListener('click', function() {
        invertSign('presentValue');
    });
    
    toggleFVBtn.addEventListener('click', function() {
        invertSign('futureValue');
    });
    
    // Evento para botão de cálculo
    calculateBtn.addEventListener('click', calculate);
    
    // Evento para botão de histórico
    historyBtn.addEventListener('click', showHistory);
    
    // Evento para botão de limpar
    clearBtn.addEventListener('click', clearFields);
    
    // Fechar modal
    closeModal.addEventListener('click', function() {
        historyModal.style.display = "none";
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target === historyModal) {
            historyModal.style.display = "none";
        }
    });
    
    // Adicionar evento de entrada para ajuste automático de sinais
    paymentInput.addEventListener('input', adjustSignals);
    presentValueInput.addEventListener('input', adjustSignals);
    futureValueInput.addEventListener('input', adjustSignals);
    
    // Função para inverter o sinal
    function invertSign(field) {
        // Desativar ajuste automático temporariamente
        adjustingSignals = true;
        
        switch (field) {
            case 'payment':
                let pmt = parseFloat(paymentInput.value) || 0;
                paymentInput.value = -pmt;
                // Removida a condição que invertia automaticamente o FV
                break;
                
            case 'presentValue':
                let pv = parseFloat(presentValueInput.value) || 0;
                presentValueInput.value = -pv;
                break;
                
            case 'futureValue':
                let futureVal = parseFloat(futureValueInput.value) || 0;
                futureValueInput.value = -futureVal;
                // Removida a condição que invertia automaticamente o PMT
                break;
        }
        
        // Reativar ajuste automático após um intervalo
        setTimeout(function() {
            adjustingSignals = false;
        }, 200);
    }
    
    // Função para ajustar automaticamente os sinais
    function adjustSignals() {
        if (adjustingSignals) return;
        
        adjustingSignals = true;
        
        try {
            // Obter valores
            let pmt = parseFloat(paymentInput.value) || 0;
            let pv = parseFloat(presentValueInput.value) || 0;
            let fv = parseFloat(futureValueInput.value) || 0;
            
            // Caso especial: quando prestação é zero, PV e FV devem ter o mesmo sinal
            if (pmt === 0 && pv !== 0 && fv !== 0) {
                if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                    futureValueInput.value = -fv;
                }
                adjustingSignals = false;
                return;
            }
            
            // Regra principal: PV e FV sempre têm o mesmo sinal
            if (pv !== 0 && fv !== 0 && pmt !== 0) {
                // Garantir que PV e FV tenham o mesmo sinal
                if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                    futureValueInput.value = -fv;
                }
                
                // Removida a condição que garantia que PMT tenha sinal oposto a PV e FV
            } else if (pv !== 0 && pmt !== 0) {
                // Removida a condição que ajustava PMT baseado em PV
            } else if (fv !== 0 && pmt !== 0) {
                // Removida a condição que ajustava PMT baseado em FV
            } else if (pv !== 0 && fv !== 0) {
                // Se PMT é zero, garantir que PV e FV tenham o mesmo sinal
                if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                    futureValueInput.value = -fv;
                }
            }
        } catch (error) {
            console.error("Erro ao ajustar sinais:", error);
        } finally {
            adjustingSignals = false;
        }
    }
    
    // Função para limpar campos
    function clearFields() {
        periodsInput.value = "12";
        rateInput.value = "1.0";
        paymentInput.value = "0.00";
        presentValueInput.value = "1000.00";
        futureValueInput.value = "0.00";
        resultContainer.classList.remove('visible');
        hideError();
        
        // Limpar também o valor dos juros se o elemento existir
        if (interestValueElement) {
            interestValueElement.textContent = '';
        }
    }
    
    // Função para formatar moeda
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
    
    // Função para mostrar erro
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('visible');
    }
    
    // Função para esconder erro
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.classList.remove('visible');
    }
    
    // Função para adicionar ao histórico
    function addToHistory(type, calculatedValue, originalValue, n, i, pmt, pv, fv, interestAmount) {
        const record = {
            type: type,
            calculatedValue: calculatedValue,
            originalValue: originalValue,
            n: n,
            i: i,
            pmt: pmt,
            pv: pv,
            fv: fv,
            interestAmount: interestAmount,
            date: new Date().toLocaleString()
        };
        
        // Adicionar ao início da lista
        calculationHistory.unshift(record);
        
        // Limitar o tamanho do histórico
        if (calculationHistory.length > MAX_HISTORY) {
            calculationHistory.pop();
        }
    }
    
    // Função para mostrar histórico
    function showHistory() {
        if (calculationHistory.length === 0) {
            historyContent.innerHTML = '<div class="empty-history">Não há cálculos no histórico.</div>';
        } else {
            historyContent.innerHTML = '';
            calculationHistory.forEach((calc, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                historyItem.innerHTML = `
                    <div class="history-detail">${index + 1}. Cálculo de ${getLabelForField(calc.type)}:</div>
                    <div class="history-detail history-result">Resultado: ${formatCurrency(calc.calculatedValue)}</div>
                    <div class="history-detail">Períodos: ${calc.n}, Taxa: ${calc.i}%, PMT: ${formatCurrency(calc.pmt)}</div>
                    <div class="history-detail">PV: ${formatCurrency(calc.pv)}, FV: ${formatCurrency(calc.fv)}</div>
                    <div class="history-detail">Valor dos Juros: ${formatCurrency(calc.interestAmount)}</div>
                `;
                
                historyContent.appendChild(historyItem);
            });
        }
        
        historyModal.style.display = "block";
    }
    
    // Obter label para campo
    function getLabelForField(field) {
        switch (field) {
            case 'periods': return 'Períodos (n)';
            case 'rate': return 'Taxa (i)';
            case 'payment': return 'Prestação (PMT)';
            case 'presentValue': return 'Valor Atual (PV)';
            case 'futureValue': return 'Valor Futuro (FV)';
            default: return field;
        }
    }
    
    // Função principal de cálculo
    function calculate() {
        hideError();
        
        try {
            // Obter valores dos inputs
            const n = parseInt(periodsInput.value) || 0;
            const i = (parseFloat(rateInput.value) || 0) / 100;  // Converter para decimal
            const pmt = parseFloat(paymentInput.value) || 0;
            const pv = parseFloat(presentValueInput.value) || 0;
            const fv = parseFloat(futureValueInput.value) || 0;
            const fieldToCalculate = calculateFieldSelect.value;
            
            // Validar entradas
            validateInput(n, i, pmt, pv, fv, fieldToCalculate);
            
            // Realizar o cálculo adequado
            let result;
            let originalValue;
            
            switch (fieldToCalculate) {
                case 'periods':
                    originalValue = n;
                    result = calculatePeriods(i, pmt, pv, fv);
                    if (result !== null) {
                        periodsInput.value = Math.round(result);
                    }
                    break;
                    
                case 'rate':
                    originalValue = parseFloat(rateInput.value);
                    result = calculateRate(n, pmt, pv, fv);
                    if (result !== null) {
                        rateInput.value = result.toFixed(2);
                    }
                    break;
                    
                case 'payment':
                    originalValue = pmt;
                    result = calculatePayment(n, i, pv, fv);
                    if (result !== null) {
                        paymentInput.value = result.toFixed(2);
                    }
                    break;
                    
                case 'presentValue':
                    originalValue = pv;
                    result = calculatePresentValue(n, i, pmt, fv);
                    if (result !== null) {
                        presentValueInput.value = result.toFixed(2);
                    }
                    break;
                    
                case 'futureValue':
                    originalValue = fv;
                    result = calculateFutureValue(n, i, pmt, pv);
                    if (result !== null) {
                        futureValueInput.value = result.toFixed(2);
                    }
                    break;
            }
            
            // Mostrar resultado
            if (result !== null) {
                resultValue.textContent = formatCurrency(result);
                
                // Calcular o valor dos juros
                let interestAmount = 0;
                
                if (fieldToCalculate === 'futureValue') {
                    // Se calculou FV, juros = FV - PV - (PMT * n)
                    interestAmount = Math.abs(result) - Math.abs(pv) - Math.abs(pmt * n);
                } else if (fieldToCalculate === 'presentValue') {
                    // Se calculou PV, juros = FV - PV - (PMT * n)
                    interestAmount = Math.abs(fv) - Math.abs(result) - Math.abs(pmt * n);
                } else {
                    // Para outros campos, calculamos usando os valores atualizados
                    const updatedPv = parseFloat(presentValueInput.value) || 0;
                    const updatedFv = parseFloat(futureValueInput.value) || 0;
                    const updatedPmt = parseFloat(paymentInput.value) || 0;
                    const updatedN = parseInt(periodsInput.value) || 0;
                    interestAmount = Math.abs(updatedFv) - Math.abs(updatedPv) - Math.abs(updatedPmt * updatedN);
                }
                
                // Exibir o valor dos juros
                if (interestValueElement) {
                    interestValueElement.textContent = formatCurrency(interestAmount);
                }
                
                resultContainer.classList.add('visible');
                
                // Adicionar ao histórico (incluindo valor dos juros)
                addToHistory(
                    fieldToCalculate,
                    result,
                    originalValue,
                    fieldToCalculate === 'periods' ? Math.round(result) : n,
                    fieldToCalculate === 'rate' ? result : parseFloat(rateInput.value),
                    fieldToCalculate === 'payment' ? result : pmt,
                    fieldToCalculate === 'presentValue' ? result : pv,
                    fieldToCalculate === 'futureValue' ? result : fv,
                    interestAmount
                );
            }
            
        } catch (error) {
            console.error(error);
            showError(error.message);
            resultContainer.classList.remove('visible');
        }
    }
    
    // Função para validar entrada
    function validateInput(n, i, pmt, pv, fv, fieldToCalculate) {
        // Validações comuns
        if (fieldToCalculate !== 'periods' && n <= 0) {
            throw new Error("O número de períodos deve ser maior que zero");
        }
        
        if (fieldToCalculate !== 'rate' && i < 0) {
            throw new Error("A taxa não pode ser negativa");
        }
        
        // Validações específicas
        if (fieldToCalculate === 'periods') {
            if (i === 0 && pmt === 0) {
                // Caso especial onde PV = -FV
                if (Math.abs(pv + fv) < 0.000001) {
                    return true;  // Qualquer número de períodos é solução
                }
                throw new Error("Para calcular períodos com taxa zero, a prestação não pode ser zero, a menos que PV = -FV");
            }
        }
        
        if (fieldToCalculate === 'rate') {
            if (n <= 0) {
                throw new Error("O número de períodos deve ser maior que zero para calcular taxa");
            }
            
            if (pmt === 0 && (pv === 0 || fv === 0)) {
                throw new Error("Com prestação zero, PV e FV não podem ser zero para calcular taxa");
            }
            
            if (pmt === 0 && pv !== 0 && fv !== 0) {
                if ((pv > 0 && fv > 0) || (pv < 0 && fv < 0)) {
                    // Se PV e FV têm o mesmo sinal, verifica se FV > PV (para taxa positiva)
                    if (Math.abs(fv) <= Math.abs(pv)) {
                        throw new Error("Com prestação zero, |FV| deve ser maior que |PV| para taxas positivas");
                    }
                }
            }
        }
        
        if (fieldToCalculate === 'payment') {
            if (n <= 0) {
                throw new Error("O número de períodos deve ser maior que zero para calcular prestação");
            }
            
            if (i === 0 && pv + fv === 0) {
                throw new Error("Para calcular prestação com taxa zero, PV + FV não pode ser zero");
            }
        }
        
        if (fieldToCalculate === 'presentValue' || fieldToCalculate === 'futureValue') {
            if (n <= 0) {
                throw new Error("O número de períodos deve ser maior que zero para este cálculo");
            }
        }
        
        return true;
    }
    
    // Função para calcular valor presente
    function calculatePresentValue(n, i, pmt, fv) {
        try {
            // Verificar o cache primeiro
            const cacheKey = `PV_${n}_${i}_${pmt}_${fv}`;
            if (calculationCache[cacheKey] !== undefined) {
                return calculationCache[cacheKey];
            }
            
            let pv;
            
            // Caso especial: quando prestação é zero
            if (pmt === 0) {
                if (i === 0) {
                    pv = -fv;  // Com taxa zero, PV = -FV
                } else {
                    // Com taxa não zero, usar fórmula de capitalização simples
                    pv = fv / Math.pow(1 + i, n);
                }
            } else {
                // Fórmula do valor presente - caso geral
                if (i === 0) {
                    pv = -fv - pmt * n;
                } else {
                    pv = (-pmt * (1 - Math.pow(1 + i, -n)) / i) - (fv * Math.pow(1 + i, -n));
                }
            }
            
            // Armazenar no cache
            calculationCache[cacheKey] = pv;
            return pv;
        } catch (error) {
            throw new Error(`Erro ao calcular valor atual: ${error.message}`);
        }
    }
    
    // Função para calcular valor futuro
    function calculateFutureValue(n, i, pmt, pv) {
        try {
            // Verificar o cache primeiro
            const cacheKey = `FV_${n}_${i}_${pmt}_${pv}`;
            if (calculationCache[cacheKey] !== undefined) {
                return calculationCache[cacheKey];
            }
            
            let fv;
            
            // Caso especial: quando prestação é zero
            if (pmt === 0) {
                if (i === 0) {
                    fv = -pv;  // Com taxa zero, FV = -PV
                } else {
                    // Com taxa não zero, usar fórmula de capitalização simples direta
                    fv = pv * Math.pow(1 + i, n);
                }
            } else {
                // Fórmula do valor futuro - caso geral
                if (i === 0) {
                    fv = -pv - pmt * n;
                } else {
                    fv = (-pmt * (Math.pow(1 + i, n) - 1) / i) - (pv * Math.pow(1 + i, n));
                }
            }
            
            // Armazenar no cache
            calculationCache[cacheKey] = fv;
            return fv;
        } catch (error) {
            throw new Error(`Erro ao calcular valor futuro: ${error.message}`);
        }
    }
    
    // Função para calcular prestação
    function calculatePayment(n, i, pv, fv) {
        try {
            // Verificar o cache primeiro
            const cacheKey = `PMT_${n}_${i}_${pv}_${fv}`;
            if (calculationCache[cacheKey] !== undefined) {
                return calculationCache[cacheKey];
            }
            
            let pmt;
            
            // Fórmula da prestação
            if (i === 0) {
                if (n === 0) {
                    throw new Error("Número de períodos não pode ser zero para calcular prestação");
                }
                pmt = -(pv + fv) / n;
            } else {
                if (Math.pow(1 + i, n) - 1 === 0) {
                    throw new Error("Configuração inválida para calcular prestação");
                }
                pmt = (-pv * i * Math.pow(1 + i, n) - fv * i) / (Math.pow(1 + i, n) - 1);
            }
            
            // Armazenar no cache
            calculationCache[cacheKey] = pmt;
            return pmt;
        } catch (error) {
            throw new Error(`Erro ao calcular prestação: ${error.message}`);
        }
    }
    
    // Função para calcular períodos com taxa zero
    function calculatePeriodsZeroRate(pmt, pv, fv) {
        try {
            // Caso especial onde PV + FV = 0 (qualquer período é válido)
            if (Math.abs(pv + fv) < 0.000001) {
                return 1;  // Retorna um período como padrão
            }
            
            // Se prestação for zero com taxa zero, não há solução
            if (pmt === 0) {
                throw new Error("Com taxa zero e prestação zero, não é possível calcular períodos a menos que PV = -FV");
            }
            
            // Cálculo normal para taxa zero com prestação não-zero
            const n = -((pv + fv) / pmt);
            if (n <= 0) {
                throw new Error("O resultado do cálculo de períodos deve ser positivo");
            }
            return n;
        } catch (error) {
            throw new Error(`Erro ao calcular períodos com taxa zero: ${error.message}`);
        }
    }
    
    // Função para calcular períodos em casos especiais
    function calculatePeriodsSpecialCase(i, pmt, pv, fv) {
        try {
            // Caso com prestação zero (capitalização simples)
            if (pmt === 0) {
                // Se PV ou FV for zero, não há solução
                if (pv === 0 || fv === 0) {
                    return null;  // Indicando que não é um caso especial válido
                }
                
                // Verificar sinais - PV e FV precisam ter o mesmo sinal
                if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                    throw new Error("Com prestação zero, PV e FV devem ter o mesmo sinal para calcular períodos");
                }
                
                // Para que exista solução, |FV| > |PV| para taxa positiva
                if (i > 0 && Math.abs(fv) <= Math.abs(pv)) {
                    throw new Error("Com prestação zero e taxa positiva, |FV| deve ser maior que |PV|");
                }
                
                if (i < 0 && Math.abs(fv) >= Math.abs(pv)) {
                    throw new Error("Com prestação zero e taxa negativa, |FV| deve ser menor que |PV|");
                }
                
                // Fórmula para calcular períodos com PMT = 0
                return Math.log(fv / pv) / Math.log(1 + i);
            }
            
            // Casos para PV = 0 com PMT != 0
            else if (pv === 0) {
                if (pmt < 0 && fv > 0) {
                    // Fórmula para acumulação positiva
                    const insideLog = 1 + (fv * i) / (-pmt);
                    if (insideLog <= 0) {
                        throw new Error("Configuração inválida (resultado de logaritmo não positivo)");
                    }
                    return Math.log(insideLog) / Math.log(1 + i);
                }
                
                else if (pmt > 0 && fv < 0) {
                    // Fórmula para acumulação negativa
                    const insideLog = 1 + (-fv * i) / pmt;
                    if (insideLog <= 0) {
                        throw new Error("Configuração inválida (resultado de logaritmo não positivo)");
                    }
                    return Math.log(insideLog) / Math.log(1 + i);
                }
            }
            
            return null;  // Nenhum caso especial aplicável
        } catch (error) {
            throw new Error(`Erro ao calcular períodos (caso especial): ${error.message}`);
        }
    }
    
    // Função para calcular períodos usando busca binária
    function calculatePeriodsBinarySearch(i, pmt, pv, fv) {
        try {
            // Usar nomes completamente diferentes para evitar qualquer conflito
            let lowerBound = 0.1;
            let upperBound = 10000.0;
            const maxIterations = 100;
            const tolerance = 0.0001;
            
            // Valores de FV nos limites do intervalo
            let lowerValue = calculateFutureValue(lowerBound, i, pmt, pv);
            let upperValue = calculateFutureValue(upperBound, i, pmt, pv);
            
            // Verificar se há solução no intervalo
            if ((lowerValue - fv) * (upperValue - fv) > 0) {
                throw new Error("Não existe solução para esta combinação de valores no intervalo de períodos considerado");
            }
            
            // Método de busca binária
            for (let iter = 0; iter < maxIterations; iter++) {
                const midPoint = (lowerBound + upperBound) / 2;
                const midValue = calculateFutureValue(midPoint, i, pmt, pv);
                
                // Verificar convergência
                if (Math.abs(midValue - fv) < tolerance) {
                    return midPoint;
                }
                
                // Ajustar intervalo
                if ((midValue - fv) * (lowerValue - fv) > 0) {
                    lowerBound = midPoint;
                    lowerValue = midValue;
                } else {
                    upperBound = midPoint;
                    upperValue = midValue;
                }
            }
            
            throw new Error("Não foi possível convergir para uma solução após o número máximo de iterações");
        } catch (error) {
            throw new Error(`Erro no método de busca binária: ${error.message}`);
        }
    }    

    // Função para calcular períodos
    function calculatePeriods(i, pmt, pv, fv) {
        try {
            // Verificar o cache primeiro
            const cacheKey = `N_${i}_${pmt}_${pv}_${fv}`;
            if (calculationCache[cacheKey] !== undefined) {
                return calculationCache[cacheKey];
            }
            
            let n;
            
            // Caso simples: taxa zero
            if (i === 0) {
                n = calculatePeriodsZeroRate(pmt, pv, fv);
                calculationCache[cacheKey] = n;
                return n;
            }
            
            // Verificações específicas para PMT=0
            if (pmt === 0) {
                // Caso PMT=0 e PV, FV não zeros
                if (pv === 0 || fv === 0) {
                    throw new Error("Com prestação zero, PV e FV não podem ser zero para calcular períodos");
                }
                
                // Verificar se PV e FV têm o mesmo sinal (necessário para log)
                if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                    throw new Error("Com prestação zero, PV e FV devem ter o mesmo sinal para calcular períodos");
                }
                
                // Para que exista solução, |FV| > |PV| para taxa positiva
                if (i > 0 && Math.abs(fv) <= Math.abs(pv)) {
                    throw new Error("Com prestação zero e taxa positiva, |FV| deve ser maior que |PV|");
                }
                
                // Usando a fórmula FV = PV * (1+i)^n
                // Resolvendo para n: n = log(FV/PV) / log(1+i)
                n = Math.log(fv / pv) / Math.log(1 + i);
                calculationCache[cacheKey] = n;
                return n;
            }
            
            // Tentar casos especiais
            n = calculatePeriodsSpecialCase(i, pmt, pv, fv);
            
            // Se não houver caso especial, usar método geral
            if (n === null) {
                n = calculatePeriodsBinarySearch(i, pmt, pv, fv);
            }
            
            // Armazenar no cache
            calculationCache[cacheKey] = n;
            return n;
        } catch (error) {
            throw new Error(`Erro ao calcular períodos: ${error.message}`);
        }
    }
    
    // Função para calcular taxa com prestação zero
    function calculateRateZeroPayment(n, pv, fv) {
        try {
            if (pv === 0 || fv === 0) {
                throw new Error("Com prestação zero, PV e FV não podem ser zero");
            }
            
            if ((pv > 0 && fv < 0) || (pv < 0 && fv > 0)) {
                throw new Error("Com prestação zero, PV e FV devem ter o mesmo sinal");
            }
            
            // Fórmula da taxa para PMT=0
            const i = ((fv / pv) ** (1 / n) - 1) * 100;
            return i;
        } catch (error) {
            throw new Error(`Erro ao calcular taxa com prestação zero: ${error.message}`);
        }
    }
    
    // Função para calcular taxa usando método de Newton-Raphson
    function calculateRateNewtonRaphson(n, pmt, pv, fv) {
        try {
            // Chute inicial para a taxa
            let i = 0.1;  // 10% como chute inicial
            const tolerance = 0.00000001;
            const maxIter = 100;
            
            for (let iter = 0; iter < maxIter; iter++) {
                // Cálculo da função e sua derivada
                let f, df;
                
                if (pmt === 0) {
                    f = pv * Math.pow(1 + i, n) + fv;
                    df = n * pv * Math.pow(1 + i, n - 1);
                } else {
                    f = pv * Math.pow(1 + i, n) + pmt * (Math.pow(1 + i, n) - 1) / i + fv;
                    
                    if (Math.abs(i) < 0.000001) {  // Evitar divisão por zero
                        i = 0.000001;
                    }
                    
                    df = n * pv * Math.pow(1 + i, n - 1) + 
                        pmt * (n * Math.pow(1 + i, n - 1) / i - 
                        (Math.pow(1 + i, n) - 1) / (i * i));
                }
                
                // Se a derivada for próxima de zero, ajuste
                if (Math.abs(df) < 0.000001) {
                    df = df >= 0 ? 0.000001 : -0.000001;
                }
                
                const delta = f / df;
                const iNew = i - delta;
                
                // Evitar taxas negativas absurdas
                if (iNew < -0.999) {
                    i = -0.9;
                    continue;
                }
                
                // Verificar convergência
                if (Math.abs(delta) < tolerance) {
                    return iNew * 100;  // Convertendo para percentual
                }
                
                i = iNew;
            }
            
            throw new Error("Não foi possível convergir para uma taxa de juros após o número máximo de iterações");
        } catch (error) {
            throw new Error(`Erro no método Newton-Raphson: ${error.message}`);
        }
    }
    
    // Função para calcular taxa
    function calculateRate(n, pmt, pv, fv) {
        try {
            // Verificar o cache primeiro
            const cacheKey = `I_${n}_${pmt}_${pv}_${fv}`;
            if (calculationCache[cacheKey] !== undefined) {
                return calculationCache[cacheKey];
            }
            
            let i;
            
            // Caso especial
            if (pmt === 0) {
                i = calculateRateZeroPayment(n, pv, fv);
                calculationCache[cacheKey] = i;
                return i;
            }
            
            // Método de aproximação numérica (Newton-Raphson)
            i = calculateRateNewtonRaphson(n, pmt, pv, fv);
            calculationCache[cacheKey] = i;
            return i;
            
        } catch (error) {
            throw new Error(`Erro ao calcular taxa: ${error.message}`);
        }
    }
});