// calculator.js - Implementação da calculadora básica

document.addEventListener('DOMContentLoaded', function() {
    // -------------------------------------------------------------------
    // DECLARAÇÃO DE VARIÁVEIS DE ESTADO
    // -------------------------------------------------------------------
    let currentInput = '0';
    let previousInput = '';
    let calculationOperator = '';
    let resetScreen = false;
    let expressionMode = false;
    let activeInputField = null; // Será usado para saber qual campo preencher

    // Constantes matemáticas
    const MATH_CONSTANTS = {
        pi: Math.PI,
        euler: Math.E,
        phi: (1 + Math.sqrt(5)) / 2,
    };
    const CONSTANT_VALUES_AS_STRINGS = Object.values(MATH_CONSTANTS).map(v => v.toString());
    const FUNCTION_NAMES = ['sqrt', 'log', 'ln', 'exp'];
    // -------------------------------------------------------------------

    // Elementos do DOM
    const calculatorBtn = document.getElementById('calculatorBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const closeCalculatorModal = document.getElementById('closeCalculatorModal');
    const calcDisplay = document.getElementById('calcDisplay');
    const calcButtons = document.querySelectorAll('.calc-btn');
    const calculatorModalContentEl = calculatorModal ? calculatorModal.querySelector('.modal-content.calculator-modal') : null;

    if (!calculatorBtn) console.error("ERRO CRÍTICO: Botão #calculatorBtn NÃO encontrado!");
    if (!calculatorModal) console.error("ERRO CRÍTICO: Modal #calculatorModal NÃO encontrado!");
    if (!closeCalculatorModal) console.warn("AVISO: Botão #closeCalculatorModal não encontrado.");
    if (!calcDisplay) console.warn("AVISO: Display #calcDisplay não encontrado.");


    // --- LÓGICA DE ARRASTAR O MODAL ---
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
    // --- FIM DO ARRASTE ---

    // --- FUNÇÕES AUXILIARES ---
    function endsWithConstant(str) {
        for (const c of CONSTANT_VALUES_AS_STRINGS) {
            if (str.endsWith(c)) {
                if (str.length === c.length || !/[a-zA-Z0-9.]/.test(str.charAt(str.length - c.length - 1))) {
                    return true;
                }
            }
        }
        return false;
    }

    function endsWithCompleteFunction(str) {
        for (const funcName of FUNCTION_NAMES) {
            if (str.endsWith(')')) {
                const funcCallRegex = new RegExp(funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\((.*)\\)$');
                const match = str.match(funcCallRegex);
                if (match) {
                    let openParen = 0;
                    for (const char of match[1]) {
                        if (char === '(') openParen++;
                        else if (char === ')') openParen--;
                        if (openParen < 0) return false;
                    }
                    return openParen === 0;
                }
            }
        }
        return false;
    }

    function shouldInsertMultiplication(inputStr) {
        if (inputStr === '0' || inputStr === 'Erro') return false;
        const lastChar = inputStr.charAt(inputStr.length - 1);
        return (/\d$/.test(lastChar) || lastChar === ')' || endsWithConstant(inputStr) || endsWithCompleteFunction(inputStr));
    }

    function getOperatorChar(opAction) {
        switch (opAction) {
            case 'add': return '+';
            case 'subtract': return '-';
            case 'multiply': return '×';
            case 'divide': return '÷';
            case 'power': return '^';
            default: return '';
        }
    }

    function _resetCalculationInternalState() {
        previousInput = '';
        calculationOperator = '';
        resetScreen = true;
        expressionMode = false;
    }

    // --- FUNÇÕES PRINCIPAIS DA CALCULADORA ---
    function openCalculator(inputField = null) {
        if (!calculatorModal) {
            console.error("ERRO em openCalculator: calculatorModal é NULO!");
            return;
        }
        if (typeof window.resetCalculatorModalPosition === 'function') {
            window.resetCalculatorModalPosition();
        }
        calculatorModal.style.display = "flex";

        if (inputField) {
            activeInputField = inputField;
            if (inputField.value && inputField.value.trim() !== "") {
                const parsedValue = parseFinancialInput(inputField.value);
                if (!isNaN(parsedValue)) {
                    currentInput = parsedValue.toString(); // Use the parsed value without comma
                    resetScreen = true;
                    expressionMode = false;
                } else {
                    resetCalculator();
                }
            } else {
                resetCalculator();
            }
        } else {
            activeInputField = null;
            resetCalculator();
        }

        updateDisplay();
    }


    function updateDisplay() {
        if (calcDisplay) {
            calcDisplay.value = currentInput.replace('.', ',');
        }
    }

    function inputDigit(digit) {
        if (resetScreen) {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if (!'+-×÷^('.includes(lastChar) && currentInput !== 'Erro') {
                if (shouldInsertMultiplication(currentInput)) {
                    currentInput += '×' + digit;
                } else {
                    currentInput = digit;
                }
            } else {
                if (currentInput === 'Erro') currentInput = digit;
                else currentInput += digit;
            }
            resetScreen = false;
        } else {
            if (currentInput.charAt(currentInput.length - 1) === ')' && /\d$/.test(digit)) {
                 currentInput += '×' + digit;
            } else {
                currentInput = (currentInput === '0') ? digit : currentInput + digit;
            }
        }
        expressionMode = true;
    }

    function inputConstant(constantName) {
        const value = MATH_CONSTANTS[constantName].toString();
        if (resetScreen && !'+-×÷^('.includes(currentInput.charAt(currentInput.length - 1)) && currentInput !== 'Erro') {
            if (shouldInsertMultiplication(currentInput)) {
                currentInput += '×' + value;
            } else {
                currentInput = value;
            }
        } else {
            if (shouldInsertMultiplication(currentInput)) {
                currentInput += '×' + value;
            } else {
                 currentInput = (currentInput === '0' || currentInput === 'Erro') ? value : currentInput + value;
            }
        }
        expressionMode = true;
        resetScreen = true;
    }

    function inputParenthesis(parenthesis) {
        expressionMode = true;
        if (parenthesis === '(') {
            if (shouldInsertMultiplication(currentInput)) {
                currentInput += '×' + parenthesis;
            } else {
                currentInput = (currentInput === '0' || currentInput === 'Erro') ? parenthesis : currentInput + parenthesis;
            }
        } else { // ')'
            let openCount = (currentInput.match(/\(/g) || []).length;
            let closeCount = (currentInput.match(/\)/g) || []).length;
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if (openCount > closeCount && !'+-×÷^('.includes(lastChar) && lastChar !== 'Erro') {
                currentInput += parenthesis;
            } else {
                return;
            }
        }
        resetScreen = false;
    }

    function calculateFunction(funcKey) {
        const displayFunction = funcKey;
        expressionMode = true;
        if (shouldInsertMultiplication(currentInput)) {
            currentInput += '×' + displayFunction + '(';
        } else {
            currentInput = (currentInput === '0' || currentInput === 'Erro') ? (displayFunction + '(') : (currentInput + displayFunction + '(');
        }
        resetScreen = false;
    }

    function inputDecimal() {
        const match = currentInput.match(/[^+\-×÷^()]*$/);
        const lastNumberSegment = match ? match[0] : "";
        if (lastNumberSegment.includes('.')) return;

        if (resetScreen) {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if ('+-×÷^('.includes(lastChar) || currentInput === 'Erro') {
                currentInput = (currentInput === 'Erro' ? '0.' : currentInput + '0.');
            } else {
                 if (shouldInsertMultiplication(currentInput)){
                     currentInput += '×0.';
                 } else {
                     currentInput = '0.';
                 }
            }
            resetScreen = false;
        } else {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if (currentInput === '0') {
                currentInput = '0.';
            } else if ('+-×÷^('.includes(lastChar)) {
                currentInput += '0.';
            } else {
                currentInput += '.';
            }
        }
        expressionMode = true;
    }

    function handleOperator(operatorAction) {
        const operatorChar = getOperatorChar(operatorAction);
        const lastChar = currentInput.charAt(currentInput.length - 1);

        if (currentInput === 'Erro') return;

        if ('+-×÷^'.includes(lastChar) && lastChar !== '(') {
            if (operatorChar === '-' && (lastChar === '×' || lastChar === '÷' || lastChar === '^')) {
                currentInput += operatorChar;
            } else {
                currentInput = currentInput.slice(0, -1) + operatorChar;
            }
        } else if (lastChar !== '(' || operatorChar === '-') {
            currentInput += operatorChar;
        } else {
            return;
        }
        expressionMode = true;
        resetScreen = true;
    }

    function negateValue() {
        if (currentInput === 'Erro') return;
        if (!expressionMode && currentInput !== '0' && !isNaN(parseFloat(currentInput))) {
            currentInput = (parseFloat(currentInput) * -1).toString();
            updateDisplay();
            return;
        }
        if (currentInput === '0') { currentInput = '-'; expressionMode = true; updateDisplay(); return; }
        if (currentInput === '-') { currentInput = '0'; expressionMode = true; updateDisplay(); return; }

        let i = currentInput.length - 1;
        let nesting = 0;

        while (i >= 0) {
            const char = currentInput[i];
            if (char === ')') nesting++;
            else if (char === '(') nesting--;
            if (nesting === 0 && ('+-×÷^'.includes(char))) { i++; break; }
            if (nesting < 0) { i++; break; }
            i--;
        }
        if (i < 0) i = 0;

        const prefix = currentInput.substring(0, i);
        let term = currentInput.substring(i);

        if (term.startsWith('-(') && term.endsWith(')')) {
            term = term.substring(2, term.length - 1);
        } else if (term.startsWith('-')) {
            term = term.substring(1);
        } else if (term.startsWith('+')) {
            term = '-' + term.substring(1);
        } else {
            if (term.includes('(') || FUNCTION_NAMES.some(fn => term.startsWith(fn)) || term.includes(' ')) {
                term = `-(${term})`;
            } else {
                term = '-' + term;
            }
        }
        currentInput = prefix + term;
        expressionMode = true;
        resetScreen = false;
    }

    function inputPercent() {
        if (currentInput === 'Erro') return;
        const lastChar = currentInput.charAt(currentInput.length - 1);
        if (/\d$/.test(lastChar) || lastChar === ')') {
            currentInput += '%';
            expressionMode = true;
        }
    }

    function calculateInverse() {
        if (currentInput === 'Erro' || currentInput === '0') {
            if (currentInput === '0') alert('Erro: Divisão por zero!');
            return;
        }
        let i = currentInput.length - 1;
        let nesting = 0;
        while (i >= 0) {
            const char = currentInput[i];
            if (char === ')') nesting++; else if (char === '(') nesting--;
            if (nesting === 0 && ('+-×÷^'.includes(char))) { i++; break; }
            if (nesting < 0) { i++; break;}
            i--;
        }
        if (i < 0) i = 0;
        const prefix = currentInput.substring(0, i);
        const term = currentInput.substring(i);
        if (term === '0') { alert('Erro: Divisão por zero!'); return; }

        currentInput = prefix + `(1÷${term})`;
        expressionMode = true;
        resetScreen = false;
    }

    function formatResult(value) {
        if (!isFinite(value)) return "Erro";
        const stringValue = Number(value.toPrecision(12)).toString();
        return parseFloat(stringValue).toString();
    }

    function calculate() {
        if (currentInput === 'Erro') return;
        let expressionToEvaluate = currentInput.replace(/,/g, '.');

        try {
            let openCount = (expressionToEvaluate.match(/\(/g) || []).length;
            let closeCount = (expressionToEvaluate.match(/\)/g) || []).length;
            if (openCount > closeCount) {
                expressionToEvaluate += ')'.repeat(openCount - closeCount);
            }

            expressionToEvaluate = expressionToEvaluate
                .replace(/π/g, `(${MATH_CONSTANTS.pi})`)
                .replace(/e(?!xp)/g, `(${MATH_CONSTANTS.euler})`)
                .replace(/φ/g, `(${MATH_CONSTANTS.phi})`)
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/exp\(/g, 'Math.exp(')
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/\^/g, '**')
                .replace(/(\d+\.?\d*|\([\s\S]*?\))%/g, (match, p1) => `(${p1}/100)`);

            const result = eval(expressionToEvaluate);

            if (result === undefined || result === null || !isFinite(result)) {
                currentInput = 'Erro';
            } else {
                currentInput = formatResult(result);
            }
            _resetCalculationInternalState();

        } catch (error) {
            console.error("Erro ao avaliar a expressão:", error, "Expressão:", expressionToEvaluate);
            currentInput = 'Erro';
            _resetCalculationInternalState();
        }
        updateDisplay();
    }

    function backspace() {
        if (currentInput === 'Erro') {
            resetCalculator();
            return;
        }
        for (const func of FUNCTION_NAMES) {
            if (currentInput.endsWith(func + '(')) {
                currentInput = currentInput.slice(0, -(func.length + 1));
                if (currentInput.endsWith('×')) {
                     currentInput = currentInput.slice(0, -1);
                }
                if (currentInput === '') currentInput = '0';
                return;
            }
        }
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '') {
            currentInput = '0';
            expressionMode = false;
        }
        if (!/[\+\-\×\÷\^\(\)%]/.test(currentInput) && !FUNCTION_NAMES.some(fn => currentInput.includes(fn))) {
             expressionMode = false;
        }
    }

    function clearEntry() {
        if (currentInput === 'Erro') {
            resetCalculator();
            return;
        }
        const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^(]*)$/);
        if (match && match[3] !== "") {
            currentInput = match[1] + match[2];
        } else if (match && match[3] === "") {
            currentInput = match[1];
        } else {
             for (const func of FUNCTION_NAMES) {
                if (currentInput.startsWith(func + '(') && currentInput.length > func.length + 1 && currentInput.charAt(currentInput.length - 1) !== '(') {
                     currentInput = func + '(';
                     return;
                } else if (currentInput === func + '(') {
                     currentInput = '0'; expressionMode = false;
                     return;
                }
            }
            currentInput = '0';
            expressionMode = false;
        }
        if (currentInput === "") {
            currentInput = '0';
            expressionMode = false;
        }
        resetScreen = false;
    }

    function resetCalculator() {
        currentInput = '0';
        _resetCalculationInternalState();
        resetScreen = false;
    }

    function applyValueToField() {
        if (activeInputField) {
            if (currentInput === 'Erro') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField.focus();
                activeInputField = null;
                return;
            }
            if (expressionMode && /[\+\-\×\÷\^\(\)%]/.test(currentInput) && !resetScreen) {
                calculate();
                if (currentInput === 'Erro') {
                     if (calculatorModal) calculatorModal.style.display = "none";
                     activeInputField.focus();
                     activeInputField = null;
                     return;
                }
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

    function handleKeyboardInput(event) {
        if (calculatorModal && calculatorModal.style.display !== 'flex') return;
        if (event.ctrlKey || event.metaKey) return;

        let key = event.key;
        if (key === 'Enter') key = '=';

        if (currentInput === 'Erro') {
            if (key === 'Escape') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField = null;
            } else if (key === 'Backspace' || key.toLowerCase() === 'c' || key === 'Delete') {
                event.preventDefault();
                resetCalculator();
                updateDisplay();
            } else if (/[0-9]/.test(key)) {
                event.preventDefault();
                currentInput = key;
                resetScreen = false;
                expressionMode = false;
                updateDisplay();
            } else {
                event.preventDefault();
            }
            return;
        }

        let keyHandled = true;
        switch (key) {
            case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                inputDigit(key); break;
            case '.': case ',': inputDecimal(); break;
            case '+': handleOperator('add'); break;
            case '-': handleOperator('subtract'); break;
            case '*': handleOperator('multiply'); break;
            case '/': handleOperator('divide'); break;
            case '%': inputPercent(); break;
            case '^': handleOperator('power'); break;
            case '(': inputParenthesis('('); break;
            case ')': inputParenthesis(')'); break;
            case '=': calculate(); break;
            case 'Escape':
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField = null;
                break;
            case 'Backspace': backspace(); break;
            case 'Delete': resetCalculator(); break;
            default:
                if (key.toLowerCase() === 'c') {
                    resetCalculator();
                } else if (key.toLowerCase() === 'p' && !event.shiftKey) {
                    inputConstant('pi');
                } else if (key.toLowerCase() === 'e' && !event.shiftKey && !event.altKey) {
                    inputConstant('euler');
                } else {
                    keyHandled = false;
                }
                break;
        }

        if(keyHandled) {
            event.preventDefault();
            updateDisplay();
        }
    }
    
    window.handleNumericInputKeydown = function(event) {
        const allowedNonFunctionKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Delete', 'Backspace', 'Tab', 'Home', 'End',
            'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ContextMenu', 
            'PageUp', 'PageDown', 'Insert', 'F5', 'F12', 'Enter' 
        ];
        if (allowedNonFunctionKeys.includes(event.key) || (event.key.startsWith('F') && event.key !== 'F1')) {
            return;
        }

        if (event.key === 'F1') {
            event.preventDefault();
            event.stopPropagation();
            
            const inputField = event.target;
            openCalculator(inputField);
        }
    };

    window.handleNumericInputDblClick = function(event) {
        event.preventDefault();
        const inputField = event.target;
        openCalculator(inputField);
    };


    function setupNumericInputs() {
        // --- INÍCIO DA CORREÇÃO ---
        const numericInputs = document.querySelectorAll(
            'input[type="number"], input[type="text"][inputmode="decimal"], #periods, #rate, #payment, #presentValue, #futureValue, #mirrInitialInvestment, #mirrFinancingRate, #mirrReinvestmentRate, #irrInitialInvestment, #npvInitialInvestment, #npvDiscountRate, #npvFinancingRate, #npvReinvestmentRate'
        );
        // --- FIM DA CORREÇÃO ---
           
        numericInputs.forEach(input => {
            input.removeEventListener('keydown', window.handleNumericInputKeydown);
            input.addEventListener('keydown', window.handleNumericInputKeydown);
            
            input.removeEventListener('dblclick', window.handleNumericInputDblClick);
            input.addEventListener('dblclick', window.handleNumericInputDblClick);
            
            input.title = "Pressione F1 ou duplo clique para acessar a calculadora"; 
            
            input.removeEventListener('focus', highlightInput);
            input.removeEventListener('blur', unhighlightInput);
            input.addEventListener('focus', highlightInput);
            input.addEventListener('blur', unhighlightInput);
        });
    }
    
    function highlightInput() { this.classList.add('highlighted'); }
    function unhighlightInput() { this.classList.remove('highlighted'); }

    updateDisplay();
    setupNumericInputs();

    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const inputs = [];
                        if (node.matches('input[type="number"], input[type="text"][inputmode="decimal"]')) {
                            inputs.push(node);
                        } else {
                            inputs.push(...node.querySelectorAll('input[type="number"], input[type="text"][inputmode="decimal"]'));
                        }
                        
                        inputs.forEach(input => {
                            if (input.classList.contains('mirr-cash-flow-amount') || 
                                input.classList.contains('mirr-cash-flow-quantity') ||
                                input.classList.contains('irr-cash-flow-amount') || 
                                input.classList.contains('irr-cash-flow-quantity') ||
                                input.classList.contains('npv-cash-flow-amount') ||
                                input.classList.contains('npv-cash-flow-quantity')) {
                                
                                input.removeEventListener('keydown', window.handleNumericInputKeydown);
                                input.addEventListener('keydown', window.handleNumericInputKeydown);
                                input.removeEventListener('dblclick', window.handleNumericInputDblClick);
                                input.addEventListener('dblclick', window.handleNumericInputDblClick);
                                input.title = "Pressione F1 ou duplo clique para acessar a calculadora";

                                input.removeEventListener('focus', highlightInput);
                                input.removeEventListener('blur', unhighlightInput);
                                input.addEventListener('focus', highlightInput);
                                input.addEventListener('blur', unhighlightInput);
                            }
                        });
                    }
                });
            }
        }
    });

    const mainAppContainer = document.querySelector('.container') || document.body;
    observer.observe(mainAppContainer, { childList: true, subtree: true });


    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', function() {
            openCalculator();
        });
    }

    if (closeCalculatorModal) {
        closeCalculatorModal.addEventListener('click', function() {
            if (calculatorModal) {
                calculatorModal.style.display = "none";
                activeInputField = null;
            }
        });
    }
    
    if (calculatorModal) {
        calculatorModal.addEventListener('keydown', handleKeyboardInput);
    }


    if (calcButtons && calcButtons.length > 0) {
        calcButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const buttonValue = button.textContent;

                if (currentInput === 'Erro' && !['clear', 'backspace', 'clearEntry'].includes(action)) {
                     return;
                }
                if (action === 'clearEntry' && currentInput === 'Erro'){
                    resetCalculator();
                    updateDisplay();
                    return;
                }

                if (!action) {
                    inputDigit(buttonValue);
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
                updateDisplay();
            });
        });
    } else {
        console.warn("Botões da calculadora (.calc-btn) não encontrados ou o array está vazio.");
    }
});