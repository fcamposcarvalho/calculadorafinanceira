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

    // Verificações iniciais (erros críticos se elementos principais não forem encontrados)
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
            // Trata a vírgula como ponto decimal se presente no valor do campo de entrada
            if (inputField.value && inputField.value.trim() !== "" && !isNaN(parseFloat(inputField.value.replace(',', '.')))) {
                currentInput = inputField.value.replace(',', '.');
                resetScreen = true;
                expressionMode = false;
            } else {
                resetCalculator();
            }
        } else {
            activeInputField = null;
            resetCalculator();
        }

        updateDisplay();
        // if (calcDisplay) {
        //     // calcDisplay.focus(); // Pode roubar o foco, cuidado
        // }
    }


    function updateDisplay() {
        if (calcDisplay) {
            calcDisplay.value = currentInput;
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
                return; // Não adiciona se for inválido
            }
        }
        resetScreen = false;
    }

    function calculateFunction(funcKey) {
        const displayFunction = funcKey; // ex: "sqrt"
        expressionMode = true;
        if (shouldInsertMultiplication(currentInput)) {
            currentInput += '×' + displayFunction + '(';
        } else {
            currentInput = (currentInput === '0' || currentInput === 'Erro') ? (displayFunction + '(') : (currentInput + displayFunction + '(');
        }
        resetScreen = false;
    }

    function inputDecimal() {
        // Regex para encontrar o último segmento numérico (pode ser complexo devido a funções e parênteses)
        const match = currentInput.match(/[^+\-×÷^()]*$/);
        const lastNumberSegment = match ? match[0] : "";
        if (lastNumberSegment.includes('.')) return; // Já tem um decimal

        if (resetScreen) {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if ('+-×÷^('.includes(lastChar) || currentInput === 'Erro') {
                currentInput = (currentInput === 'Erro' ? '0.' : currentInput + '0.');
            } else {
                 if (shouldInsertMultiplication(currentInput)){
                     currentInput += '×0.';
                 } else {
                     currentInput = '0.'; // Inicia novo número
                 }
            }
            resetScreen = false;
        } else {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if (currentInput === '0') {
                currentInput = '0.';
            } else if ('+-×÷^('.includes(lastChar)) { // Se o último caractere for um operador ou parêntese de abertura
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

        // Se o último caractere for um operador (não um parêntese de abertura, a menos que seja um menos para negação)
        if ('+-×÷^'.includes(lastChar) && lastChar !== '(') {
            // Permite '×-' ou '÷-' ou '^-' (multiplicar/dividir/potência por negativo)
            if (operatorChar === '-' && (lastChar === '×' || lastChar === '÷' || lastChar === '^')) {
                currentInput += operatorChar;
            } else {
                // Substitui o último operador
                currentInput = currentInput.slice(0, -1) + operatorChar;
            }
        } else if (lastChar !== '(' || operatorChar === '-') { // Permite menos após parêntese de abertura
            currentInput += operatorChar;
        } else {
            // Não adiciona operador se o último caractere for '(' e o operador não for '-'
            return;
        }
        expressionMode = true;
        resetScreen = true; // Próxima entrada fará parte do novo termo ou continuará a expressão
    }

    function negateValue() {
        if (currentInput === 'Erro') return;
        if (!expressionMode && currentInput !== '0' && !isNaN(parseFloat(currentInput))) {
            currentInput = (parseFloat(currentInput) * -1).toString();
            updateDisplay();
            return;
        }
        // Lida com a alternância simples de '0' ou '-'
        if (currentInput === '0') { currentInput = '-'; expressionMode = true; updateDisplay(); return; }
        if (currentInput === '-') { currentInput = '0'; expressionMode = true; updateDisplay(); return; }

        // Negação de expressão mais complexa
        let i = currentInput.length - 1;
        let nesting = 0; // Para parênteses

        // Encontra o início do último termo
        while (i >= 0) {
            const char = currentInput[i];
            if (char === ')') nesting++;
            else if (char === '(') nesting--;
            if (nesting === 0 && ('+-×÷^'.includes(char))) { i++; break; } // Operador encontrado
            if (nesting < 0) { i++; break; } // Desbalanceado (ex: "func(algo")
            i--;
        }
        if (i < 0) i = 0; // Início da string

        const prefix = currentInput.substring(0, i);
        let term = currentInput.substring(i);

        // Alterna a negação
        if (term.startsWith('-(') && term.endsWith(')')) { // Caso: -(expressão) -> expressão
            term = term.substring(2, term.length - 1);
        } else if (term.startsWith('-')) { // Caso: -número -> número
            term = term.substring(1);
        } else if (term.startsWith('+')) { // Caso: +número -> -número (embora + geralmente não seja explícito)
            term = '-' + term.substring(1);
        } else { // Caso: número -> -número ou expressão -> -(expressão)
            // Se o termo for complexo (contém parênteses, função ou espaço), envolve com -(...)
            if (term.includes('(') || FUNCTION_NAMES.some(fn => term.startsWith(fn)) || term.includes(' ')) {
                term = `-(${term})`;
            } else {
                term = '-' + term;
            }
        }
        currentInput = prefix + term;
        expressionMode = true;
        resetScreen = false; // Permite mais entradas no termo negado, se necessário
    }

    function inputPercent() {
        if (currentInput === 'Erro') return;
        const lastChar = currentInput.charAt(currentInput.length - 1);
        if (/\d$/.test(lastChar) || lastChar === ')') { // Só adiciona % após um dígito ou parêntese de fechamento
            currentInput += '%';
            expressionMode = true;
        }
        // Não define resetScreen, permite mais operações com a porcentagem
    }

    function calculateInverse() {
        if (currentInput === 'Erro' || currentInput === '0') {
            if (currentInput === '0') alert('Erro: Divisão por zero!');
            return;
        }
        // Encontra o início do último termo para aplicar 1/x
        let i = currentInput.length - 1;
        let nesting = 0;
        while (i >= 0) {
            const char = currentInput[i];
            if (char === ')') nesting++; else if (char === '(') nesting--;
            if (nesting === 0 && ('+-×÷^'.includes(char))) { i++; break; }
            if (nesting < 0) { i++; break;} // Erro no balanceamento de parênteses antes deste ponto ou início da função
            i--;
        }
        if (i < 0) i = 0; // Início da string
        const prefix = currentInput.substring(0, i);
        const term = currentInput.substring(i);
        if (term === '0') { alert('Erro: Divisão por zero!'); return; }

        currentInput = prefix + `(1÷${term})`;
        expressionMode = true;
        resetScreen = false; // Permite mais operações
    }

    function formatResult(value) {
        if (!isFinite(value)) return "Erro";
        // Usa toPrecision para figuras significativas, depois Number para aparar zeros à direita da parte decimal
        const stringValue = Number(value.toPrecision(12)).toString(); // 12 figuras significativas
        return parseFloat(stringValue).toString(); // Garante que seja uma string numérica limpa
    }

    function calculate() {
        if (currentInput === 'Erro') return;
        let expressionToEvaluate = currentInput;

        try {
            // Fecha parênteses automaticamente se necessário
            let openCount = (expressionToEvaluate.match(/\(/g) || []).length;
            let closeCount = (expressionToEvaluate.match(/\)/g) || []).length;
            if (openCount > closeCount) {
                expressionToEvaluate += ')'.repeat(openCount - closeCount);
            }

            // Substitui símbolos de exibição por símbolos avaliáveis em JS
            expressionToEvaluate = expressionToEvaluate
                .replace(/π/g, `(${MATH_CONSTANTS.pi})`)
                .replace(/e(?!xp)/g, `(${MATH_CONSTANTS.euler})`) // Lookahead negativo para a função 'exp'
                .replace(/φ/g, `(${MATH_CONSTANTS.phi})`)
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/log\(/g, 'Math.log10(') // Log base 10
                .replace(/ln\(/g, 'Math.log(')   // Log natural
                .replace(/exp\(/g, 'Math.exp(')
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/\^/g, '**'); // Exponenciação

            // Lida com porcentagens:
            // 1. Simples X% -> X/100
            // Esta regex precisa ter cuidado para não corresponder a coisas como "log(5)%" incorretamente.
            // Deve visar números ou expressões entre parênteses seguidas por %
            expressionToEvaluate = expressionToEvaluate.replace(/(\d+\.?\d*|\([\s\S]*?\))%/g, (match, p1) => `(${p1}/100)`);

            // 2. Avançado Y op X% (ex: Y + X%, Y - X%) -> Y * (1 op X/100)
            // Isso é mais complexo e pode precisar de uma estratégia de análise mais robusta se surgirem muitos casos.
            // Por enquanto, uma interpretação comum: 100 + 10% = 100 * (1 + 10/100) = 110
            // Regex para a estrutura Y operador (X/100). Precisa ter cuidado com a ordem das operações.
            // Esta substituição específica pode ser muito gananciosa ou não cobrir todos os casos bem.
            // Exemplo: 100+10% -> 100 * (1 + (10/100))
            // Exemplo: 50-20% -> 50 * (1 - (20/100))
            expressionToEvaluate = expressionToEvaluate.replace(
                /(\d+\.?\d*|\([\s\S]*?\))\s*([+\-])\s*\((\d+\.?\d*|\([\s\S]*?\))\/100\)/g, // Procura por "Y op (X/100)"
                (match, Y, op, X) => {
                     // Garante que X é apenas a parte numérica se veio de (número/100) do passo anterior
                     return `${Y} * (1 ${op} (${X}/100))`;
                }
            );
            // Um Y + X% mais simples é frequentemente Y + (Y * X/100). A lógica atual é Y * (1 + X/100). Ambas são comuns.
            // Para consistência, garanta que a lógica de % é a esperada.
            // A implementação atual: X % Y = (X/100)*Y (se a multiplicação for implícita) ou X% por si só é X/100.
            // Y + X% (como em adicionar X por cento de Y a Y) é Y + (Y * X/100)
            // Vamos manter X% = X/100 por enquanto, e % avançado (como Y + X%) é complexo para eval.
            // A parte `Y * (1 op (X/100))` para `Y op X%` é uma interpretação específica.
            // A maioria das calculadoras faz `100 + 10%` como `100 + (10/100 * 100) = 110`.
            // Ou `100 * 10%` como `100 * (10/100) = 10`.
            // A abordagem `eval` terá dificuldades com % dependente do contexto como "100+10%".

            const result = eval(expressionToEvaluate);

            if (result === undefined || result === null || !isFinite(result)) {
                currentInput = 'Erro';
                updateDisplay();
                _resetCalculationInternalState();
                return;
            }

            currentInput = formatResult(result);
            _resetCalculationInternalState(); // Entrada anterior, operador limpos. Tela pronta para nova entrada.

        } catch (error) {
            console.error("Erro ao avaliar a expressão:", error, "Expressão:", expressionToEvaluate); // Registra a expressão
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
        // Remove chamadas de função como "sqrt("
        for (const func of FUNCTION_NAMES) {
            if (currentInput.endsWith(func + '(')) {
                currentInput = currentInput.slice(0, -(func.length + 1));
                // Se era como "5×sqrt(", remove "5×" também, ou apenas "×"
                if (currentInput.endsWith('×')) { // Verifica se uma multiplicação implícita foi adicionada
                     currentInput = currentInput.slice(0, -1);
                }
                if (currentInput === '') currentInput = '0';
                // updateDisplay(); // updateDisplay é chamado no final do manipulador de botão
                return;
            }
        }
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '') {
            currentInput = '0';
            expressionMode = false; // Não é mais uma expressão se estiver vazio
        }
        // Verifica se ainda está em modo de expressão
        if (!/[\+\-\×\÷\^\(\)%]/.test(currentInput) && !FUNCTION_NAMES.some(fn => currentInput.includes(fn))) {
             expressionMode = false;
        }
        // resetScreen deve permanecer como está, pois o backspace continua a edição atual
    }

    function clearEntry() {
        if (currentInput === 'Erro') {
            resetCalculator();
            return;
        }
        // Tenta limpar o último número ou segmento inserido
        const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^(]*)$/);
        if (match && match[3] !== "") { // Se houver algo após o último operador
            currentInput = match[1] + match[2]; // Remove o último número
        } else if (match && match[3] === "") { // Se terminar com um operador
            currentInput = match[1]; // Remove o operador
        } else {
             // Se for uma chamada de função sendo digitada, ex: "sqrt(34"
             for (const func of FUNCTION_NAMES) {
                if (currentInput.startsWith(func + '(') && currentInput.length > func.length + 1 && currentInput.charAt(currentInput.length - 1) !== '(') {
                     currentInput = func + '('; // Reseta para apenas "func("
                     // updateDisplay();
                     return;
                } else if (currentInput === func + '(') { // Se for apenas "func("
                     currentInput = '0'; expressionMode = false;
                     // updateDisplay();
                     return;
                }
            }
            currentInput = '0'; // Caso contrário, reseta para 0
            expressionMode = false;
        }
        if (currentInput === "") { // Rede de segurança se as manipulações resultarem em string vazia
            currentInput = '0';
            expressionMode = false;
        }
        resetScreen = false; // Permite continuar a expressão
        // updateDisplay(); // updateDisplay é chamado no final do manipulador de botão
    }

    function resetCalculator() {
        currentInput = '0';
        _resetCalculationInternalState(); // Reseta previousInput, operador, expressionMode
        resetScreen = false; // Explicitamente falso após reset completo
        // updateDisplay(); // updateDisplay é chamado no final do manipulador de botão
    }

    function applyValueToField() {
        if (activeInputField) {
            if (currentInput === 'Erro') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField.focus();
                activeInputField = null; // Limpa campo ativo
                return;
            }
            // Se em modo de expressão e ainda não resetado (ou seja, resultado de cálculo anterior), calcula primeiro
            if (expressionMode && /[\+\-\×\÷\^\(\)%]/.test(currentInput) && !resetScreen) {
                calculate(); // Calcula a expressão
                if (currentInput === 'Erro') { // Se o cálculo resultar em erro
                     if (calculatorModal) calculatorModal.style.display = "none";
                     activeInputField.focus();
                     activeInputField = null; // Limpa campo ativo
                     return;
                }
            }
            
            let valueToApply = currentInput;
            const numericValue = parseFloat(currentInput.replace(',', '.')); // Lida com vírgula como decimal
            if (!isNaN(numericValue)) {
                // --- INÍCIO DA MODIFICAÇÃO ---

                // Lista de IDs dos campos que devem receber 6 casas decimais.
                const rateFieldIds = [
                    'rate',
                    'mirrFinancingRate',
                    'mirrReinvestmentRate',
                    'npvDiscountRate',
                    'npvFinancingRate',
                    'npvReinvestmentRate'
                ];

                // Verifica o tipo de campo para aplicar a formatação correta.
                if (rateFieldIds.includes(activeInputField.id)) {
                    // Aplica 6 casas decimais para os campos de taxa.
                    valueToApply = numericValue.toFixed(6);
                } else if (activeInputField.id === 'periods') {
                    // Arredonda para o inteiro mais próximo para o campo de períodos.
                    valueToApply = Math.round(numericValue);
                }
                 else {
                    // Mantém 2 casas decimais para todos os outros campos (valores, etc.).
                    valueToApply = numericValue.toFixed(2);
                }
                // --- FIM DA MODIFICAÇÃO ---
            }

            activeInputField.value = valueToApply;
            if (calculatorModal) calculatorModal.style.display = "none";
            
            // Dispara eventos para garantir que quaisquer ouvintes no campo de entrada sejam acionados
            activeInputField.dispatchEvent(new Event('input', { bubbles: true }));
            activeInputField.dispatchEvent(new Event('change', { bubbles: true }));
            
            activeInputField.focus(); // Retorna o foco para o campo
            activeInputField = null; // Limpa campo ativo
        } else {
            if (calculatorModal) calculatorModal.style.display = "none"; // Apenas fecha se não houver campo ativo
        }
    }

    function handleKeyboardInput(event) {
        if (calculatorModal && calculatorModal.style.display !== 'flex') return; // Apenas quando o modal está visível
        if (event.ctrlKey || event.metaKey) return; // Ignora atalhos como Ctrl+C

        if (currentInput === 'Erro') {
            if (event.key === 'Escape') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField = null;
            } else if (event.key === 'Backspace' || event.key.toLowerCase() === 'c' || event.key === 'Delete') {
                event.preventDefault();
                resetCalculator();
                updateDisplay();
            } else if (/[0-9]/.test(event.key)) { // Permite iniciar um novo número após o erro
                event.preventDefault();
                currentInput = event.key;
                resetScreen = false;
                expressionMode = false; // Começando do zero
                updateDisplay();
            } else {
                event.preventDefault(); // Bloqueia outras teclas se em estado de erro
            }
            return;
        }

        let keyHandled = true; // Assume que a tecla será tratada
        switch (event.key) {
            case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                inputDigit(event.key); break;
            case '.': inputDecimal(); break;
            case ',': inputDecimal(); break; // Trata vírgula como ponto decimal
            case '+': handleOperator('add'); break;
            case '-': handleOperator('subtract'); break;
            case '*': handleOperator('multiply'); break;
            case '/': handleOperator('divide'); break;
            case '%': inputPercent(); break;
            case '^': handleOperator('power'); break;
            case '(': inputParenthesis('('); break;
            case ')': inputParenthesis(')'); break;
            case 'Enter': case '=': calculate(); break;
            case 'Escape':
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField = null; // Limpa campo ativo no Escape
                break;
            case 'Backspace': backspace(); break;
            case 'Delete': resetCalculator(); break; // Ou clearEntry() dependendo do comportamento desejado
            default:
                if (event.key.toLowerCase() === 'c') { // 'c' para Limpar
                    resetCalculator();
                } else if (event.key.toLowerCase() === 'p' && !event.shiftKey) { // 'p' para Pi
                    inputConstant('pi');
                } else if (event.key.toLowerCase() === 'e' && !event.shiftKey && !event.altKey) { // 'e' para número de Euler
                    inputConstant('euler');
                } else {
                    keyHandled = false; // Tecla não foi tratada por esta lógica
                }
                break;
        }

        if(keyHandled) {
            event.preventDefault(); // Previne ação padrão se a tecla foi tratada
            updateDisplay();
        }
    }
    
    // --- Ouvinte para KEYDOWN em campos de entrada numéricos (F1) ---
    // Esta função é exposta globalmente para que outros scripts (MIRR, NPV, IRR) possam usá-la.
    window.handleNumericInputKeydown = function(event) {
        // Permite teclas de navegação, exclusão e edição padrão sem abrir a calculadora
        const allowedNonFunctionKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Delete', 'Backspace', 'Tab', 'Home', 'End',
            'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ContextMenu', 
            'PageUp', 'PageDown', 'Insert', 'F5', 'F12', 'Enter' 
        ];
        // Permite teclas F específicas (não F1 para abrir a calculadora)
        if (allowedNonFunctionKeys.includes(event.key) || (event.key.startsWith('F') && event.key !== 'F1')) {
            return; // Não abre a calculadora para estas teclas
        }

        if (event.key === 'F1') {
            event.preventDefault(); // Previne ação padrão (ex: ajuda do navegador no F1)
            event.stopPropagation(); // Impede que o evento se propague
            
            const inputField = event.target; // O campo de entrada que acionou o evento
            openCalculator(inputField); // Abre a calculadora, passando o campo
        }
    };

    // --- Ouvinte para DBLCLICK em campos de entrada numéricos ---
    // Esta função é exposta globalmente.
    window.handleNumericInputDblClick = function(event) {
        event.preventDefault();
        const inputField = event.target;
        openCalculator(inputField);
    };


    function setupNumericInputs() {
        // Seletor mais robusto para encontrar todos os inputs numéricos relevantes
        const numericInputs = document.querySelectorAll(
            'input[type="number"], input#periods, input#rate, input#payment, input#presentValue, input#futureValue, input#mirrInitialInvestment, input#mirrFinancingRate, input#mirrReinvestmentRate, input#irrInitialInvestment, input#npvInitialInvestment, input#npvOverallDiscountRate, input#npvFinancingRate, input#npvReinvestmentRate'
        ); // Inclui IDs específicos e inputs dinâmicos se já estiverem no DOM
           // Inputs dinâmicos nas tabelas MIRR/NPV/IRR são tratados quando as linhas são adicionadas.

        numericInputs.forEach(input => {
            // Garante ouvintes novos se esta função for chamada várias vezes
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

    // --- INICIALIZAÇÃO E EVENTOS GERAIS ---
    updateDisplay(); // Atualização inicial do display
    setupNumericInputs(); // Configura ouvintes para inputs existentes

    // OBSERVADOR PARA INPUTS ADICIONADOS DINAMICAMENTE (ex. tabelas MIRR/NPV/IRR)
    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verifica se o próprio nó é um input ou contém inputs
                        const inputs = [];
                        if (node.matches('input[type="number"]')) {
                            inputs.push(node);
                        } else {
                            inputs.push(...node.querySelectorAll('input[type="number"]'));
                        }
                        
                        inputs.forEach(input => {
                            // Verifica se é um dos inputs controlados dinamicamente com base na classe ou pai
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

    // Começa a observar o corpo do documento e sua sub-árvore para nós adicionados
    const mainAppContainer = document.querySelector('.container') || document.body;
    observer.observe(mainAppContainer, { childList: true, subtree: true });


    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', function() {
            openCalculator(); // Abre a calculadora sem um campo específico
        });
    }

    if (closeCalculatorModal) {
        closeCalculatorModal.addEventListener('click', function() {
            if (calculatorModal) {
                calculatorModal.style.display = "none";
                activeInputField = null; // Limpa o campo ativo ao fechar manualmente
            }
        });
    }
    
    // Adiciona ouvinte de teclado ao próprio modal, não ao documento,
    // para evitar conflitos quando o modal não está visível.
    if (calculatorModal) {
        calculatorModal.addEventListener('keydown', handleKeyboardInput);
    }


    if (calcButtons && calcButtons.length > 0) {
        calcButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const buttonValue = button.textContent; // ex: '7', '+', 'log'

                if (currentInput === 'Erro' && action !== 'clear' && action !== 'backspace' && action !== 'clearEntry') {
                     // Só permite funções de limpeza se em estado de erro
                     return;
                }
                // Tratamento especial para CE em estado de Erro
                if (action === 'clearEntry' && currentInput === 'Erro'){
                    resetCalculator();
                    updateDisplay();
                    return;
                }

                if (!action) { // É um botão de dígito
                    inputDigit(buttonValue);
                } else {
                    switch(action) {
                        // Operadores
                        case 'add': case 'subtract': case 'multiply': case 'divide': case 'power': handleOperator(action); break;
                        // Parênteses & Porcentagem
                        case 'openParenthesis': inputParenthesis('('); break;
                        case 'closeParenthesis': inputParenthesis(')'); break;
                        case 'percent': inputPercent(); break;
                        // Funções
                        case 'sqrt': calculateFunction('sqrt'); break;
                        case 'inverse': calculateInverse(); break;
                        case 'negate': negateValue(); break;
                        case 'log': calculateFunction('log'); break; // Base 10
                        case 'ln': calculateFunction('ln'); break;   // Natural
                        case 'exp': calculateFunction('exp'); break; // e^x
                        // Constantes
                        case 'pi': inputConstant('pi'); break;
                        case 'euler': inputConstant('euler'); break;
                        case 'phi': inputConstant('phi'); break;
                        // Decimal & Limpar
                        case 'decimal': inputDecimal(); break;
                        case 'clear': resetCalculator(); break; // AC
                        case 'clearEntry': clearEntry(); break; // CE
                        case 'backspace': backspace(); break;
                        // Igual & Aplicar
                        case 'equals': calculate(); break;
                        case 'apply': applyValueToField(); break;
                    }
                }
                updateDisplay(); // Atualiza o display após cada ação
            });
        });
    } else {
        console.warn("Botões da calculadora (.calc-btn) não encontrados ou o array está vazio.");
    }
});