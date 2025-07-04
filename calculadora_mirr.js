// calculator_mirr.js
document.addEventListener('DOMContentLoaded', function() {
    const mirrBtn = document.getElementById('mirrBtn');
    const mirrModal = document.getElementById('mirrModal');
    const closeMirrModalBtn = document.getElementById('closeMirrModal');
    const mirrModalContent = mirrModal ? mirrModal.querySelector('.modal-content.mirr-modal') : null;

    const initialInvestmentInput = document.getElementById('mirrInitialInvestment');
    const financingRateInput = document.getElementById('mirrFinancingRate');
    const reinvestmentRateInput = document.getElementById('mirrReinvestmentRate');
    const cashFlowsTableBody = document.getElementById('mirrCashFlowsTableBody');
    const addCashFlowRowBtn = document.getElementById('addMirrCashFlowRow');
    const calculateMirrBtn = document.getElementById('calculateMirrBtn');
    const resetMirrBtn = document.getElementById('resetMirrBtn');
    const mirrResultContainer = document.getElementById('mirrResultContainer');
    const mirrResultValue = document.getElementById('mirrResultValue');
    const mirrErrorMessage = document.getElementById('mirrErrorMessage');

    let cfRowCounter = 0;
    let isMirrFirstOpenThisSession = true;

    function showMirrError(message) {
        if (mirrErrorMessage) {
            mirrErrorMessage.textContent = message;
            mirrErrorMessage.style.display = 'block';
        }
        if (mirrResultContainer) mirrResultContainer.style.display = 'none';
    }

    function hideMirrError() {
        if (mirrErrorMessage) {
            mirrErrorMessage.textContent = '';
            mirrErrorMessage.style.display = 'none';
        }
    }

    function addCashFlowRow(amount = "", quantity = 1) {
        cfRowCounter++;
        const row = cashFlowsTableBody.insertRow();
        row.id = `cfRow-${cfRowCounter}`;

        const cellAmount = row.insertCell();
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.className = 'mirr-cash-flow-amount';
        amountInput.value = amount;
        amountInput.placeholder = "ex: 200 ou -150";
        amountInput.enterKeyHint = "enter";
        cellAmount.appendChild(amountInput);

        const cellQuantity = row.insertCell();
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.className = 'mirr-cash-flow-quantity';
        quantityInput.value = quantity;
        quantityInput.min = '1';
        quantityInput.step = '1';
        quantityInput.enterKeyHint = "enter";
        cellQuantity.appendChild(quantityInput);

        const cellAction = row.insertCell();
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remover';
        removeBtn.className = 'mirr-remove-cf-btn';
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
        } else {
            console.warn('Funções globais para input numérico não definidas. A calculadora pode não abrir corretamente nos campos dinâmicos da TIRM.');
        }
    }

    function resetMirrToDefaults() {
        hideMirrError();
        if (mirrResultContainer) mirrResultContainer.style.display = 'none';

        if(initialInvestmentInput) initialInvestmentInput.value = "-1000.00";
        if(financingRateInput) financingRateInput.value = "5.0";
        if(reinvestmentRateInput) reinvestmentRateInput.value = "7.0";

        while (cashFlowsTableBody.firstChild) {
            cashFlowsTableBody.removeChild(cashFlowsTableBody.firstChild);
        }
        cfRowCounter = 0;
        addCashFlowRow(250, 3);
        addCashFlowRow(-50, 2);
    }

    function openMirrModal() {
        if (!mirrModal) return;

        if (isMirrFirstOpenThisSession) {
            resetMirrToDefaults();
            isMirrFirstOpenThisSession = false;
        } else {
            hideMirrError();
            if (mirrResultContainer && mirrResultValue.textContent === "") {
                 mirrResultContainer.style.display = 'none';
            }
        }

        if (mirrModalContent) {
            mirrModalContent.style.position = '';
            mirrModalContent.style.left = '';
            mirrModalContent.style.top = '';
        }

        mirrModal.style.display = 'flex';
    }

    function closeMirrModal() {
        if (mirrModal) mirrModal.style.display = 'none';
    }

    if (mirrBtn) mirrBtn.addEventListener('click', openMirrModal);
    if (closeMirrModalBtn) closeMirrModalBtn.addEventListener('click', closeMirrModal);
    if (addCashFlowRowBtn) addCashFlowRowBtn.addEventListener('click', () => addCashFlowRow("", 1));
    if (resetMirrBtn) resetMirrBtn.addEventListener('click', resetMirrToDefaults);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mirrModal && mirrModal.style.display === 'flex') {
            closeMirrModal();
        }
    });


    if (calculateMirrBtn) {
        calculateMirrBtn.addEventListener('click', function() {
            hideMirrError();
            try {
                const initialInvestment = parseFloat(initialInvestmentInput.value);
                const financingRate = parseFloat(financingRateInput.value) / 100;
                const reinvestmentRate = parseFloat(reinvestmentRateInput.value) / 100;

                if (isNaN(initialInvestment) || isNaN(financingRate) || isNaN(reinvestmentRate)) {
                    throw new Error("Investimento Inicial, Taxa de Financiamento e Taxa de Reinvestimento devem ser números válidos.");
                }
                if (financingRate < -1 || reinvestmentRate < -1) {
                    throw new Error("As taxas não podem ser menores que -100%.");
                }

                const cashFlowRows = cashFlowsTableBody.querySelectorAll('tr');
                if (cashFlowRows.length === 0 && initialInvestment === 0) {
                    throw new Error("Por favor, adicione pelo menos um fluxo de caixa ou forneça um investimento inicial.");
                }

                let expandedCashFlows = [];
                cashFlowRows.forEach(row => {
                    const amountInput = row.querySelector('.mirr-cash-flow-amount');
                    const quantityInput = row.querySelector('.mirr-cash-flow-quantity');

                    const amount = parseFloat(amountInput.value);
                    const quantity = parseInt(quantityInput.value, 10);

                    if (isNaN(amount)) {
                        throw new Error(`Valor inválido em uma das linhas de fluxo de caixa.`);
                    }
                    if (isNaN(quantity) || quantity < 1) {
                        throw new Error(`Quantidade inválida em uma das linhas de fluxo de caixa. A quantidade deve ser pelo menos 1.`);
                    }

                    for (let i = 0; i < quantity; i++) {
                        expandedCashFlows.push(amount);
                    }
                });

                if (expandedCashFlows.length === 0 && initialInvestment === 0) {
                    throw new Error("Nenhum fluxo de caixa efetivo para calcular a TIRM após expandir as quantidades.");
                }

                const N = expandedCashFlows.length;

                let pvOutflows = 0;
                if (initialInvestment < 0) {
                    pvOutflows += Math.abs(initialInvestment);
                }

                expandedCashFlows.forEach((cf, index) => {
                    const t = index + 1;
                    if (cf < 0) {
                        if (1 + financingRate === 0 && cf !== 0) throw new Error("Divisão por zero: a Taxa de Financiamento é -100% com fluxo de caixa negativo.");
                        pvOutflows += Math.abs(cf) / Math.pow(1 + financingRate, t);
                    }
                });

                let fvInflows = 0;
                if (initialInvestment > 0) {
                    fvInflows += initialInvestment * Math.pow(1 + reinvestmentRate, N);
                }

                expandedCashFlows.forEach((cf, index) => {
                    const t = index + 1;
                    if (cf > 0) {
                        fvInflows += cf * Math.pow(1 + reinvestmentRate, N - t);
                    }
                });

                if (N === 0 && initialInvestment === 0) {
                     throw new Error("Não é possível calcular a TIRM: Nenhum fluxo de caixa (N=0 e FC0=0).");
                }
                if (N === 0 && initialInvestment !== 0) {
                     if (initialInvestment < 0) {
                        mirrResultValue.textContent = "-100.000000%";
                        mirrResultContainer.style.display = 'block';
                        return;
                     } else {
                        throw new Error("Não é possível calcular a TIRM: Apenas um investimento inicial positivo e nenhum fluxo de caixa subsequente (N=0).");
                     }
                }

                if (pvOutflows === 0) {
                    if (fvInflows > 0 && N > 0) throw new Error("Não é possível calcular a TIRM: Nenhuma saída (VP das saídas é zero), mas há entradas ao longo de N períodos.");
                    if (fvInflows > 0 && N === 0) throw new Error("Não é possível calcular a TIRM: Nenhuma saída (VP das saídas é zero), mas há entradas (provavelmente o investimento inicial foi positivo, N=0).");
                    else if (fvInflows === 0 && N > 0) throw new Error("Não é possível calcular a TIRM: Tanto o VP das saídas quanto o VF das entradas são zero com N > 0.");
                    mirrResultValue.textContent = "N/A";
                    mirrResultContainer.style.display = 'block';
                    return;
                }
                if (fvInflows < 0 && pvOutflows > 0) {
                     throw new Error("Não é possível calcular a TIRM: O VF das entradas é negativo. Verifique os sinais do fluxo de caixa e a taxa de reinvestimento.");
                }
                 if (fvInflows === 0 && pvOutflows > 0 && N > 0) {
                     mirrResultValue.textContent = "-100.000000%";
                     mirrResultContainer.style.display = 'block';
                     return;
                 }

                const mirr = Math.pow(fvInflows / pvOutflows, 1 / N) - 1;

                if (!isFinite(mirr)) {
                     if (fvInflows === 0 && pvOutflows === 0 && N === 0) {
                         throw new Error("Não é possível calcular a TIRM: Nenhum fluxo de caixa.");
                     }
                    throw new Error("Não foi possível calcular uma TIRM finita. Verifique as entradas, especialmente se o VP das saídas for zero ou muito pequeno, ou se N for zero com VF positivo.");
                }

                mirrResultValue.textContent = (mirr * 100).toFixed(6) + "%";
                mirrResultContainer.style.display = 'block';

            } catch (error) {
                showMirrError("Erro de Cálculo: " + error.message);
                console.error("Erro no Cálculo da TIRM:", error);
            }
        });
    }

    if (mirrModal && mirrModalContent) {
        let isMirrDragging = false;
        let mirrDragOffsetX, mirrDragOffsetY;

        mirrModalContent.style.cursor = 'grab';
        mirrModalContent.addEventListener('mousedown', function(e) {
            const targetTagName = e.target.tagName.toLowerCase();
            const isInteractiveElement = ['button', 'input', 'select', 'textarea'].includes(targetTagName) ||
                                         e.target.classList.contains('close') ||
                                         e.target.closest('#mirrCashFlowsTable') ||
                                         e.target.closest('.mirr-btn-add') ||
                                         e.target.closest('.mirr-button-group');

            if (isInteractiveElement) return;

            isMirrDragging = true;
            if (getComputedStyle(mirrModalContent).position !== 'absolute') {
                const rect = mirrModalContent.getBoundingClientRect();
                mirrModalContent.style.position = 'absolute';
                mirrModalContent.style.left = rect.left + 'px';
                mirrModalContent.style.top = rect.top + 'px';
                mirrModalContent.style.margin = '0';
            }

            mirrDragOffsetX = e.clientX - mirrModalContent.offsetLeft;
            mirrDragOffsetY = e.clientY - mirrModalContent.offsetTop;
            mirrModalContent.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMirrMouseMove);
            document.addEventListener('mouseup', onMirrMouseUp);
        });

        function onMirrMouseMove(e) {
            if (!isMirrDragging) return;
            e.preventDefault();
            let newLeft = e.clientX - mirrDragOffsetX;
            let newTop = e.clientY - mirrDragOffsetY;

            const vpWidth = window.innerWidth;
            const vpHeight = window.innerHeight;
            const modalWidth = mirrModalContent.offsetWidth;
            const modalHeight = mirrModalContent.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, vpWidth - modalWidth));
            newTop = Math.max(0, Math.min(newTop, vpHeight - modalHeight));

            mirrModalContent.style.left = newLeft + 'px';
            mirrModalContent.style.top = newTop + 'px';
        }

        function onMirrMouseUp() {
            if (!isMirrDragging) return;
            isMirrDragging = false;
            mirrModalContent.style.cursor = 'grab';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMirrMouseMove);
            document.removeEventListener('mouseup', onMirrMouseUp);
        }
    }
});
