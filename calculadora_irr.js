// calculator_irr.js
document.addEventListener('DOMContentLoaded', function() {
    const irrBtn = document.getElementById('irrBtn');
    const irrModal = document.getElementById('irrModal');
    const closeIrrModalBtn = document.getElementById('closeIrrModal');
    const irrModalContent = irrModal ? irrModal.querySelector('.modal-content.irr-modal') : null;

    const initialInvestmentInput = document.getElementById('irrInitialInvestment');
    const cashFlowsTableBody = document.getElementById('irrCashFlowsTableBody');
    const addCashFlowRowBtn = document.getElementById('addIrrCashFlowRow');
    const calculateIrrBtn = document.getElementById('calculateIrrBtn');
    const resetIrrBtn = document.getElementById('resetIrrBtn');
    const irrResultContainer = document.getElementById('irrResultContainer');
    const irrResultValue = document.getElementById('irrResultValue');
    const irrErrorMessage = document.getElementById('irrErrorMessage');
    const irrWarningMessage = document.getElementById('irrWarningMessage');


    let cfRowCounter = 0;
    let isIrrFirstOpenThisSession = true;

    function showIrrError(message) {
        if (irrErrorMessage) {
            irrErrorMessage.textContent = message;
            irrErrorMessage.style.display = 'block';
        }
        if (irrResultContainer) irrResultContainer.style.display = 'none';
        if (irrWarningMessage) irrWarningMessage.style.display = 'none';
    }

    function hideIrrError() {
        if (irrErrorMessage) {
            irrErrorMessage.textContent = '';
            irrErrorMessage.style.display = 'none';
        }
    }
    
    function showIrrWarning(message) {
        if (irrWarningMessage) {
            irrWarningMessage.textContent = message;
            irrWarningMessage.style.display = 'block';
        }
    }

    function hideIrrWarning() {
        if (irrWarningMessage) {
            irrWarningMessage.textContent = '';
            irrWarningMessage.style.display = 'none';
        }
    }

    function addCashFlowRow(amount = "", quantity = 1) {
        cfRowCounter++;
        const row = cashFlowsTableBody.insertRow();
        row.id = `irrCfRow-${cfRowCounter}`;

        const cellAmount = row.insertCell();
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.className = 'irr-cash-flow-amount';
        amountInput.value = amount;
        amountInput.placeholder = "ex: 200 ou -150";
        amountInput.enterKeyHint = "enter";
        cellAmount.appendChild(amountInput);

        const cellQuantity = row.insertCell();
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.className = 'irr-cash-flow-quantity';
        quantityInput.value = quantity;
        quantityInput.min = '1';
        quantityInput.step = '1';
        quantityInput.enterKeyHint = "enter";
        cellQuantity.appendChild(quantityInput);

        const cellAction = row.insertCell();
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remover';
        removeBtn.className = 'irr-remove-cf-btn';
        removeBtn.type = 'button';
        removeBtn.onclick = function() {
            row.remove();
        };
        cellAction.appendChild(removeBtn);

        if (typeof window.handleNumericInputKeydown === 'function' && typeof window.handleNumericInputDblClick === 'function') {
            [amountInput, quantityInput].forEach(input => {
                input.removeEventListener('keydown', window.handleNumericInputKeydown);
                input.addEventListener('keydown', window.handleNumericInputKeydown);
                input.removeEventListener('dblclick', window.handleNumericInputDblClick);
                input.addEventListener('dblclick', window.handleNumericInputDblClick);
                input.title = "Pressione Enter, F1, Espaço ou duplo clique para acessar a calculadora";
            });
        }
    }

    function resetIrrToDefaults() {
        hideIrrError();
        hideIrrWarning();
        if (irrResultContainer) irrResultContainer.style.display = 'none';

        if(initialInvestmentInput) initialInvestmentInput.value = "-1000.00";

        while (cashFlowsTableBody.firstChild) {
            cashFlowsTableBody.removeChild(cashFlowsTableBody.firstChild);
        }
        cfRowCounter = 0;
        // Exemplo de fluxos de caixa para TIR
        addCashFlowRow(200, 1);
        addCashFlowRow(300, 1);
        addCashFlowRow(400, 1);
        addCashFlowRow(500, 1);
    }

    function openIrrModal() {
        if (!irrModal) return;

        if (isIrrFirstOpenThisSession) {
            resetIrrToDefaults();
            isIrrFirstOpenThisSession = false;
        } else {
            hideIrrError();
            hideIrrWarning();
            if (irrResultContainer && irrResultValue.textContent === "") {
                 irrResultContainer.style.display = 'none';
            }
        }
        
        if (irrModalContent) {
            irrModalContent.style.position = ''; // Reseta a posição para recentralizar
            irrModalContent.style.left = '';
            irrModalContent.style.top = '';
        }
        irrModal.style.display = 'flex';
    }

    function closeIrrModal() {
        if (irrModal) irrModal.style.display = 'none';
    }

    if (irrBtn) irrBtn.addEventListener('click', openIrrModal);
    if (closeIrrModalBtn) closeIrrModalBtn.addEventListener('click', closeIrrModal);
    if (addCashFlowRowBtn) addCashFlowRowBtn.addEventListener('click', () => addCashFlowRow("", 1));
    if (resetIrrBtn) resetIrrBtn.addEventListener('click', resetIrrToDefaults);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && irrModal && irrModal.style.display === 'flex') {
            closeIrrModal();
        }
    });

    // Cálculo da TIR (método de Newton-Raphson)
    function calculateNPV(rate, cashFlows) {
        let npv = 0;
        for (let i = 0; i < cashFlows.length; i++) {
            npv += cashFlows[i] / Math.pow(1 + rate, i);
        }
        return npv;
    }

    function calculateNPVDerivative(rate, cashFlows) {
        let derivative = 0;
        for (let i = 1; i < cashFlows.length; i++) { // Começa em i=1 pois a derivada de FC0 é 0
            if (cashFlows[i] !== 0) { // Evita problemas se CF_i for 0
                 derivative -= (i * cashFlows[i]) / Math.pow(1 + rate, i + 1);
            }
        }
        return derivative;
    }

    function findIRR(cashFlows, guess = 0.1, maxIterations = 100, tolerance = 1e-7) {
        let rate = guess;

        // Verificações básicas
        if (cashFlows.length === 0) return { error: "Nenhum fluxo de caixa fornecido." };
        if (cashFlows.length === 1) return { error: "A TIR requer pelo menos um fluxo de caixa após o investimento inicial."};
        
        let allPositive = cashFlows.every(cf => cf >= 0);
        let allNegative = cashFlows.every(cf => cf <= 0);
        if (allPositive || allNegative) {
             return { error: "A TIR não pode ser calculada se todos os fluxos de caixa tiverem o mesmo sinal." };
        }
        
        // Verifica mudanças de sinal para aviso de múltiplas TIRs
        let signChanges = 0;
        for (let i = 1; i < cashFlows.length; i++) {
            if ((cashFlows[i-1] < 0 && cashFlows[i] > 0) || (cashFlows[i-1] > 0 && cashFlows[i] < 0)) {
                signChanges++;
            }
        }
        const multipleIrrWarning = signChanges > 1 ? "Aviso: Múltiplas mudanças de sinal nos fluxos de caixa. Pode haver mais de uma TIR, ou nenhuma. O valor mostrado é uma solução potencial." : null;


        for (let i = 0; i < maxIterations; i++) {
            const npv = calculateNPV(rate, cashFlows);
            const derivative = calculateNPVDerivative(rate, cashFlows);

            if (Math.abs(derivative) < tolerance) { // Derivada muito pequena, pode não convergir
                return { error: "Não foi possível encontrar a TIR (derivada muito pequena). Tente uma estimativa inicial diferente ou verifique os fluxos de caixa.", warning: multipleIrrWarning };
            }
            
            const newRate = rate - npv / derivative;

            if (Math.abs(newRate - rate) < tolerance) {
                if (!isFinite(newRate)) return { error: "O cálculo da TIR resultou em um número não finito.", warning: multipleIrrWarning };
                return { value: newRate, warning: multipleIrrWarning };
            }
            rate = newRate;
            if (!isFinite(rate) || rate < -1) { // Taxa explodiu ou ficou menor que -100%
                 // Tenta uma estimativa diferente ou para. Por simplicidade, paramos aqui.
                 // Uma solução mais robusta poderia tentar várias estimativas (ex: -0.5, 0, 0.5)
                 // ou usar um método de enquadramento se Newton-Raphson falhar.
                 break; 
            }
        }
        return { error: "A TIR não convergiu dentro do número máximo de iterações. Considere ajustar os fluxos de caixa ou tentar um método de enquadramento, se disponível.", warning: multipleIrrWarning };
    }


    if (calculateIrrBtn) {
        calculateIrrBtn.addEventListener('click', function() {
            hideIrrError();
            hideIrrWarning();
            try {
                const initialInvestment = parseFloat(initialInvestmentInput.value);
                if (isNaN(initialInvestment)) {
                    throw new Error("O Investimento Inicial deve ser um número válido.");
                }

                const cashFlowRows = cashFlowsTableBody.querySelectorAll('tr');
                let expandedCashFlows = [];
                cashFlowRows.forEach(row => {
                    const amountInput = row.querySelector('.irr-cash-flow-amount');
                    const quantityInput = row.querySelector('.irr-cash-flow-quantity');
                    const amount = parseFloat(amountInput.value);
                    const quantity = parseInt(quantityInput.value, 10);

                    if (isNaN(amount)) throw new Error(`Valor inválido em uma das linhas de fluxo de caixa.`);
                    if (isNaN(quantity) || quantity < 1) throw new Error(`Quantidade inválida. Deve ser pelo menos 1.`);
                    
                    for (let i = 0; i < quantity; i++) {
                        expandedCashFlows.push(amount);
                    }
                });

                if (expandedCashFlows.length === 0 && initialInvestment === 0) {
                    throw new Error("Por favor, adicione pelo menos um fluxo de caixa ou forneça um investimento inicial.");
                }
                 if (expandedCashFlows.length === 0 && initialInvestment !== 0) {
                     // Se apenas FC0 existe, a TIR é -100% se FC0 < 0, ou indefinida/infinita se FC0 > 0.
                     // A maioria das funções de TIR daria erro ou retornaria valores específicos.
                     // Por simplicidade, vamos tratar como um erro que precisa de mais fluxos.
                     throw new Error("O cálculo da TIR requer fluxos de caixa subsequentes ao investimento inicial.");
                 }


                const allCashFlows = [initialInvestment, ...expandedCashFlows];
                
                // Verificação inicial para casos triviais
                if (allCashFlows.every(cf => cf === 0)) {
                    throw new Error("Todos os fluxos de caixa são zero. A TIR é indefinida.");
                }
                
                // Tenta algumas estimativas iniciais diferentes se a primeira falhar
                const guesses = [0.1, 0, -0.1, 0.05, 0.2];
                let result = null;
                for (const guess of guesses) {
                    result = findIRR(allCashFlows, guess);
                    if (result && typeof result.value === 'number') break; // Encontrou uma solução
                }


                if (result && typeof result.value === 'number') {
                    irrResultValue.textContent = (result.value * 100).toFixed(6) + "%";
                    irrResultContainer.style.display = 'block';
                    if (result.warning) {
                        showIrrWarning(result.warning);
                    }
                } else {
                    let errorMessage = "Não foi possível calcular a TIR. ";
                    if (result && result.error) {
                        errorMessage += result.error;
                    } else {
                        errorMessage += "Por favor, verifique suas entradas de fluxo de caixa. Garanta que há uma mistura de fluxos positivos e negativos que possam levar a um VPL de zero.";
                    }
                     if (result && result.warning) { // Mostra aviso mesmo que ocorra erro
                        showIrrWarning(result.warning);
                    }
                    showIrrError(errorMessage);
                }

            } catch (error) {
                showIrrError("Erro de Cálculo: " + error.message);
                console.error("Erro no Cálculo da TIR:", error);
            }
        });
    }

    // Lógica de Arrastar do Modal (copiada e adaptada da TIRM)
    if (irrModal && irrModalContent) {
        let isIrrDragging = false;
        let irrDragOffsetX, irrDragOffsetY;

        irrModalContent.style.cursor = 'grab';
        irrModalContent.addEventListener('mousedown', function(e) {
            const targetTagName = e.target.tagName.toLowerCase();
            const isInteractiveElement = ['button', 'input', 'select', 'textarea'].includes(targetTagName) ||
                                         e.target.classList.contains('close') ||
                                         e.target.closest('#irrCashFlowsTable') ||
                                         e.target.closest('.irr-btn-add') ||
                                         e.target.closest('.irr-button-group');

            if (isInteractiveElement) return;

            isIrrDragging = true;
            if (getComputedStyle(irrModalContent).position !== 'absolute') {
                const rect = irrModalContent.getBoundingClientRect();
                irrModalContent.style.position = 'absolute';
                irrModalContent.style.left = rect.left + 'px';
                irrModalContent.style.top = rect.top + 'px';
                irrModalContent.style.margin = '0';
            }

            irrDragOffsetX = e.clientX - irrModalContent.offsetLeft;
            irrDragOffsetY = e.clientY - irrModalContent.offsetTop;
            irrModalContent.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onIrrMouseMove);
            document.addEventListener('mouseup', onIrrMouseUp);
        });

        function onIrrMouseMove(e) {
            if (!isIrrDragging) return;
            e.preventDefault();
            let newLeft = e.clientX - irrDragOffsetX;
            let newTop = e.clientY - irrDragOffsetY;

            const vpWidth = window.innerWidth;
            const vpHeight = window.innerHeight;
            const modalWidth = irrModalContent.offsetWidth;
            const modalHeight = irrModalContent.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, vpWidth - modalWidth));
            newTop = Math.max(0, Math.min(newTop, vpHeight - modalHeight));

            irrModalContent.style.left = newLeft + 'px';
            irrModalContent.style.top = newTop + 'px';
        }

        function onIrrMouseUp() {
            if (!isIrrDragging) return;
            isIrrDragging = false;
            irrModalContent.style.cursor = 'grab';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onIrrMouseMove);
            document.removeEventListener('mouseup', onIrrMouseUp);
        }
    }
});
