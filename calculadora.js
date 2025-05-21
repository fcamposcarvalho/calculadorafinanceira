// calculadora.js - Implementação da calculadora básica
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM para a calculadora básica
    const calculatorBtn = document.getElementById('calculatorBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const closeCalculatorModal = document.getElementById('closeCalculatorModal');
    const calcDisplay = document.getElementById('calcDisplay');
    const calcButtons = document.querySelectorAll('.calc-btn');
    
    // Variáveis para controle da calculadora
    let currentInput = '0'; // O que é mostrado no display
    let previousInput = ''; // Valor anterior (para operações simples)
    let calculationOperator = ''; // Operador da operação atual
    let resetScreen = false; // Flag para resetar o display na próxima entrada
    let activeInputField = null; // Campo de entrada ativo (que chamou a calculadora)
    
    // Variáveis para expressões
    let expressionMode = false; // Indica se estamos no modo de expressão (com parênteses)
    let pendingOperation = ''; // Armazena uma operação pendente
    
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
            // Adicionar evento de tecla para Enter e F1
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === 'F1') {
                    event.preventDefault(); // Impedir comportamento padrão (tecla F1 aparecer no display)
                    event.stopPropagation(); // Impedir propagação do evento
                    activeInputField = this;
                    openCalculator();
                    
                    // Preencher calculadora com o valor atual do campo
                    if (this.value) {
                        currentInput = this.value;
                        updateDisplay();
                    }
                }
            });
            
            // Adicionar tooltip personalizado
            if (!input.title) {
                input.title = "Pressione Enter ou F1 para acessar a calculadora";
            }
            
            // Adicionar destaque ao focar
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
                // Botões numéricos
                inputDigit(buttonValue);
            } else {
                // Botões de ação
                switch(action) {
                    case 'add':
                    case 'subtract':
                    case 'multiply':
                    case 'divide':
                    case 'power':
                        // Se estamos no modo de expressão, adicionamos o operador diretamente
                        if (expressionMode) {
                            let operatorChar;
                            switch (action) {
                                case 'add': operatorChar = '+'; break;
                                case 'subtract': operatorChar = '-'; break;
                                case 'multiply': operatorChar = '×'; break;
                                case 'divide': operatorChar = '÷'; break;
                                case 'power': operatorChar = '^'; break;
                            }
                            currentInput += operatorChar;
                        } else {
                            handleOperator(action);
                        }
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
    
    // Adicionar suporte a teclado quando a calculadora está aberta
    document.addEventListener('keydown', function(event) {
        if (calculatorModal.style.display === 'block') {
            handleKeyboardInput(event);
        }
    });
    
    // Função para abrir a calculadora
    function openCalculator() {
        calculatorModal.style.display = "block";
        // Focar no campo de exibição
        calcDisplay.focus();
    }
    
    // Função para atualizar o display
    function updateDisplay() {
        calcDisplay.value = currentInput;
    }
    
    // Função para inserir dígitos
    function inputDigit(digit) {
        if (resetScreen) {
            // Se acabamos de pressionar um operador, precisamos preservar a expressão
            // Primeiro, verifique se o último caractere é um operador
            const lastChar = currentInput.charAt(currentInput.length - 1);
            if ('+-×÷^'.includes(lastChar)) {
                currentInput = currentInput + digit;
            } else {
                currentInput = digit;
            }
            resetScreen = false;
        } else {
            // Se o valor atual for 0, substituir; caso contrário, anexar
            currentInput = currentInput === '0' ? digit : currentInput + digit;
        }
    }
    
    // Função para inserir parênteses
    function inputParenthesis(parenthesis) {
        // CORREÇÃO: Se temos um operador pendente, adicioná-lo antes do parêntese
        if (calculationOperator && resetScreen) {
            let operatorChar;
            switch (calculationOperator) {
                case 'add': operatorChar = '+'; break;
                case 'subtract': operatorChar = '-'; break;
                case 'multiply': operatorChar = '×'; break;
                case 'divide': operatorChar = '÷'; break;
                case 'power': operatorChar = '^'; break;
            }
            
            // Adicionar o operador pendente e o valor anterior
            if (previousInput) {
                currentInput = previousInput + operatorChar;
            }
            
            // Redefinir os flags de operação para evitar duplicação
            resetScreen = false;
            calculationOperator = '';
        }
        
        // Entrar automaticamente no modo de expressão ao usar parênteses
        expressionMode = true;
        
        // Se estamos começando e o display só tem 0, substituir o 0
        if (currentInput === '0' && parenthesis === '(') {
            currentInput = parenthesis;
        } else {
            currentInput += parenthesis;
        }
    }
    
    // Função para inserir constantes matemáticas
    function inputConstant(constant) {
        const value = MATH_CONSTANTS[constant].toString();
        
        // Se estamos no modo de expressão, simplesmente adicionamos o valor
        if (expressionMode) {
            currentInput += value;
        } else {
            // Caso contrário, substituímos o valor atual
            currentInput = value;
            resetScreen = true;
        }
    }
    
    // Função para inserir ponto decimal
    function inputDecimal() {
        // Se o último caractere já for um ponto, não fazer nada
        if (currentInput.endsWith('.')) {
            return;
        }
        
        // Se estamos resetando o display, começar com "0."
        if (resetScreen) {
            currentInput = '0.';
            resetScreen = false;
            return;
        }
        
        // Analisamos a última parte numérica da entrada
        const parts = currentInput.split(/[\+\-\×\÷\(\)]/);
        const lastPart = parts[parts.length - 1];
        
        // Adicionar ponto decimal apenas se a última parte não contiver um ponto
        if (!lastPart.includes('.')) {
            currentInput += '.';
        }
    }
    
    // Função para negar valor
    function negateValue() {
        // Se estamos no modo de expressão, adicionamos um -1 * (...)
        if (expressionMode) {
            // Encontrar a última entrada numérica
            const match = currentInput.match(/[0-9.]+$/);
            if (match) {
                // Substituir o último número por sua versão negada
                const lastNumber = match[0];
                const position = currentInput.lastIndexOf(lastNumber);
                
                // Se o número já for negativo (precedido por um sinal de menos)
                if (position > 0 && currentInput[position-1] === '-') {
                    // Remover o sinal de menos anterior
                    currentInput = currentInput.substring(0, position-1) + currentInput.substring(position);
                } else {
                    // Caso contrário, adicionar um sinal de menos
                    currentInput = currentInput.substring(0, position) + '-' + currentInput.substring(position);
                }
            } else {
                // Se não encontrarmos um número, apenas adicionamos um sinal de negação
                currentInput += '-';
            }
        } else {
            // No modo normal, simplesmente negamos o valor atual
            currentInput = (parseFloat(currentInput) * -1).toString();
        }
    }
    
    // Função para lidar com operadores
    function handleOperator(operator) {
        let operatorChar;
        
        // Converter o operador para seu símbolo correspondente
        switch (operator) {
            case 'add': operatorChar = '+'; break;
            case 'subtract': operatorChar = '-'; break;
            case 'multiply': operatorChar = '×'; break;
            case 'divide': operatorChar = '÷'; break;
            case 'power': operatorChar = '^'; break;
        }
        
        // Se há qualquer operador na expressão, entramos automaticamente no modo de expressão
        // Isso evita que a calculadora calcule partes da expressão antes do tempo
        if (currentInput.match(/[\+\-\×\÷\^]/)) {
            expressionMode = true;
        }
        
        // Se já estamos no modo de expressão, simplesmente adicionar o operador
        if (expressionMode) {
            currentInput += operatorChar;
            return;
        }
        
        // MODIFICADO: Não calcular nada aqui, apenas acumular a expressão
        // Configurar para a próxima operação
        previousInput = currentInput;
        calculationOperator = operator;
        
        // Adicionar o operador ao display
        currentInput = currentInput + operatorChar;
        resetScreen = true;
    }
    
    // Função para calcular funções matemáticas (sqrt, log, ln, exp)
    function calculateFunction(funcName) {
        // Se estamos no modo de expressão, adicionamos a função e um parêntese de abertura
        if (expressionMode) {
            currentInput += funcName + '(';
            return;
        }
        
        // No modo normal, calculamos diretamente o resultado
        const value = parseFloat(currentInput);
        
        // Verificar restrições para cada função
        if ((funcName === 'Math.log10' || funcName === 'Math.log') && value <= 0) {
            alert('Erro: Logaritmo de número não-positivo!');
            return;
        }
        
        if (funcName === 'Math.sqrt' && value < 0) {
            alert('Erro: Não é possível calcular a raiz quadrada de um número negativo!');
            return;
        }
        
        // Calcular o resultado da função
        let result;
        switch (funcName) {
            case 'Math.sqrt': result = Math.sqrt(value); break;
            case 'Math.log10': result = Math.log10(value); break;
            case 'Math.log': result = Math.log(value); break;
            case 'Math.exp': result = Math.exp(value); break;
        }
        
        currentInput = formatResult(result);
        resetScreen = true;
    }
    
    // Função para calcular
    function calculate() {
        // Se estamos no modo de expressão ou temos operadores no display, 
        // tentamos avaliar a expressão completa
        if (expressionMode || /[\+\-\×\÷\^]/.test(currentInput)) {
            try {
                // Verificar parênteses desbalanceados
                let openCount = (currentInput.match(/\(/g) || []).length;
                let closeCount = (currentInput.match(/\)/g) || []).length;
                
                // Variável temporária para a expressão a ser avaliada
                let expressionToEvaluate = currentInput;
                
                // Adicionar parênteses de fechamento faltantes
                if (openCount > closeCount) {
                    for (let i = 0; i < (openCount - closeCount); i++) {
                        expressionToEvaluate += ")";
                    }
                }
                
                // Preparar a expressão para avaliação
                expressionToEvaluate = expressionToEvaluate
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/\^/g, '**');
                
                console.log("Expressão a ser avaliada:", expressionToEvaluate);
                
                // Avaliar a expressão
                const result = eval(expressionToEvaluate);
                
                currentInput = formatResult(result);
                expressionMode = false;
                resetScreen = true;
                
                // Limpar operadores e valores armazenados
                calculationOperator = '';
                previousInput = '';
                
            } catch (error) {
                console.error("Erro ao avaliar expressão:", error);
                alert("Erro na expressão: " + error.message);
                return;
            }
            
            return;
        }
        
        // Modo normal (sem expressões)
        if (!calculationOperator) return;
        
        const inputValue = parseFloat(currentInput);
        const previousValue = parseFloat(previousInput);
        let result;
        
        switch(calculationOperator) {
            case 'add':
                result = previousValue + inputValue;
                break;
            case 'subtract':
                result = previousValue - inputValue;
                break;
            case 'multiply':
                result = previousValue * inputValue;
                break;
            case 'divide':
                if (inputValue === 0) {
                    alert('Erro: Divisão por zero!');
                    resetCalculator();
                    return;
                }
                result = previousValue / inputValue;
                break;
            case 'power':
                result = Math.pow(previousValue, inputValue);
                break;
        }
        
        // Mostrar o resultado
        currentInput = formatResult(result);
        calculationOperator = '';
        resetScreen = true;
    }
    
    // Função para calcular porcentagem
    function calculatePercent() {
        const value = parseFloat(currentInput);
        
        if (expressionMode) {
            // No modo expressão, podemos substituir o último número por sua versão percentual
            const match = currentInput.match(/[0-9.]+$/);
            if (match) {
                const lastNumber = match[0];
                const percent = parseFloat(lastNumber) / 100;
                const position = currentInput.lastIndexOf(lastNumber);
                currentInput = currentInput.substring(0, position) + percent.toString();
            }
        } else {
            // No modo normal, convertemos o valor para porcentagem
            currentInput = (value / 100).toString();
        }
    }
    
    // Função para calcular inverso (1/x)
    function calculateInverse() {
        const value = parseFloat(currentInput);
        
        if (value === 0) {
            alert('Erro: Divisão por zero!');
            return;
        }
        
        if (expressionMode) {
            // No modo expressão, podemos adicionar uma expressão de inverso
            currentInput += '(1/' + value + ')';
        } else {
            // No modo normal, calculamos diretamente
            currentInput = formatResult(1 / value);
        }
    }
    
    // Função para formatar resultado
    function formatResult(value) {
        // Verificar se é um número finito
        if (!isFinite(value)) {
            return value.toString();
        }
        
        // Converter para string com até 10 casas decimais
        const stringValue = value.toFixed(10);
        
        // Remover zeros à direita e ponto decimal desnecessário
        return parseFloat(stringValue).toString();
    }
    
    // Função para deletar último caractere (backspace)
    function backspace() {
        if (currentInput.length === 1 || (currentInput.length === 2 && currentInput.startsWith('-'))) {
            currentInput = '0';
            // Se removemos todos os caracteres, saímos do modo de expressão
            if (expressionMode && currentInput === '0') {
                expressionMode = false;
            }
        } else {
            currentInput = currentInput.slice(0, -1);
        }
    }
    
    // Função para limpar apenas a entrada atual
    function clearEntry() {
        // Se estamos no modo de expressão ou já temos uma operação complexa
        if (expressionMode || /[\+\-\×\÷\^]/.test(currentInput)) {
            // Encontrar a última parte da expressão (após o último operador)
            const parts = currentInput.split(/([+\-×÷^()])/);
            
            // Se temos partes suficientes para formar uma expressão
            if (parts.length > 1) {
                // Remover apenas a última parte (mantendo operadores e valores anteriores)
                let newExpression = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    newExpression += parts[i];
                }
                currentInput = newExpression;
                
                // Se terminar com um operador, não resetamos a tela na próxima entrada
                if (/[+\-×÷^(]$/.test(currentInput)) {
                    resetScreen = false;
                }
            } else {
                // Se não conseguirmos identificar partes, apenas limpar tudo
                currentInput = '0';
            }
        } else {
            // No modo normal, simplesmente limpar o valor atual
            currentInput = '0';
        }
    }
    
    // Função para resetar calculadora
    function resetCalculator() {
        currentInput = '0';
        previousInput = '';
        calculationOperator = '';
        resetScreen = false;
        expressionMode = false;
    }
    
    // Função para aplicar valor ao campo que chamou a calculadora
    function applyValueToField() {
        if (activeInputField) {
            activeInputField.value = currentInput;
            
            // Fechar calculadora
            calculatorModal.style.display = "none";
            
            // Disparar evento de mudança para acionar qualquer validação
            const event = new Event('input', { bubbles: true });
            activeInputField.dispatchEvent(event);
            
            // Restaurar foco no campo
            activeInputField.focus();
        }
    }
    
    // Função para lidar com entrada do teclado
    function handleKeyboardInput(event) {
        event.preventDefault();
        
        // Números e operadores
        if (/[0-9]/.test(event.key)) {
            inputDigit(event.key);
        } else if (event.key === '.') {
            inputDecimal();
        } else if (event.key === '+') {
            // Se estamos no modo de expressão, adicionar o operador diretamente
            if (expressionMode) {
                currentInput += '+';
            } else {
                handleOperator('add');
            }
        } else if (event.key === '-') {
            if (expressionMode) {
                currentInput += '-';
            } else {
                handleOperator('subtract');
            }
        } else if (event.key === '*') {
            if (expressionMode) {
                currentInput += '×';
            } else {
                handleOperator('multiply');
            }
        } else if (event.key === '/') {
            if (expressionMode) {
                currentInput += '÷';
            } else {
                handleOperator('divide');
            }
        } else if (event.key === '%') {
            calculatePercent();
        } else if (event.key === '^') {
            if (expressionMode) {
                currentInput += '^';
            } else {
                handleOperator('power');
            }
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
        } else if (event.key === 'Delete') {
            resetCalculator();
        } else if (event.key === 'p' || event.key === 'P') {
            // Atalho para pi (p)
            inputConstant('pi');
        } else if (event.key === 'e' || event.key === 'E') {
            // Atalho para e (e)
            inputConstant('euler');
        }
        
        updateDisplay();
    }
});