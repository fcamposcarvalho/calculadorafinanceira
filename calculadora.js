// calculadora.js - Implementação da calculadora básica
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const calculatorBtn = document.getElementById('calculatorBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const closeCalculatorModal = document.getElementById('closeCalculatorModal');
    const calcDisplay = document.getElementById('calcDisplay');
    const calcButtons = document.querySelectorAll('.calc-btn');
    const calculatorModalContentEl = calculatorModal.querySelector('.modal-content.calculator-modal');

    // Variáveis de estado da calculadora
    let currentInput = '0';
    // previousInput e calculationOperator foram mantidos para possível lógica futura mais simples, mas o foco principal é a construção de expressão.
    let previousInput = ''; 
    let calculationOperator = ''; 
    let resetScreen = false; // Flag para resetar display na próxima entrada de DÍGITO
    let expressionMode = false; // Indica se estamos construindo uma expressão complexa
    let activeInputField = null;

    // Constantes matemáticas
    const MATH_CONSTANTS = {
        pi: Math.PI,
        euler: Math.E,
        phi: (1 + Math.sqrt(5)) / 2,
    };
    const CONSTANT_VALUES_AS_STRINGS = Object.values(MATH_CONSTANTS).map(v => v.toString());
    const FUNCTION_NAMES = ['sqrt', 'log', 'ln', 'exp'];


    // --- LÓGICA DE ARRASTE DO MODAL ---
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
            calculatorModalContentEl.style.cursor = 'grab';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }
    // --- FIM ARRASTE ---

    // --- FUNÇÕES HELPER ---
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
                // Regex para capturar nome_da_função(conteúdo_interno)
                // Escapa caracteres especiais no nome da função para a regex
                const funcCallRegex = new RegExp(funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\((.*)\\)$');
                const match = str.match(funcCallRegex);
                if (match) {
                    // Verifica se os parênteses dentro do conteúdo capturado estão balanceados
                    let openParen = 0;
                    for (const char of match[1]) { 
                        if (char === '(') openParen++;
                        else if (char === ')') openParen--;
                        if (openParen < 0) return false; // Malformado internamente
                    }
                    return openParen === 0; // Se balanceado, é uma função completa
                }
            }
        }
        return false;
    }

    function shouldInsertMultiplication(inputStr) {
        if (inputStr === '0' || inputStr === 'Erro') return false;
        const lastChar = inputStr.charAt(inputStr.length - 1);
        // Multiplica se o último é: número, ')', constante, ou uma função completa
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

    // --- INICIALIZAÇÃO E EVENTOS GERAIS ---
    updateDisplay();
    setupNumericInputs();

    if (calculatorBtn) calculatorBtn.addEventListener('click', openCalculator);
    if (closeCalculatorModal) closeCalculatorModal.addEventListener('click', () => calculatorModal.style.display = "none");
    window.addEventListener('click', (event) => { if (event.target === calculatorModal) calculatorModal.style.display = "none"; });
    document.addEventListener('keydown', (event) => { if (calculatorModal.style.display === 'block') handleKeyboardInput(event); });

    calcButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const buttonValue = button.textContent;
            if (currentInput === 'Erro' && action !== 'clear' && action !== 'backspace') return; 

            if (!action) inputDigit(buttonValue);
            else {
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
            updateDisplay();
        });
    });

    function setupNumericInputs() {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === 'F1') {
                    event.preventDefault(); event.stopPropagation();
                    activeInputField = this;
                    openCalculator();
                    if (this.value && this.value !== "0" && parseFloat(this.value) !== 0) { // Considerar "0.00" como 0
                        currentInput = this.value.replace(',', '.'); 
                        resetScreen = true; 
                        expressionMode = false; 
                    } else {
                        resetCalculator(); 
                    }
                    updateDisplay();
                }
            });
            if (!input.title) input.title = "Pressione Enter ou F1 para acessar a calculadora";
            input.addEventListener('focus', () => input.classList.add('highlighted'));
            input.addEventListener('blur', () => input.classList.remove('highlighted'));
        });
    }

    // --- FUNÇÕES PRINCIPAIS DA CALCULADORA ---
    function openCalculator() {
        if (typeof window.resetCalculatorModalPosition === 'function') window.resetCalculatorModalPosition();
        calculatorModal.style.display = "block";
        calcDisplay.focus();
    }

    function updateDisplay() {
        calcDisplay.value = currentInput.replace(/\./g, ',');
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
            // Se currentInput termina com ')' e vamos inserir um dígito, inserir '×'
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
            // Só permite fechar se houver parênteses abertos e o último char não for um operador ou '('
            if (openCount > closeCount && !'+-×÷^('.includes(lastChar) && lastChar !== 'Erro') {
                currentInput += parenthesis;
            } else {
                console.warn("Parêntese de fechamento inválido ignorado.");
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

        // Se o último caractere é um operador (e não é '(' nem o início de um número negativo)
        if ('+-×÷^'.includes(lastChar) && lastChar !== '(') {
            // Evitar operadores duplos, exceto se for para formar um número negativo com '-' ou permitir x^-y
            // Se currentInput é "5+", e entra "-", vira "5-"
            // Se currentInput é "5*", e entra "-", vira "5*-" (para "5 * -2")
            // Se currentInput é "5^", e entra "-", vira "5^-" (para "5^-2")
            if (operatorChar === '-' && (lastChar === '×' || lastChar === '÷' || lastChar === '^')) {
                currentInput += operatorChar; 
            } else {
                 // Substitui o último operador: 5+ com * vira 5*
                currentInput = currentInput.slice(0, -1) + operatorChar;
            }
        } else if (lastChar !== '(' || operatorChar === '-') { // Não adicionar operador logo após '(', a menos que seja '-'
            currentInput += operatorChar;
        } else {
            // Caso: currentInput é "(", operador é "+". Não faz nada.
            return;
        }
        expressionMode = true;
        resetScreen = true; 
    }

    function negateValue() {
        if (currentInput === 'Erro') return;
        // Se não estiver no modo de expressão e for um número simples, nega diretamente.
        if (!expressionMode && currentInput !== '0' && !isNaN(parseFloat(currentInput))) {
            currentInput = (parseFloat(currentInput) * -1).toString();
            updateDisplay(); // Atualiza imediatamente para este caso simples
            return;
        }
        // Casos iniciais simples
        if (currentInput === '0') { currentInput = '-'; expressionMode = true; updateDisplay(); return; }
        if (currentInput === '-') { currentInput = '0'; expressionMode = true; updateDisplay(); return; }

        // Heurística para negar o "último termo" da expressão.
        // Pode ter limitações com expressões aninhadas muito complexas.
        let i = currentInput.length - 1;
        let nesting = 0; // Para parênteses e funções
        
        // Encontrar o início do último termo (número, função, (expr))
        while (i >= 0) {
            const char = currentInput[i];
            if (char === ')') nesting++;
            else if (char === '(') nesting--;
            
            // Se não estamos aninhados e encontramos um operador, o termo começa depois dele
            if (nesting === 0 && ('+-×÷^'.includes(char))) {
                i++; 
                break;
            }
            // Se o aninhamento ficou negativo, significa que encontramos um '(' de um nível anterior
            if (nesting < 0) { 
                i++; 
                break;
            }
            i--;
        }
        if (i < 0) i = 0; // O termo é a string inteira

        const prefix = currentInput.substring(0, i);
        let term = currentInput.substring(i);

        if (term.startsWith('-(') && term.endsWith(')')) { // Negação de expressão: - (termo) -> termo
            term = term.substring(2, term.length - 1);
        } else if (term.startsWith('-')) { // Negação de número/função: -termo -> termo
            term = term.substring(1);
        } else if (term.startsWith('+')) { // +termo -> -termo
            term = '-' + term.substring(1);
        } else { // termo -> -termo (ou -(termo) se for complexo)
            if (term.includes('(') || FUNCTION_NAMES.some(fn => term.startsWith(fn)) || term.includes(' ')) { // Se for função ou expressão com parênteses ou espaços
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
        // Heurística para envolver o "último termo" em (1÷...).
        // Pode ter limitações com expressões aninhadas muito complexas.
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
        let expressionToEvaluate = currentInput;

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
                .replace(/\^/g, '**');

            // Tratamento de porcentagem:
            // Passo 1: Converter todos os "X%" ou "(expr)%" para "(X/100)" ou "((expr)/100)"
            // A regex captura um número ou uma expressão entre parênteses seguida por %
            expressionToEvaluate = expressionToEvaluate.replace(/(\d+\.?\d*|\([\s\S]*?\))%/g, (match, p1) => `(${p1}/100)`);
            // Passo 2: Transformar "Y + (X/100)" em "Y * (1 + X/100)" e "Y - (X/100)" em "Y * (1 - X/100)"
            // Isso permite que o eval calcule corretamente "100 + 10%" como 110, e não 100.1.
            // Casos como Y * X% ou Y / X% já são tratados corretamente pela substituição do Passo 1.
            expressionToEvaluate = expressionToEvaluate.replace(
                /(\d+\.?\d*|\([\s\S]*?\))\s*([+\-])\s*\((\d+\.?\d*|\([\s\S]*?\))\/100\)/g,
                (match, Y, op, X) => {
                     // Ex: Y + (X/100) => Y * (1 + (X/100))
                     return `${Y} * (1 ${op} (${X}/100))`;
                }
            );

            console.log("Expressão para eval:", expressionToEvaluate);
            const result = eval(expressionToEvaluate);

            if (result === undefined || result === null || !isFinite(result)) {
                currentInput = 'Erro';
                updateDisplay();
                _resetCalculationInternalState();
                return;
            }

            currentInput = formatResult(result);
            _resetCalculationInternalState(); 

        } catch (error) {
            console.error("Erro ao avaliar expressão:", error);
            currentInput = 'Erro';
            updateDisplay();
            _resetCalculationInternalState();
        }
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
                updateDisplay();
                return;
            }
        }
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '') {
            currentInput = '0';
            expressionMode = false;
        }
        // Reavaliar se ainda está em modo expressão para resetar o flag se necessário
        if (!/[\+\-\×\÷\^\(\)%]/.test(currentInput) && !FUNCTION_NAMES.some(fn => currentInput.includes(fn))) {
             expressionMode = false;
        }
    }

    function clearEntry() { // CE
        if (currentInput === 'Erro') {
            resetCalculator();
            return;
        }
        // Tenta remover o último número/operando ou operador.
        // Ex: "12+34" -> "12+", "12+" -> "12", "12" -> "0"
        // Ex: "sqrt(12+" -> "sqrt(12", "sqrt(12" -> "sqrt(", "sqrt(" -> "0"
        const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^(]*)$/);
        if (match && match[3] !== "") { // Sufixo não vazio (número após operador)
            currentInput = match[1] + match[2]; // "prefixo" + "operador"
        } else if (match && match[3] === "") { // Termina com operador
            currentInput = match[1]; // "prefixo"
        } else { // É só um número, ou início de expressão como "sqrt("
             for (const func of FUNCTION_NAMES) {
                if (currentInput.startsWith(func + '(') && currentInput.length > func.length + 1 && currentInput.charAt(currentInput.length - 1) !== '(') {
                     currentInput = func + '('; // Se "sqrt(5", CE -> "sqrt("
                     updateDisplay();
                     return;
                } else if (currentInput === func + '(') { // Se "sqrt(", CE -> "0"
                     currentInput = '0'; expressionMode = false;
                     updateDisplay();
                     return;
                }
            }
            currentInput = '0';
            expressionMode = false;
        }
        if (currentInput === "") { // Se o prefixo era vazio
            currentInput = '0';
            expressionMode = false;
        }
        resetScreen = false; 
    }

    function resetCalculator() {
        currentInput = '0';
        _resetCalculationInternalState(); // Chama a função centralizada
        resetScreen = false; // Para C, o próximo dígito não deve resetar, começa do zero.
    }

    function applyValueToField() {
        if (activeInputField) {
            if (currentInput === 'Erro') { 
                calculatorModal.style.display = "none";
                activeInputField.focus();
                return;
            }
            // Calcula o valor final antes de aplicar, se for uma expressão pendente E NÃO um resultado já finalizado
            if (expressionMode && /[\+\-\×\÷\^\(\)%]/.test(currentInput) && !resetScreen) {
                calculate(); 
                if (currentInput === 'Erro') { 
                     calculatorModal.style.display = "none";
                     activeInputField.focus();
                     return;
                }
            }
            activeInputField.value = currentInput.replace(',', '.'); 
            calculatorModal.style.display = "none";
            const event = new Event('input', { bubbles: true });
            activeInputField.dispatchEvent(event);
            activeInputField.focus();
        }
    }

    function handleKeyboardInput(event) {
        if (event.ctrlKey || event.metaKey) return; 
        
        if (currentInput === 'Erro') {
            if (event.key === 'Escape') {
                calculatorModal.style.display = "none";
            } else if (event.key === 'Backspace' || event.key.toLowerCase() === 'c' || event.key === 'Delete') {
                event.preventDefault();
                resetCalculator();
                updateDisplay();
            } else if (/[0-9]/.test(event.key)) { 
                event.preventDefault();
                currentInput = event.key; // Começa novo número
                resetScreen = false; 
                expressionMode = false; // Sai do modo erro/expressão anterior
                updateDisplay();
            } else {
                event.preventDefault(); 
            }
            return;
        }
        
        event.preventDefault(); 
        
        if (/[0-9]/.test(event.key)) inputDigit(event.key);
        else if (event.key === '.' || event.key === ',') inputDecimal();
        else if (event.key === '+') handleOperator('add');
        else if (event.key === '-') handleOperator('subtract');
        else if (event.key === '*') handleOperator('multiply');
        else if (event.key === '/') handleOperator('divide');
        else if (event.key === '%') inputPercent();
        else if (event.key === '^') handleOperator('power');
        else if (event.key === '(') inputParenthesis('(');
        else if (event.key === ')') inputParenthesis(')');
        else if (event.key === 'Enter' || event.key === '=') calculate();
        else if (event.key === 'Escape') calculatorModal.style.display = "none";
        else if (event.key === 'Backspace') backspace();
        else if (event.key.toLowerCase() === 'c' || event.key === 'Delete') resetCalculator(); 
        else if (event.key.toLowerCase() === 'p' && !event.shiftKey) inputConstant('pi');
        else if (event.key.toLowerCase() === 'e' && !event.shiftKey && !event.altKey) inputConstant('euler');

        updateDisplay();
    }
});