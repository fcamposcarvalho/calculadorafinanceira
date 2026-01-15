// calculator.js - Implementação da calculadora com modos ALG e RPN (Versão Corrigida e com Logs RPN)

document.addEventListener('DOMContentLoaded', function () {
    // -------------------------------------------------------------------
    // DECLARAÇÃO DE VARIÁVEIS DE ESTADO
    // -------------------------------------------------------------------

    // --- Estado Geral ---
    let activeInputField = null;
    const DEBUG_RPN = true; // Habilita/desabilita logs para depuração do modo RPN

    // --- Estado Modo Algébrico (ALG) ---
    let currentInput = '0';
    let previousInput = '';
    let calculationOperator = '';
    let resetScreen = false;
    let expressionMode = false;

    // --- Estado Modo Polonês Reverso (RPN) ---
    let rpnMode = false;
    let rpnStack = [0, 0, 0, 0]; // Representa T, Z, Y, X
    let isEntering = true; // Controla se a digitação substitui X ou anexa
    let stackLiftEnabled = true; // Controla se o stack lift ocorre na próxima entrada de dígito

    // --- Constantes ---
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

    if (!calculatorBtn) console.error("ERRO CRÍTICO: Botão #calculatorBtn NÃO encontrado!");
    if (!calculatorModal) console.error("ERRO CRÍTICO: Modal #calculatorModal NÃO encontrado!");


    // -------------------------------------------------------------------
    // LÓGICA DE ARRASTAR O MODAL (ORIGINAL)
    // -------------------------------------------------------------------
    if (calculatorModal && calculatorModalContentEl && closeCalculatorModal) {
        let isDragging = false;
        let dragOffsetX, dragOffsetY;

        window.resetCalculatorModalPosition = function () {
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
            calculatorModalContentEl.addEventListener('mousedown', function (e) {
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
        rpnMode = isRpn;
        if (rpnMode) {
            calculatorModal.classList.add('rpn-mode');
            algBtn.classList.remove('active');
            rpnBtn.classList.add('active');
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
    }

    // -------------------------------------------------------------------
    // FUNÇÕES DE ATUALIZAÇÃO DE VISOR
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
            stackDisplays.x.textContent = formatForDisplay(currentInput);
            stackDisplays.y.textContent = formatForDisplay(rpnStack[2]);
            stackDisplays.z.textContent = formatForDisplay(rpnStack[1]);
            stackDisplays.t.textContent = formatForDisplay(rpnStack[0]);

            // ADICIONADO: Atualiza também o visor principal no modo RPN
            if (algDisplayInput) {
                algDisplayInput.value = formatForDisplay(currentInput);
            }
        } else { // Modo ALG
            if (algDisplayInput) {
                // Alterado para usar a função de formatação para consistência
                algDisplayInput.value = formatForDisplay(currentInput);
            }
        }
    }

    // -------------------------------------------------------------------
    // LÓGICA DA PILHA RPN
    // -------------------------------------------------------------------
    function rpnEnter() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnEnter() chamado. Estado ANTES:', { stack: JSON.parse(JSON.stringify(rpnStack)), currentInput: currentInput, isEntering: isEntering });
        // Empilha: T recebe Z, Z recebe Y, Y recebe X (currentInput)
        // A ordem DEVE ser de cima para baixo para não perder valores
        rpnStack[0] = rpnStack[1]; // T = Z (antigo)
        rpnStack[1] = rpnStack[2]; // Z = Y (antigo)
        rpnStack[2] = parseFloat(currentInput) || 0; // Y = X (currentInput)
        // currentInput permanece o mesmo (comportamento padrão HP: duplica X em Y)
        isEntering = true;
        if (DEBUG_RPN) console.log('[RPN] <== rpnEnter() finalizado. Estado DEPOIS:', { stack: JSON.parse(JSON.stringify(rpnStack)), isEntering: isEntering });
    }

    function rpnDrop() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnDrop() chamado.');
        rpnStack[2] = rpnStack[1];
        rpnStack[1] = rpnStack[0];
        rpnStack[0] = 0;
        if (DEBUG_RPN) console.log('[RPN] <== rpnDrop() finalizado. Novo stack:', JSON.parse(JSON.stringify(rpnStack)));
    }

    // -------------------------------------------------------------------
    // FUNÇÕES DA CALCULADORA
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
            // A função parseFinancialInput vem do arquivo calculadorafinanceira.js
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
            if (isEntering) {
                if (DEBUG_RPN) console.log(`[RPN] inputDigit: isEntering é true. Trocando '${currentInput}' por '${digit}'`);
                currentInput = digit;
                isEntering = false;
            } else {
                currentInput = (currentInput === '0') ? digit : currentInput + digit;
            }
        } else {
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
            currentInput = (parseFloat(currentInput) * -1).toString();
            if (isEntering) isEntering = false;
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
            currentInput = (parseFloat(currentInput) / 100).toString();
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

    function calculate() { // Apenas para modo ALG
        if (rpnMode || currentInput === 'Erro') return;
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
                if (currentInput === '0') isEntering = true;
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
        if (rpnMode) return;
        const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^]*)$/);
        if (match && match[3] !== "") {
            currentInput = currentInput.substring(0, match[0].length - match[3].length);
        } else {
            currentInput = '0';
        }
        resetScreen = false;
    }

    function resetCalculator() {
        if (DEBUG_RPN && rpnMode) console.warn("--- CALCULADORA RESETADA ---");
        currentInput = '0';
        previousInput = '';
        calculationOperator = '';
        resetScreen = false;
        expressionMode = false;
        rpnStack = [0, 0, 0, 0];
        isEntering = true;
        stackLiftEnabled = true;
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

    function handleRpnOperation(action) {
        if (DEBUG_RPN) console.log(`[RPN] ==> handleRpnOperation('${action}') chamado. Estado ANTES:`, { stack: JSON.parse(JSON.stringify(rpnStack)), currentInput: currentInput, isEntering: isEntering, stackLiftEnabled: stackLiftEnabled });

        // CORREÇÃO: Não fazer stack lift automático antes de operações.
        // O stack lift só deve ocorrer ao digitar um novo número após ENTER ou após operação.
        // Para operações binárias, usamos Y e X diretamente.
        // Apenas garantimos que currentInput seja parseado como número.

        let x = parseFloat(currentInput);
        let y = rpnStack[2];
        let result;

        if (DEBUG_RPN) console.log(`[RPN] Operandos para '${action}':`, { y: y, x: x });


        const twoOperandOps = ['add', 'subtract', 'multiply', 'divide', 'power'];
        const oneOperandOps = ['inverse', 'sqrt', 'log', 'ln', 'exp'];

        if (twoOperandOps.includes(action)) {
            result = performRpnCalculation(action, y, x);
            if (result.toString() !== 'Erro') {
                if (DEBUG_RPN) console.log(`[RPN] Operação de 2 operandos bem-sucedida. Executando rpnDrop().`);
                rpnDrop();
            }
        } else if (oneOperandOps.includes(action)) {
            result = performRpnCalculation(action, x, null);
        } else {
            result = x;
        }

        if (DEBUG_RPN) console.log(`[RPN] Resultado do cálculo: ${result}`);

        currentInput = result.toString();
        isEntering = true;

        if (DEBUG_RPN) console.log(`[RPN] <== handleRpnOperation('${action}') finalizado. Estado DEPOIS:`, { stack: JSON.parse(JSON.stringify(rpnStack)), currentInput: currentInput, isEntering: isEntering });
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
            default: return 'Erro';
        }
    }

    // -------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------

    window.handleNumericInputKeydown = function (event) {
        const allowed = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace', 'Tab', 'Home', 'End', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ContextMenu', 'PageUp', 'PageDown', 'Insert', 'F5', 'F12', 'Enter'];
        if (allowed.includes(event.key) || (event.key.startsWith('F') && event.key !== 'F1')) return;
        if (event.key === 'F1') {
            event.preventDefault(); event.stopPropagation();
            openCalculator(event.target);
        }
    };
    window.handleNumericInputDblClick = function (event) {
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
                const buttonValue = button.textContent;

                if (currentInput === 'Erro' && action !== 'clear') {
                    return;
                }

                if (!action) { // Digit buttons
                    inputDigit(buttonValue);
                } else {
                    if (rpnMode) {
                        if (DEBUG_RPN) console.log(`--- [RPN] Clique no Botão --- Ação: '${action}', Valor: '${buttonValue}', Input Atual: '${currentInput}', isEntering: ${isEntering}`);
                        switch (action) {
                            case 'enter': rpnEnter(); break;
                            case 'clearX': currentInput = '0'; isEntering = true; break;
                            case 'swap':
                                let tempY = rpnStack[2]; rpnStack[2] = parseFloat(currentInput) || 0;
                                currentInput = tempY.toString(); isEntering = false; break;
                            case 'rollDown':
                                let tempX = parseFloat(currentInput) || 0;
                                currentInput = rpnStack[2].toString(); rpnStack[2] = rpnStack[1];
                                rpnStack[1] = rpnStack[0]; rpnStack[0] = tempX; isEntering = false; break;
                            case 'add': case 'subtract': case 'multiply': case 'divide': case 'power':
                            case 'inverse': case 'sqrt': case 'log': case 'ln': case 'exp':
                                handleRpnOperation(action); break;
                            default: // Shared actions
                                switch (action) {
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
                    } else { // ALG Mode
                        switch (action) {
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
                            case 'pi': case 'euler': case 'phi': inputConstant(action); break;
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