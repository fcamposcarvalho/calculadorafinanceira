// calculator.js - Implementação da calculadora com modos ALG e RPN (Versão Final e Completa)

document.addEventListener('DOMContentLoaded', function() {
    // -------------------------------------------------------------------
    // DECLARAÇÃO DE VARIÁVEIS DE ESTADO
    // -------------------------------------------------------------------
    
    let activeInputField = null; 
    const DEBUG_RPN = false; // Mude para true para ver os logs do modo RPN no console
    const DEBUG_ALG = false; // Mude para true para ver os logs do modo ALG no console

    // --- Estado Modo Algébrico (ALG) ---
    let currentInput = '0';
    let previousInput = '';
    let calculationOperator = '';
    let resetScreen = false;
    let expressionMode = false;

    // --- Estado Modo Polonês Reverso (RPN) ---
    let rpnMode = false;
    let rpnStack = [0, 0, 0, 0];
    let isEntering = true;
    
    // --- Acumuladores para Média Ponderada ---
    let weightedAvgSumOfProducts = 0;
    let weightedAvgSumOfWeights = 0;
    let weightedAvgEntries = 0;
    
    const MATH_CONSTANTS = {
        pi: Math.PI,
        euler: Math.E,
        phi: (1 + Math.sqrt(5)) / 2,
    };

    // -------------------------------------------------------------------
    // ELEMENTOS DO DOM
    // -------------------------------------------------------------------
    const calculatorBtn = document.getElementById('calculatorBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const closeCalculatorModal = document.getElementById('closeCalculatorModal');
    const calcButtons = document.querySelectorAll('.calc-btn');
    const calculatorModalContentEl = calculatorModal ? calculatorModal.querySelector('.modal-content.calculator-modal') : null;

    const algBtn = document.getElementById('algBtn');
    const rpnBtn = document.getElementById('rpnBtn');
    const algDisplayInput = document.getElementById('calcDisplay');
    const stackDisplays = {
        t: document.getElementById('stackT'),
        z: document.getElementById('stackZ'),
        y: document.getElementById('stackY'),
        x: document.getElementById('stackX')
    };
    const equalsEnterBtn = document.getElementById('equalsEnterBtn');
    const ceClxBtn = document.getElementById('ceClxBtn');
    const parenSwapBtn = document.getElementById('parenSwapBtn');
    const parenRollBtn = document.getElementById('parenRollBtn');
    
    const rpnAdvancedRow = document.querySelector('.rpn-only-row');

    if (!calculatorBtn) console.error("ERRO CRÍTICO: Botão #calculatorBtn NÃO encontrado!");
    if (!calculatorModal) console.error("ERRO CRÍTICO: Modal #calculatorModal NÃO encontrado!");
    if (!rpnAdvancedRow) console.warn("AVISO: A linha de botões avançados RPN (.rpn-only-row) não foi encontrada no HTML.");

    // -------------------------------------------------------------------
    // LÓGICA DE ARRASTAR O MODAL
    // -------------------------------------------------------------------
    if (calculatorModal && calculatorModalContentEl && closeCalculatorModal) {
        let isDragging = false;
        let dragOffsetX, dragOffsetY;

        window.resetCalculatorModalPosition = function() {
            if (calculatorModalContentEl) {
                calculatorModalContentEl.style.position = '';
                calculatorModalContentEl.style.left = '';
                calculatorModalContentEl.style.top = '';
                calculatorModalContentEl.style.margin = '';
                calculatorModalContentEl.style.cursor = 'grab';
            }
        }

        if (calculatorModalContentEl) {
            calculatorModalContentEl.style.cursor = 'grab';
            calculatorModalContentEl.addEventListener('mousedown', function(e) {
                const targetTagName = e.target.tagName.toLowerCase();
                const isInteractiveElement = targetTagName === 'button' || targetTagName === 'input' || e.target === closeCalculatorModal || e.target.closest('.calc-buttons');
                if (isInteractiveElement) return;

                isDragging = true;
                if (calculatorModalContentEl.style.position !== 'absolute') {
                    const rect = calculatorModalContentEl.getBoundingClientRect();
                    calculatorModalContentEl.style.position = 'absolute';
                    calculatorModalContentEl.style.left = rect.left + 'px';
                    calculatorModalContentEl.style.top = rect.top + 'px';
                    calculatorModalContentEl.style.margin = '0';
                }
                dragOffsetX = e.clientX - calculatorModalContentEl.offsetLeft;
                dragOffsetY = e.clientY - calculatorModalContentEl.offsetTop;
                calculatorModalContentEl.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;
            const vpWidth = window.innerWidth, vpHeight = window.innerHeight;
            const modalWidth = calculatorModalContentEl.offsetWidth, modalHeight = calculatorModalContentEl.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, vpWidth - modalWidth));
            newTop = Math.max(0, Math.min(newTop, vpHeight - modalHeight));
            calculatorModalContentEl.style.left = newLeft + 'px';
            calculatorModalContentEl.style.top = newTop + 'px';
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            if (calculatorModalContentEl) calculatorModalContentEl.style.cursor = 'grab';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    } else {
        console.warn("Lógica de arrastar do modal NÃO configurada devido a elementos ausentes.");
    }
    
    // -------------------------------------------------------------------
    // FUNÇÕES DE GERENCIAMENTO DE MODO
    // -------------------------------------------------------------------
    function setMode(isRpn) {
        const valueToCarryOver = (currentInput === 'Erro') ? '0' : currentInput;

        rpnMode = isRpn;
        if (rpnMode) {
            calculatorModal.classList.add('rpn-mode');
            algBtn.classList.remove('active');
            rpnBtn.classList.add('active');
            if(rpnAdvancedRow) rpnAdvancedRow.style.display = '';
            equalsEnterBtn.textContent = 'ENTER';
            equalsEnterBtn.dataset.action = 'enter';
            ceClxBtn.textContent = 'CLx';
            ceClxBtn.dataset.action = 'clearX';
            parenSwapBtn.textContent = 'x↔y';
            parenSwapBtn.dataset.action = 'swap';
            parenRollBtn.textContent = 'R↓';
            parenRollBtn.dataset.action = 'rollDown';
        } else {
            calculatorModal.classList.remove('rpn-mode');
            rpnBtn.classList.remove('active');
            algBtn.classList.add('active');
            if(rpnAdvancedRow) rpnAdvancedRow.style.display = 'none';
            equalsEnterBtn.textContent = '=';
            equalsEnterBtn.dataset.action = 'equals';
            ceClxBtn.textContent = 'CE';
            ceClxBtn.dataset.action = 'clearEntry';
            parenSwapBtn.textContent = '(';
            parenSwapBtn.dataset.action = 'openParenthesis';
            parenRollBtn.textContent = ')';
            parenRollBtn.dataset.action = 'closeParenthesis';
        }

        resetCalculator();
        currentInput = valueToCarryOver;
        updateDisplay();
    }
    
    // -------------------------------------------------------------------
    // FUNÇÕES DE ATUALIZAÇÃO DE VISOR E FORMATAÇÃO
    // -------------------------------------------------------------------
    function formatForDisplay(value) {
        let num = Number(value);
        if (isNaN(num)) return 'Erro';
        if (Math.abs(num) > 999999999999 || (Math.abs(num) < 0.0000001 && num !== 0)) {
            return num.toExponential(6).replace('.', ',');
        }
        return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10, useGrouping: true }).format(num);
    }
    
    function updateDisplay() {
        if (rpnMode) {
            if (DEBUG_RPN) console.log(`[RPN] updateDisplay: X=${currentInput}, Y=${rpnStack[2]}, isEntering=${isEntering}`);
            if(stackDisplays.x) stackDisplays.x.textContent = formatForDisplay(currentInput);
            if(stackDisplays.y) stackDisplays.y.textContent = formatForDisplay(rpnStack[2]);
            if(stackDisplays.z) stackDisplays.z.textContent = formatForDisplay(rpnStack[1]);
            if(stackDisplays.t) stackDisplays.t.textContent = formatForDisplay(rpnStack[0]);

            if (algDisplayInput) {
                let displayValue = formatForDisplay(currentInput);
                if (currentInput.slice(-1) === '.' && currentInput.indexOf('.') === currentInput.length - 1) {
                    if (!displayValue.includes(',')) {
                        displayValue += ',';
                    }
                }
                algDisplayInput.value = displayValue;
            }
        } else {
            if (DEBUG_ALG) console.log(`[ALG] updateDisplay: currentInput=${currentInput}`);
            if (algDisplayInput) {
                algDisplayInput.value = currentInput.toString().replace(/\./g, ',');
            }
        }
    }

    // -------------------------------------------------------------------
    // LÓGICA DA PILHA E FUNÇÕES AUXILIARES RPN
    // -------------------------------------------------------------------
    function rpnEnter() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnEnter() chamado.');
        rpnStack[0] = rpnStack[1];
        rpnStack[1] = rpnStack[2];
        rpnStack[2] = parseFloat(currentInput.replace(',', '.')) || 0;
        isEntering = true;
    }

    function rpnDrop() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnDrop() chamado.');
        rpnStack[2] = rpnStack[1];
        rpnStack[1] = rpnStack[0];
        rpnStack[0] = 0;
    }
    
    function parseDateHP(dateNumber) {
        try {
            const s = dateNumber.toString().replace(',', '.');
            const parts = s.split('.');
            if (parts.length !== 2 || !parts[1]) return null;
            const day = parseInt(parts[0]);
            const rest = parts[1];
            let month, year;
            if (rest.length === 5 || rest.length === 6) {
                month = parseInt(rest.substring(0, 2));
                year = parseInt(rest.substring(2));
            } else { return null; }
            if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
                return null;
            }
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
                return dateObj;
            }
            return null;
        } catch {
            return null;
        }
    }

    function resetWeightedAverage() {
        if (DEBUG_RPN) console.log('[RPN] Acumuladores de Média Ponderada zerados.');
        weightedAvgSumOfProducts = 0;
        weightedAvgSumOfWeights = 0;
        weightedAvgEntries = 0;
    }
    
    // -------------------------------------------------------------------
    // FUNÇÕES DA CALCULADORA (Lógica de input e cálculo)
    // -------------------------------------------------------------------
    function getOperatorChar(opAction) {
        switch (opAction) {
            case 'add': return '+'; case 'subtract': return '-';
            case 'multiply': return '×'; case 'divide': return '÷';
            case 'power': return '^'; default: return '';
        }
    }

    function _resetCalculationInternalState() {
        previousInput = '';
        calculationOperator = '';
        resetScreen = true;
        expressionMode = false;
    }
    
    function openCalculator(inputField = null) {
        if (!calculatorModal) return;
        if (typeof window.resetCalculatorModalPosition === 'function') {
            window.resetCalculatorModalPosition();
        }
        
        activeInputField = inputField;
        resetCalculator();

        if (inputField && inputField.value && inputField.value.trim() !== "") {
            const parsedValue = typeof parseFinancialInput === 'function' ? parseFinancialInput(inputField.value) : parseFloat(inputField.value.replace(/\./g, '').replace(',', '.'));
            if (!isNaN(parsedValue)) {
                currentInput = parsedValue.toString();
                if (rpnMode) {
                    rpnEnter();
                } else {
                    resetScreen = true;
                }
            }
        }
        updateDisplay();
        calculatorModal.style.display = "flex";
    }

    function inputDigit(digit) {
        if (rpnMode) {
            // AJUSTE FINAL: Implementa o "Stack Lift" automático.
            if (isEntering) {
                // Se o valor em X é diferente de Y, significa que um cálculo acabou de acontecer.
                // Então, "salvamos" o resultado na pilha antes de começar o novo número.
                if (parseFloat(currentInput.replace(',', '.')) !== rpnStack[2]) {
                    rpnEnter();
                }
                currentInput = digit;
                isEntering = false;
            } else {
                currentInput = (currentInput === '0') ? digit : currentInput + digit;
            }
        } else { // MODO ALG (Inalterado)
            if (resetScreen) {
                currentInput = digit;
                resetScreen = false;
            } else {
                currentInput = (currentInput === '0') ? digit : currentInput + digit;
            }
            expressionMode = true;
        }
    }

    function inputConstant(constantName) {
        const value = MATH_CONSTANTS[constantName].toString();
        if (rpnMode) {
            if (!isEntering) rpnEnter();
            currentInput = value;
            isEntering = true;
        } else {
            if (resetScreen) {
                currentInput = value;
                resetScreen = false;
            } else {
                currentInput += value;
            }
            expressionMode = true;
        }
    }

    function inputParenthesis(parenthesis) {
        if (rpnMode) return;
        if (resetScreen) {
            currentInput = parenthesis;
            resetScreen = false;
        } else {
             currentInput = (currentInput === '0') ? parenthesis : currentInput + parenthesis;
        }
        expressionMode = true;
    }

    function calculateFunction(funcKey) {
        if (rpnMode) {
            handleRpnOperation(funcKey);
        } else {
            const displayFunction = funcKey + '(';
            if (resetScreen) {
                currentInput = displayFunction;
                resetScreen = false;
            } else {
                currentInput = (currentInput === '0') ? displayFunction : currentInput + displayFunction;
            }
            expressionMode = true;
        }
    }

    function inputDecimal() {
        if (rpnMode) {
            if (isEntering) {
                currentInput = '0.';
                isEntering = false;
            } else if (!currentInput.includes('.')) {
                currentInput += '.';
            }
        } else {
            if (resetScreen) {
                currentInput = '0.';
                resetScreen = false;
            }
            const lastNumberMatch = currentInput.match(/[\d.]+$/);
            if (lastNumberMatch && lastNumberMatch[0].includes('.')) {
                return;
            }
            currentInput += '.';
            expressionMode = true;
        }
    }
    
    function handleOperator(operatorAction) {
        if (rpnMode) {
            handleRpnOperation(operatorAction);
            return;
        }
        const operatorChar = getOperatorChar(operatorAction);
        if (currentInput === 'Erro') return;
        const lastChar = currentInput.slice(-1);
        if ('+-×÷^'.includes(lastChar)) {
            currentInput = currentInput.slice(0, -1) + operatorChar;
        } else {
            currentInput += operatorChar;
        }
        expressionMode = true;
        resetScreen = false;
    }
    
    function negateValue() {
        if (currentInput === 'Erro') return;
        if (rpnMode) {
            currentInput = (parseFloat(currentInput.replace(',', '.')) * -1).toString();
            if(isEntering) isEntering = false;
        } else {
            const match = currentInput.match(/([+\-×÷^])?([0-9.]+)$/);
            if (match) {
                const prefixIndex = match.index + (match[1] ? 1 : 0);
                const prefix = currentInput.substring(0, prefixIndex);
                const sign = match[1];
                const number = match[2];
                if (sign === '+') {
                    currentInput = currentInput.substring(0, prefixIndex - 1) + '-' + number;
                } else if (sign === '-') {
                    const charBeforeSign = currentInput.charAt(prefixIndex - 2);
                    if ('×÷^('.includes(charBeforeSign) || prefixIndex === 1) {
                        currentInput = currentInput.substring(0, prefixIndex - 1) + number;
                    } else {
                         currentInput = currentInput.substring(0, prefixIndex - 1) + '+' + number;
                    }
                } else {
                    currentInput = prefix + '-' + number;
                }
            } else if (!isNaN(parseFloat(currentInput))) {
                 currentInput = (parseFloat(currentInput) * -1).toString();
            }
        }
    }

    function inputPercent() {
        if (rpnMode) {
            currentInput = (parseFloat(currentInput.replace(',', '.')) / 100).toString();
            isEntering = true; 
        } else {
            if (currentInput === 'Erro') return;
            const lastChar = currentInput.slice(-1);
            if (!isNaN(parseInt(lastChar)) || lastChar === ')') {
                currentInput += '%';
            }
        }
    }

    function calculateInverse() {
        if (rpnMode) {
            handleRpnOperation('inverse');
        } else {
            if (currentInput === 'Erro') return;
            if (!isNaN(parseFloat(currentInput))) {
                const value = parseFloat(currentInput);
                currentInput = (value === 0) ? 'Erro' : (1 / value).toString();
                resetScreen = true;
            }
        }
    }

    function formatResult(value) {
        if (!isFinite(value)) return "Erro";
        const stringValue = Number(value.toPrecision(12)).toString();
        return parseFloat(stringValue).toString();
    }

    function calculate() {
        if (rpnMode || currentInput === 'Erro') return;
        if (DEBUG_ALG) console.log(`[ALG] ==> calculate() chamado. Expressão: "${currentInput}"`);
        let expressionToEvaluate = currentInput;
        try {
            let openCount = (expressionToEvaluate.match(/\(/g) || []).length;
            let closeCount = (expressionToEvaluate.match(/\)/g) || []).length;
            if (openCount > closeCount) {
                expressionToEvaluate += ')'.repeat(openCount - closeCount);
            }
            expressionToEvaluate = expressionToEvaluate
                .replace(/,/g, '.').replace(/π/g, `(${MATH_CONSTANTS.pi})`)
                .replace(/e(?!xp)/g, `(${MATH_CONSTANTS.euler})`).replace(/φ/g, `(${MATH_CONSTANTS.phi})`)
                .replace(/sqrt\(/g, 'Math.sqrt(').replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(').replace(/exp\(/g, 'Math.exp(')
                .replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**')
                .replace(/(\d+\.?\d*|\([\s\S]+?\))%/g, (match, p1) => `(${p1}/100)`);
            
            const result = eval(expressionToEvaluate);
            currentInput = (result === undefined || result === null || !isFinite(result)) ? 'Erro' : formatResult(result);
            _resetCalculationInternalState();
        } catch (error) {
            console.error("Erro ao avaliar a expressão:", error, "Expressão:", expressionToEvaluate);
            currentInput = 'Erro';
            _resetCalculationInternalState();
        }
    }

    function backspace() {
        if (rpnMode) {
            if (!isEntering) {
                currentInput = (currentInput.length > 1) ? currentInput.slice(0, -1) : '0';
                if(currentInput === '0') isEntering = true;
            }
        } else {
            if (currentInput === 'Erro' || currentInput.length === 1) {
                resetCalculator();
                return;
            }
            currentInput = currentInput.slice(0, -1);
        }
    }

    function clearEntry() {
        if (rpnMode) {
            currentInput = '0';
            isEntering = true;
            resetWeightedAverage();
        } else {
            const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^]*)$/);
            if (match && match[3] !== "") {
                currentInput = currentInput.substring(0, match[0].length - match[3].length);
            } else {
                currentInput = '0';
            }
            resetScreen = false;
        }
    }

    function resetCalculator() {
        if (DEBUG_RPN && rpnMode) console.warn("--- [RPN] CALCULADORA RESETADA ---");
        if (DEBUG_ALG && !rpnMode) console.warn("--- [ALG] CALCULADORA RESETADA ---");
        currentInput = '0';
        previousInput = '';
        calculationOperator = '';
        resetScreen = false;
        expressionMode = false;
        rpnStack = [0, 0, 0, 0];
        isEntering = true;
        resetWeightedAverage();
    }

    function applyValueToField() {
        if (activeInputField) {
            if (!rpnMode) calculate();
            if (currentInput === 'Erro') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField.focus(); activeInputField = null; return;
            }
            let valueToApply = currentInput.replace('.', ',');
            const numericValue = parseFloat(currentInput);
            if (!isNaN(numericValue)) {
                const rateFieldIds = ['rate', 'mirrFinancingRate', 'mirrReinvestmentRate', 'npvDiscountRate', 'npvFinancingRate', 'npvReinvestmentRate'];
                if (rateFieldIds.includes(activeInputField.id)) {
                    valueToApply = numericValue.toFixed(8).replace('.', ',');
                } else if (activeInputField.id === 'periods') {
                    valueToApply = Math.round(numericValue);
                } else {
                    valueToApply = numericValue.toFixed(2).replace('.', ',');
                }
            }
            activeInputField.value = valueToApply;
            if (calculatorModal) calculatorModal.style.display = "none";
            activeInputField.dispatchEvent(new Event('input', { bubbles: true }));
            activeInputField.dispatchEvent(new Event('change', { bubbles: true }));
            activeInputField.focus();
            activeInputField = null;
        } else {
            if (calculatorModal) calculatorModal.style.display = "none";
        }
    }
    
    // -------------------------------------------------------------------
    // LÓGICA DE OPERAÇÃO RPN
    // -------------------------------------------------------------------
    function handleRpnOperation(action) {
        const oneOperandOps = ['inverse', 'sqrt', 'log', 'ln', 'exp'];
        if (isEntering && !['swap', 'rollDown'].includes(action) && !oneOperandOps.includes(action)) {
            rpnEnter();
        }
        
        let x = parseFloat(currentInput.replace(',', '.'));
        let y = rpnStack[2];
        let result;

        const twoOperandOps = ['add', 'subtract', 'multiply', 'divide', 'power', 'dateDiff', 'percentDiff', 'equivRate'];

        if (twoOperandOps.includes(action)) {
            result = performRpnCalculation(action, y, x);
            if (result.toString() !== 'Erro') rpnDrop();
            isEntering = true;
        } else if (oneOperandOps.includes(action)) {
            result = performRpnCalculation(action, x);
            isEntering = false;
        } else {
            result = x;
        }
        
        currentInput = result.toString();
    }

    function handleWeightedAverage() {
        const weight = parseFloat(currentInput.replace(',', '.'));
        const value = rpnStack[2];

        if (isNaN(weight) || isNaN(value)) {
            currentInput = 'Erro';
            isEntering = true;
            return;
        }

        weightedAvgSumOfProducts += value * weight;
        weightedAvgSumOfWeights += weight;
        weightedAvgEntries++;

        const average = (weightedAvgSumOfWeights === 0) ? 0 : weightedAvgSumOfProducts / weightedAvgSumOfWeights;
        
        currentInput = average.toString();
        rpnStack[2] = weightedAvgEntries;
        rpnStack[1] = rpnStack[0];
        rpnStack[0] = 0;
        isEntering = true;
    }

    function performRpnCalculation(operator, op1, op2) {
        switch (operator) {
            case 'add': return op1 + op2;
            case 'subtract': return op1 - op2;
            case 'multiply': return op1 * op2;
            case 'divide': return op2 === 0 ? 'Erro' : op1 / op2;
            case 'power': return Math.pow(op1, op2);
            case 'inverse': return op1 === 0 ? 'Erro' : 1 / op1;
            case 'sqrt': return op1 < 0 ? 'Erro' : Math.sqrt(op1);
            case 'log': return op1 <= 0 ? 'Erro' : Math.log10(op1);
            case 'ln': return op1 <= 0 ? 'Erro' : Math.log(op1);
            case 'exp': return Math.exp(op1);
            case 'dateDiff':
                const date1 = parseDateHP(op1);
                const date2 = parseDateHP(op2);
                if (!date1 || !date2) return 'Erro';
                const diffTime = Math.abs(date2.getTime() - date1.getTime());
                return Math.round(diffTime / (1000 * 60 * 60 * 24));
            case 'percentDiff':
                if (op1 === 0) return 'Erro';
                return ((op2 - op1) / op1) * 100;
            case 'equivRate':
                const i = op1 / 100;
                return (Math.pow(1 + i, op2) - 1) * 100;
            default: return 'Erro';
        }
    }

    // -------------------------------------------------------------------
    // EVENT LISTENERS E INICIALIZAÇÃO
    // -------------------------------------------------------------------
    window.handleNumericInputKeydown = function(event) {
        const allowed = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace','Tab','Home','End','Shift','Control','Alt','Meta','CapsLock','ContextMenu','PageUp','PageDown','Insert','F5','F12','Enter'];
        if (allowed.includes(event.key) || (event.key.startsWith('F') && event.key !== 'F1')) return;
        if (event.key === 'F1') {
            event.preventDefault(); event.stopPropagation();
            openCalculator(event.target);
        }
    };
    window.handleNumericInputDblClick = function(event) {
        event.preventDefault(); openCalculator(event.target);
    };
    function setupNumericInputs() {
        const numericInputs = document.querySelectorAll('input[type="number"], input[type="text"][inputmode="decimal"]');
        numericInputs.forEach(input => {
            input.removeEventListener('keydown', window.handleNumericInputKeydown);
            input.addEventListener('keydown', window.handleNumericInputKeydown);
            input.removeEventListener('dblclick', window.handleNumericInputDblClick);
            input.addEventListener('dblclick', window.handleNumericInputDblClick);
            if (!input.title) input.title = "Pressione F1 ou duplo clique para acessar a calculadora";
            input.removeEventListener('focus', highlightInput);
            input.removeEventListener('blur', unhighlightInput);
            input.addEventListener('focus', highlightInput);
            input.addEventListener('blur', unhighlightInput);
        });
    }
    function highlightInput() { this.classList.add('highlighted'); }
    function unhighlightInput() { this.classList.remove('highlighted'); }
    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const inputs = node.matches('input[type="number"], input[type="text"][inputmode="decimal"]') ? [node] : [...node.querySelectorAll('input[type="number"], input[type="text"][inputmode="decimal"]')];
                        inputs.forEach(input => setupNumericInputs());
                    }
                });
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (algBtn) algBtn.addEventListener('click', () => setMode(false));
    if (rpnBtn) rpnBtn.addEventListener('click', () => setMode(true));
    
    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', () => openCalculator());
    }
    if (closeCalculatorModal) {
        closeCalculatorModal.addEventListener('click', () => {
            if (calculatorModal) calculatorModal.style.display = "none";
        });
    }

    if (calcButtons && calcButtons.length > 0) {
        calcButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                
                if (currentInput === 'Erro' && action !== 'clear') {
                    return;
                }

                if (!action) {
                    inputDigit(button.textContent);
                } else {
                    if (rpnMode) {
                        switch (action) {
                            case 'enter': rpnEnter(); break;
                            case 'clearX': clearEntry(); break;
                            case 'swap':
                                let tempY = rpnStack[2]; rpnStack[2] = parseFloat(currentInput.replace(',', '.')) || 0;
                                currentInput = tempY.toString(); isEntering = false; break;
                            case 'rollDown':
                                let tempX = parseFloat(currentInput.replace(',', '.')) || 0;
                                currentInput = rpnStack[2].toString(); rpnStack[2] = rpnStack[1];
                                rpnStack[1] = rpnStack[0]; rpnStack[0] = tempX; isEntering = false; break;
                            case 'add': case 'subtract': case 'multiply': case 'divide': case 'power':
                            case 'inverse': case 'sqrt': case 'log': case 'ln': case 'exp':
                            case 'dateDiff': case 'percentDiff': case 'equivRate':
                                handleRpnOperation(action); break;
                            case 'weightedAverage':
                                handleWeightedAverage(); break;
                            default:
                                switch(action) {
                                    case 'percent': inputPercent(); break;
                                    case 'decimal': inputDecimal(); break;
                                    case 'negate': negateValue(); break;
                                    case 'clear': resetCalculator(); break;
                                    case 'backspace': backspace(); break;
                                    case 'apply': applyValueToField(); break;
                                    case 'pi': case 'euler': case 'phi': inputConstant(action); break;
                                }
                                break;
                        }
                    } else {
                        switch(action) {
                            case 'add': case 'subtract': case 'multiply': case 'divide': case 'power': handleOperator(action); break;
                            case 'openParenthesis': inputParenthesis('('); break;
                            case 'closeParenthesis': inputParenthesis(')'); break;
                            case 'percent': inputPercent(); break;
                            case 'sqrt': calculateFunction('sqrt'); break;
                            case 'inverse': calculateInverse(); break;
                            case 'negate': negateValue(); break;
                            case 'log': calculateFunction('log'); break;
                            case 'ln': calculateFunction('ln'); break;
                            case 'exp': calculateFunction('exp'); break;
                            case 'pi': inputConstant('pi'); break;
                            case 'euler': inputConstant('euler'); break;
                            case 'phi': inputConstant('phi'); break;
                            case 'decimal': inputDecimal(); break;
                            case 'clear': resetCalculator(); break;
                            case 'clearEntry': clearEntry(); break;
                            case 'backspace': backspace(); break;
                            case 'equals': calculate(); break;
                            case 'apply': applyValueToField(); break;
                        }
                    }
                }
                updateDisplay();
            });
        });
    }
    
    // --- INICIALIZAÇÃO ---
    setupNumericInputs();
    setMode(false);
});