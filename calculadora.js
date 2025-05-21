// calculadora.js - Implementação da calculadora básica
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM para a calculadora básica
    const calculatorBtn = document.getElementById('calculatorBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const closeCalculatorModal = document.getElementById('closeCalculatorModal');
    const calcDisplay = document.getElementById('calcDisplay');
    const calcButtons = document.querySelectorAll('.calc-btn');
    
    // --- INÍCIO DA LÓGICA DE ARRASTE DO MODAL DA CALCULADORA ---
    const calculatorModalContentEl = calculatorModal.querySelector('.modal-content.calculator-modal');

    if (calculatorModal && calculatorModalContentEl && closeCalculatorModal) {
        let isDragging = false;
        let dragOffsetX, dragOffsetY;

        // Função para resetar a posição do modal para o centro
        window.resetCalculatorModalPosition = function() {
            if (calculatorModalContentEl) {
                calculatorModalContentEl.style.position = ''; // Reverte para a posição definida pelo CSS
                calculatorModalContentEl.style.left = '';
                calculatorModalContentEl.style.top = '';
                calculatorModalContentEl.style.margin = ''; // Permite que 'margin: 5% auto;' funcione novamente
                calculatorModalContentEl.style.cursor = 'grab'; // Define o cursor inicial
            }
        }

        if (calculatorModalContentEl) {
            calculatorModalContentEl.style.cursor = 'grab'; // Define o cursor inicial

            calculatorModalContentEl.addEventListener('mousedown', function(e) {
                // Prevenir o arraste se o clique for em um botão, input, no botão de fechar ou nos botões da calculadora
                const targetTagName = e.target.tagName.toLowerCase();
                const isInteractiveElement = 
                    targetTagName === 'button' ||
                    targetTagName === 'input' ||
                    e.target === closeCalculatorModal || // Verifica se é o botão de fechar
                    e.target.closest('.calc-buttons'); // Verifica se o clique foi dentro da área dos botões

                if (isInteractiveElement) {
                    return; // Não iniciar o arraste
                }

                isDragging = true;
                
                // Se for o primeiro arraste, converter o posicionamento baseado em margem para absoluto
                if (calculatorModalContentEl.style.position !== 'absolute') {
                    const rect = calculatorModalContentEl.getBoundingClientRect();
                    calculatorModalContentEl.style.position = 'absolute';
                    calculatorModalContentEl.style.left = rect.left + 'px';
                    calculatorModalContentEl.style.top = rect.top + 'px';
                    calculatorModalContentEl.style.margin = '0'; // Remover margens automáticas
                }

                dragOffsetX = e.clientX - calculatorModalContentEl.offsetLeft;
                dragOffsetY = e.clientY - calculatorModalContentEl.offsetTop;

                calculatorModalContentEl.style.cursor = 'grabbing'; // Mudar cursor durante o arraste
                document.body.style.userSelect = 'none'; // Prevenir seleção de texto durante o arraste

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault(); // Prevenir comportamento padrão (como seleção de texto)

            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;

            // Limites para manter o modal dentro da tela (viewport)
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const modalWidth = calculatorModalContentEl.offsetWidth;
            const modalHeight = calculatorModalContentEl.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, viewportWidth - modalWidth));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - modalHeight));

            calculatorModalContentEl.style.left = newLeft + 'px';
            calculatorModalContentEl.style.top = newTop + 'px';
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            
            calculatorModalContentEl.style.cursor = 'grab'; // Restaurar cursor
            document.body.style.userSelect = ''; // Permitir seleção de texto novamente

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }
    // --- FIM DA LÓGICA DE ARRASTE DO MODAL DA CALCULADORA ---

    // Variáveis para controle da calculadora
    let currentInput = '0'; // O que é mostrado no display
    let previousInput = ''; // Valor anterior (para operações simples)
    let calculationOperator = ''; // Operador da operação atual
    let resetScreen = false; // Flag para resetar o display na próxima entrada
    let activeInputField = null; // Campo de entrada ativo (que chamou a calculadora)
    
    // Variáveis para expressões
    let expressionMode = false; // Indica se estamos no modo de expressão (com parênteses)
    // let pendingOperation = ''; // Removido - não estava sendo usado consistentemente
    
    // Constantes matemáticas
    const MATH_CONSTANTS = {
        pi: Math.PI,
        euler: Math.E,
        phi: (1 + Math.sqrt(5)) / 2 // Razão áurea
    };
    
    // Inicializar display
    updateDisplay();
    
    // Configurar tooltips para campos numéricos
    setupNumericInputs();
    
    // Evento para botão da calculadora
    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', function() {
            openCalculator();
        });
    }
    
    // Evento para fechar modal da calculadora
    if (closeCalculatorModal) {
        closeCalculatorModal.addEventListener('click', function() {
            calculatorModal.style.display = "none";
        });
    }
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target === calculatorModal) {
            calculatorModal.style.display = "none";
        }
    });
    
    // Configurar tooltips e eventos para campos numéricos
    function setupNumericInputs() {
        const numericInputs = document.querySelectorAll('input[type="number"]');
        numericInputs.forEach(input => {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === 'F1') {
                    event.preventDefault(); 
                    event.stopPropagation(); 
                    activeInputField = this;
                    openCalculator();
                    
                    if (this.value) {
                        currentInput = this.value;
                        updateDisplay();
                    }
                }
            });
            
            if (!input.title) {
                input.title = "Pressione Enter ou F1 para acessar a calculadora";
            }
            
            input.addEventListener('focus', function() {
                this.classList.add('highlighted');
            });
            
            input.addEventListener('blur', function() {
                this.classList.remove('highlighted');
            });
        });
    }
    
    // Adicionar eventos para os botões da calculadora
    calcButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const buttonValue = button.textContent;
            
            if (!action) {
                inputDigit(buttonValue);
            } else {
                switch(action) {
                    case 'add':
                    case 'subtract':
                    case 'multiply':
                    case 'divide':
                    case 'power':
                        handleOperator(action);
                        break;
                    case 'openParenthesis':
                        inputParenthesis('(');
                        break;
                    case 'closeParenthesis':
                        inputParenthesis(')');
                        break;
                    case 'percent':
                        calculatePercent();
                        break;
                    case 'sqrt':
                        calculateFunction('Math.sqrt');
                        break;
                    case 'inverse':
                        calculateInverse();
                        break;
                    case 'negate':
                        negateValue();
                        break;
                    case 'log':
                        calculateFunction('Math.log10');
                        break;
                    case 'ln':
                        calculateFunction('Math.log');
                        break;
                    case 'exp':
                        calculateFunction('Math.exp');
                        break;
                    case 'pi':
                    case 'euler':
                    case 'phi':
                        inputConstant(action);
                        break;
                    case 'decimal':
                        inputDecimal();
                        break;
                    case 'clear':
                        resetCalculator();
                        break;
                    case 'clearEntry':
                        clearEntry();
                        break;
                    case 'backspace':
                        backspace();
                        break;
                    case 'equals':
                        calculate();
                        break;
                    case 'apply':
                        applyValueToField();
                        break;
                }
            }
            updateDisplay();
        });
    });
    
    document.addEventListener('keydown', function(event) {
        if (calculatorModal.style.display === 'block') {
            handleKeyboardInput(event);
        }
    });
    
    function openCalculator() {
        if (typeof window.resetCalculatorModalPosition === 'function') {
            window.resetCalculatorModalPosition();
        }
        calculatorModal.style.display = "block";
        calcDisplay.focus();
    }
    
    function updateDisplay() {
        calcDisplay.value = currentInput.replace(/\./g, ',');
    }
    
    function inputDigit(digit) {
        if (resetScreen) {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            // Se resetScreen é true e currentInput termina com operador/parêntese, anexa o dígito.
            // Caso contrário (resetScreen é true, mas não após operador, ex: após resultado de cálculo ou constante),
            // o currentInput é substituído pelo dígito.
            if ('+-×÷^('.includes(lastChar)) {
                currentInput += digit;
            } else {
                currentInput = digit;
            }
            resetScreen = false;
        } else {
            currentInput = currentInput === '0' ? digit : currentInput + digit;
        }
    }
    
    function inputParenthesis(parenthesis) {
        if (calculationOperator && resetScreen) {
            let operatorChar;
            switch (calculationOperator) {
                case 'add': operatorChar = '+'; break;
                case 'subtract': operatorChar = '-'; break;
                case 'multiply': operatorChar = '×'; break;
                case 'divide': operatorChar = '÷'; break;
                case 'power': operatorChar = '^'; break;
            }
            if (previousInput) {
                currentInput = previousInput + operatorChar;
            }
            resetScreen = false;
            calculationOperator = '';
        }
        
        expressionMode = true;
        
        if (currentInput === '0' && parenthesis === '(') {
            currentInput = parenthesis;
        } else {
            // Se o último caractere é um dígito ou ')' e vamos abrir um '(', insere '*'
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if (parenthesis === '(' && (/\d$/.test(lastChar) || lastChar === ')')) {
                currentInput += '×' + parenthesis;
            } else {
                currentInput += parenthesis;
            }
        }
    }
    
    function inputConstant(constant) {
        const value = MATH_CONSTANTS[constant].toString();
        const lastChar = currentInput.charAt(currentInput.length - 1);

        if (expressionMode) {
             // Se o último caractere é um dígito ou ')' ou outra constante, insere '*' antes da nova constante
            if (/\d$/.test(lastChar) || lastChar === ')' || Object.values(MATH_CONSTANTS).map(v => v.toString()).includes(currentInput.match(/[^+\-×÷^()]*$/)?.[0])) {
                 currentInput += '×' + value;
            } else if ('+-×÷^('.includes(lastChar) || currentInput === '0') {
                 currentInput = (currentInput === '0' ? '' : currentInput) + value;
            }
            else {
                 currentInput += value;
            }
        } else {
            currentInput = value;
        }
        resetScreen = true; // Para a próxima entrada de dígito/operador
    }
    
    function inputDecimal() {
        // Pega a parte da string após o último operador ou parêntese.
        // Se não houver operadores/parênteses, pega a string inteira.
        const match = currentInput.match(/[^+\-×÷^()]*$/);
        const lastNumberSegment = match ? match[0] : "";

        // Se o último segmento numérico já contém um ponto, não faz nada.
        if (lastNumberSegment.includes('.')) {
            return;
        }

        if (resetScreen) {
            const lastChar = currentInput.charAt(currentInput.length - 1);
            // Se resetScreen é true E currentInput termina com um operador ou '(',
            // anexamos "0." para iniciar um novo número.
            if ('+-×÷^('.includes(lastChar)) {
                currentInput += '0.';
            } else {
                // Se resetScreen é true mas não após um operador (ex: após um cálculo finalizado ou constante),
                // o currentInput se torna "0."
                currentInput = '0.';
            }
            resetScreen = false; // resetScreen foi consumido
        } else {
            // currentInput é "0" ou vazio, novo input é "0."
            if (currentInput === '0' || currentInput === '') {
                currentInput = '0.';
            // Último caractere é um operador ou '(', anexamos "0."
            } else if ('+-×÷^('.includes(currentInput.charAt(currentInput.length - 1))) {
                currentInput += '0.';
            // Caso contrário, adicionamos o ponto ao número atual.
            } else {
                currentInput += '.';
            }
        }
    }
    
    function negateValue() {
        if (expressionMode) {
            const match = currentInput.match(/([+\-×÷^])?([0-9.]+)$/); // Tenta capturar um operador opcional antes do último número
            if (match) {
                const operator = match[1];
                const lastNumber = match[2];
                const numberStartIndex = currentInput.lastIndexOf(lastNumber);
                const prefix = currentInput.substring(0, numberStartIndex);

                if (operator === '-') { // Se o número já é explicitamente negativo com operador (ex: ...+-5)
                    currentInput = prefix.slice(0,-1) + '+' + lastNumber; // Troca - por +
                } else if (operator === '+') { // Se o número é precedido por + (ex: ...++5 ou ...+5)
                     currentInput = prefix.slice(0,-1) + '-' + lastNumber; // Troca + por -
                } else if (numberStartIndex > 0 && currentInput[numberStartIndex-1] === '-') { // Número negativo sem operador antes (ex: 5-2 -> 5-(-2))
                     currentInput = currentInput.substring(0, numberStartIndex-1) + '+' + lastNumber;
                }
                else { // Número positivo
                    currentInput = prefix + '-' + lastNumber;
                }
            } else if (currentInput === '0' || currentInput === '') {
                 currentInput = '-'; // Começa com negativo
            } else if (!'+-×÷^('.includes(currentInput.charAt(currentInput.length - 1))) {
                 // Adiciona *(-1) se for um número isolado ou resultado de função
                 currentInput = `(${currentInput})×-1`;
            } else {
                 currentInput += '-'; // Adiciona sinal de menos se após operador
            }
        } else {
            // No modo normal, simplesmente negamos o valor atual
            if (currentInput !== '0') { // Evita -0
                 currentInput = (parseFloat(currentInput) * -1).toString();
            }
        }
    }
    
    function handleOperator(operatorAction) {
        let operatorChar;
        switch (operatorAction) {
            case 'add': operatorChar = '+'; break;
            case 'subtract': operatorChar = '-'; break;
            case 'multiply': operatorChar = '×'; break;
            case 'divide': operatorChar = '÷'; break;
            case 'power': operatorChar = '^'; break;
        }
        
        const lastChar = currentInput.charAt(currentInput.length - 1);

        // Se o último caractere já é um operador (exceto parêntese de abertura)
        // e não é um sinal de menos que poderia ser parte de um número negativo
        if ('+-×÷^'.includes(lastChar) && !(lastChar === '-' && currentInput.length > 1 && '+-×÷^('.includes(currentInput.charAt(currentInput.length - 2)))) {
            // Substitui o último operador se o novo não for o mesmo ou se for uma potência (para permitir x^-y)
             if (operatorChar !== lastChar || operatorAction === 'power') {
                  currentInput = currentInput.slice(0, -1) + operatorChar;
             }
        } else if (lastChar !== '(') { // Não adicionar operador logo após '('
            currentInput += operatorChar;
        } else if (operatorChar === '-' && lastChar === '(') { // Permitir ( - para números negativos
            currentInput += operatorChar;
        }


        if (currentInput.match(/[\+\-\×\÷\^]/)) {
            expressionMode = true;
        }
        
        // Se não estamos no modo de expressão (primeiro operador), configuramos para cálculo simples
        if (!expressionMode && calculationOperator === '') {
             previousInput = parseFloat(currentInput.slice(0, -operatorChar.length)).toString(); // Pega o número antes do operador
             calculationOperator = operatorAction;
        }
        resetScreen = true; // Indica que a próxima entrada de dígito/decimal deve iniciar um novo número
    }
    
    function calculateFunction(funcName) {
        let displayFunction;
        switch (funcName) {
            case 'Math.sqrt': displayFunction = 'sqrt'; break;
            case 'Math.log10': displayFunction = 'log'; break;
            case 'Math.log': displayFunction = 'ln'; break;
            case 'Math.exp': displayFunction = 'exp'; break;
            default: displayFunction = funcName;
        }
        
        expressionMode = true;
        const lastChar = currentInput.charAt(currentInput.length - 1);

        if (currentInput === '0') {
            currentInput = displayFunction + '(';
        } else if (/\d$/.test(lastChar) || lastChar === ')') { // Se o último é dígito ou ')', multiplica
            currentInput += '×' + displayFunction + '(';
        }
        else { // Senão, apenas anexa
            currentInput += displayFunction + '(';
        }
        resetScreen = false; // Funções esperam um argumento, não resetam para nova entrada imediatamente
    }
    
    function calculate() {
        if (expressionMode || /[\+\-\×\÷\^()]/.test(currentInput) || /(sqrt|log|ln|exp)\(/.test(currentInput)) {
            try {
                let expressionToEvaluate = currentInput;
                
                // Contar parênteses
                let openCount = (expressionToEvaluate.match(/\(/g) || []).length;
                let closeCount = (expressionToEvaluate.match(/\)/g) || []).length;
                
                // Adicionar parênteses de fechamento faltantes
                if (openCount > closeCount) {
                    expressionToEvaluate += ')'.repeat(openCount - closeCount);
                }

                // Substituir representações amigáveis por funções/operadores JavaScript
                expressionToEvaluate = expressionToEvaluate
                    .replace(/sqrt\(/g, 'Math.sqrt(')
                    .replace(/log\(/g, 'Math.log10(')
                    .replace(/ln\(/g, 'Math.log(')
                    .replace(/exp\(/g, 'Math.exp(')
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/\^/g, '**');
                
                 // Tratar porcentagens: "X% de Y" -> (X/100)*Y, "Y+X%" -> Y*(1+X/100), "X%" -> X/100
                expressionToEvaluate = expressionToEvaluate.replace(/(\d+\.?\d*)%/g, (match, p1) => `(${p1}/100)`);
                // Regex para "Y + X%" ou "Y - X%" ou "Y * X%" ou "Y / X%"
                expressionToEvaluate = expressionToEvaluate.replace(/(\d+\.?\d*)\s*([*\/+-])\s*\((\d+\.?\d*)\/100\)/g, (match, y, op, x) => {
                    const valY = parseFloat(y);
                    const valX = parseFloat(x);
                    if (op === '+') return (valY * (1 + valX/100)).toString();
                    if (op === '-') return (valY * (1 - valX/100)).toString();
                    // Para * e /, a conversão direta de X% para X/100 já é o desejado.
                    // Apenas retornamos a forma original para ser avaliada por eval.
                    return `${y}${op}(${x}/100)`;
                });


                console.log("Expressão a ser avaliada:", expressionToEvaluate);
                
                const result = eval(expressionToEvaluate);
                
                if (result === undefined || result === null || !isFinite(result)) {
                    alert("Erro: Resultado inválido ou indefinido.");
                    // currentInput = 'Erro'; // Ou manter a expressão original
                    return;
                }
                
                currentInput = formatResult(result);
                expressionMode = false; 
                resetScreen = true;
                calculationOperator = '';
                previousInput = '';
                
            } catch (error) {
                console.error("Erro ao avaliar expressão:", error);
                alert("Erro na expressão: " + error.message);
            }
            return;
        }
        
        // Modo normal (sem expressões) - Este bloco pode ser simplificado ou removido se tudo for tratado como expressão.
        if (!calculationOperator) return;
        
        // Para cálculo simples, o `currentInput` já é a expressão, ex: "2+3"
        // Esta parte pode ser desnecessária se o `calculate()` acima já trata tudo.
        // No entanto, deixaremos por ora para o caso de um cálculo simples não ser pego pelo `if (expressionMode ...)`
        const parts = currentInput.split(new RegExp(`([${calculationOperator === 'multiply' ? '×' : calculationOperator === 'divide' ? '÷' : calculationOperator === 'power' ? '^' : calculationOperator}])`));
        if (parts.length < 3) return; // Precisa de operando, operador, operando

        const val1 = parseFloat(previousInput);
        const val2 = parseFloat(parts[2]); // O segundo operando
        let result;
        
        switch(calculationOperator) {
            case 'add': result = val1 + val2; break;
            case 'subtract': result = val1 - val2; break;
            case 'multiply': result = val1 * val2; break;
            case 'divide':
                if (val2 === 0) {
                    alert('Erro: Divisão por zero!');
                    resetCalculator(); return;
                }
                result = val1 / val2;
                break;
            case 'power': result = Math.pow(val1, val2); break;
        }
        
        currentInput = formatResult(result);
        calculationOperator = '';
        previousInput = '';
        resetScreen = true;
    }
    
    function calculatePercent() {
        const lastChar = currentInput.charAt(currentInput.length - 1);
        // Só adiciona % se o último caractere for um número ou )
        if (/\d$/.test(lastChar) || lastChar === ')') {
            currentInput += '%';
            expressionMode = true; // Usar % geralmente implica uma expressão
        }
        // Não calcula imediatamente, o cálculo de % é feito em `calculate()`
    }
    
    function calculateInverse() {
        // Envolve o conteúdo atual (ou o último número) com (1/(...))
        if (currentInput === '0') {
            alert('Erro: Divisão por zero!');
            return;
        }
        // Tenta identificar o último número ou expressão entre parênteses
        const match = currentInput.match(/([+\-×÷^])?((?:\([^)]*\)|[0-9.]+|[a-zA-Z]+\([^)]*\))*)$/);

        if (match && match[2] && match[2] !== '0') {
            const prefix = match[1] || ''; // Operador anterior, se houver
            const termToInvert = match[2];
            const startIndex = currentInput.lastIndexOf(prefix + termToInvert);
            
            currentInput = currentInput.substring(0, startIndex) + prefix + `(1÷${termToInvert})`;
        } else {
             // Se não encontrar um termo claro, tenta inverter tudo
            currentInput = `(1÷${currentInput})`;
        }
        expressionMode = true;
        resetScreen = false; // A expressão foi modificada, não resetar para nova entrada
    }
    
    function formatResult(value) {
        if (!isFinite(value)) {
            return "Erro"; // Ou value.toString() para Infinity/NaN
        }
        const stringValue = value.toFixed(10);
        return parseFloat(stringValue).toString();
    }
    
    function backspace() {
        if (currentInput.endsWith('sqrt(') || currentInput.endsWith('log(') || currentInput.endsWith('ln(') || currentInput.endsWith('exp(') ) {
            currentInput = currentInput.slice(0, -5); // Remove "sqrt(" etc.
        } else {
            currentInput = currentInput.slice(0, -1);
        }

        if (currentInput === '') {
            currentInput = '0';
            expressionMode = false; // Se limpou tudo, sai do modo expressão
        }
    }
    
    function clearEntry() {
        // Limpa o último número ou operador inserido
        // Se currentInput for "2+3*4", CE torna "2+3*"
        // Se currentInput for "2+3*", CE torna "2+"
        // Se currentInput for "2+", CE torna "2"
        // Se currentInput for "2", CE torna "0"
        const match = currentInput.match(/^(.*)([+\-×÷^])([^+\-×÷^]*)$/); // Tenta encontrar "prefixo OP sufixo"
        if (match && match[3] !== "") { // Se há um sufixo (número após o último operador)
            currentInput = match[1] + match[2]; // Remove o sufixo: "prefixo OP"
        } else if (match && match[3] === "") { // Se o último é um operador
            currentInput = match[1]; // Remove o operador: "prefixo"
        } else { // Se é apenas um número ou expressão inicial
            currentInput = '0';
            expressionMode = false;
        }
         if (currentInput === '') {
            currentInput = '0';
            expressionMode = false;
        }
        resetScreen = false; // CE geralmente não implica resetar para a próxima entrada de dígito
    }
    
    function resetCalculator() {
        currentInput = '0';
        previousInput = '';
        calculationOperator = '';
        resetScreen = false;
        expressionMode = false;
    }
    
    function applyValueToField() {
        if (activeInputField) {
            // Calcula o valor final antes de aplicar, se for uma expressão
            if (expressionMode || /[\+\-\×\÷\^()]/.test(currentInput)) {
                calculate(); // Calcula e atualiza currentInput com o resultado
            }
            // O valor em currentInput já está como string com '.' decimal
            // Se o campo de destino espera vírgula, a conversão deve ser feita no lado do campo
            // ou garantir que currentInput seja convertido para formato numérico aqui
            try {
                const numericValue = parseFloat(currentInput.replace(',', '.')); // Garante que é número
                if (!isNaN(numericValue)) {
                    activeInputField.value = numericValue.toString(); // Aplica como string que o input[type=number] entende
                } else {
                     activeInputField.value = currentInput; // Se não for numérico, aplica como está
                }

            } catch (e) {
                activeInputField.value = currentInput; // Fallback
            }
            
            calculatorModal.style.display = "none";
            const event = new Event('input', { bubbles: true });
            activeInputField.dispatchEvent(event);
            activeInputField.focus();
        }
    }
    
    function handleKeyboardInput(event) {
        // Não previne Default se for Ctrl+C, Ctrl+V, etc.
        if (event.ctrlKey || event.metaKey) {
            return;
        }
        event.preventDefault();
        
        if (/[0-9]/.test(event.key)) {
            inputDigit(event.key);
        } else if (event.key === '.' || event.key === ',') {
            inputDecimal();
        } else if (event.key === '+') {
            handleOperator('add');
        } else if (event.key === '-') {
            handleOperator('subtract');
        } else if (event.key === '*') {
            handleOperator('multiply');
        } else if (event.key === '/') {
            handleOperator('divide');
        } else if (event.key === '%') {
            calculatePercent();
        } else if (event.key === '^') {
            handleOperator('power');
        } else if (event.key === '(') {
            inputParenthesis('(');
        } else if (event.key === ')') {
            inputParenthesis(')');
        } else if (event.key === 'Enter' || event.key === '=') {
            calculate();
        } else if (event.key === 'Escape') {
            calculatorModal.style.display = "none";
        } else if (event.key === 'Backspace') {
            backspace();
        } else if (event.key === 'Delete') { // Ou 'c'/'C' para Clear
            resetCalculator();
        } else if ((event.key === 'p' || event.key === 'P') && !event.shiftKey) {
            inputConstant('pi');
        } else if ((event.key === 'e' || event.key === 'E') && !event.shiftKey && !event.altKey) { // Evitar conflito com € em alguns teclados
            inputConstant('euler');
        }
        
        updateDisplay();
    }
});