// calculator.js - Implementação da calculadora com modos ALG e RPN (Versão Final e Completa)

document.addEventListener('DOMContentLoaded', function () {
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
    let rpnStack = [0, 0, 0, 0]; // [T, Z, Y]; o X é o currentInput
    let rpnTyping = false;  // true enquanto um número está sendo digitado em X
    let stackLift = false;  // true: o próximo número empurra X para Y (desligado por ENTER e CLx, como na HP 12c)
    let rpnErrorX = '0';    // X de antes da operação que deu erro (a tecla seguinte só limpa o erro)

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
        // Só um número passa de um modo para o outro (uma expressão como "2+3" não vira X)
        const carried = Number(currentInput);
        const valueToCarryOver = (currentInput !== 'Erro' && currentInput.trim() !== '' && isFinite(carried)) ? String(carried) : '0';

        rpnMode = isRpn;
        if (rpnMode) {
            calculatorModal.classList.add('rpn-mode');
            algBtn.classList.remove('active');
            rpnBtn.classList.add('active');
            if (rpnAdvancedRow) rpnAdvancedRow.style.display = '';
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
            if (rpnAdvancedRow) rpnAdvancedRow.style.display = 'none';
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
        if (rpnMode) stackLift = true;
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

    // Número em digitação: mostra o que foi teclado ("1,0", "0,00"), só com o agrupamento dos milhares
    function formatEntryForDisplay(text) {
        const negative = text.startsWith('-');
        const [intPart, decPart] = text.replace('-', '').split('.');
        let shown = new Intl.NumberFormat('pt-BR', { useGrouping: true }).format(Number(intPart || '0'));
        if (decPart !== undefined) shown += ',' + decPart;
        return (negative ? '-' : '') + shown;
    }

    function updateDisplay() {
        if (rpnMode) {
            if (DEBUG_RPN) console.log(`[RPN] updateDisplay: X=${currentInput}, Y=${rpnStack[2]}, rpnTyping=${rpnTyping}, stackLift=${stackLift}`);
            const xText = rpnTyping ? formatEntryForDisplay(currentInput) : formatForDisplay(currentInput);
            if (stackDisplays.x) stackDisplays.x.textContent = xText;
            if (stackDisplays.y) stackDisplays.y.textContent = formatForDisplay(rpnStack[2]);
            if (stackDisplays.z) stackDisplays.z.textContent = formatForDisplay(rpnStack[1]);
            if (stackDisplays.t) stackDisplays.t.textContent = formatForDisplay(rpnStack[0]);
            if (algDisplayInput) algDisplayInput.value = xText;
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
    function rpnLiftStack() {
        rpnStack[0] = rpnStack[1];
        rpnStack[1] = rpnStack[2];
        rpnStack[2] = parseFloat(currentInput) || 0;
    }

    function rpnEnter() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnEnter() chamado.');
        rpnLiftStack();
        rpnTyping = false;
        stackLift = false;
    }

    // Na HP 12c, quando a pilha desce o T se repete (é o que permite a "constante" em T)
    function rpnDrop() {
        if (DEBUG_RPN) console.log('[RPN] ==> rpnDrop() chamado.');
        rpnStack[2] = rpnStack[1];
        rpnStack[1] = rpnStack[0];
    }

    // Início da digitação de um número: sobe a pilha se o stack lift estiver ligado. Devolve true no primeiro dígito.
    function rpnStartEntry() {
        if (rpnTyping) return false;
        if (stackLift) rpnLiftStack();
        rpnTyping = true;
        stackLift = true;
        return true;
    }

    // Formato D.MY da HP 12c: dd.mmaaaa, sempre com seis casas (o número perde os zeros finais: 1.012020 vira 1.01202)
    function parseDateHP(dateNumber) {
        if (!isFinite(dateNumber) || dateNumber <= 0) return null;
        const day = Math.floor(dateNumber);
        const rest = String(Math.round((dateNumber - day) * 1e6)).padStart(6, '0');
        const month = parseInt(rest.substring(0, 2), 10);
        const year = parseInt(rest.substring(2), 10);
        if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
            return dateObj;
        }
        return null;
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
                    stackLift = true;
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
            if (rpnStartEntry()) {
                currentInput = digit;
            } else if (currentInput === '0' || currentInput === '-0') {
                currentInput = currentInput.replace('0', digit);
            } else {
                currentInput += digit;
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
            if (stackLift) rpnLiftStack();
            currentInput = value;
            rpnTyping = false;
            stackLift = true;
        } else {
            if (resetScreen || currentInput === '0') {
                currentInput = value;
                resetScreen = false;
            } else {
                currentInput += implicitMultiply() + value;
            }
            expressionMode = true;
        }
    }

    // Constante ou função logo depois de um número ou ")" multiplica: "2π" = 2×π
    function implicitMultiply() {
        return /[\d.)]$/.test(currentInput) ? '×' : '';
    }

    function inputParenthesis(parenthesis) {
        if (rpnMode) return;
        if (resetScreen) {
            currentInput = parenthesis;
            resetScreen = false;
        } else if (currentInput === '0') {
            currentInput = parenthesis;
        } else {
            // "2(3+1)" = 2×(3+1), como a constante e a função depois de número
            currentInput += (parenthesis === '(' ? implicitMultiply() : '') + parenthesis;
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
                currentInput = (currentInput === '0') ? displayFunction : currentInput + implicitMultiply() + displayFunction;
            }
            expressionMode = true;
        }
    }

    function inputDecimal() {
        if (rpnMode) {
            if (rpnStartEntry()) {
                currentInput = '0.';
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
            if (rpnTyping) {
                currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : '-' + currentInput;
            } else {
                // Fora da digitação, CHS troca o sinal de X sem mexer no stack lift (como na HP 12c)
                currentInput = (-parseFloat(currentInput)).toString();
            }
        } else {
            // ± põe ou tira o sinal do último número, sem mexer na operação: "10−2 ±" vira "10−-2", que é 10 − (−2).
            // (Antes virava "10+2": igual na soma, mas errado na potência: 10 − (−2)² = 6, e "10+2^2" dava 14.)
            const match = currentInput.match(/(^|[+\-×÷^(])(-?)([0-9.]+)$/);
            if (match) {
                const numberStart = match.index + match[1].length;
                currentInput = currentInput.substring(0, numberStart) + (match[2] ? '' : '-') + match[3];
            } else if (!isNaN(parseFloat(currentInput))) {
                currentInput = (parseFloat(currentInput) * -1).toString();
            }
        }
    }

    function inputPercent() {
        if (rpnMode) {
            handleRpnOperation('percent');
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
            calculate(); // 1/x vale para a expressão inteira, não só para o primeiro número
            if (currentInput === 'Erro') return;
            const value = parseFloat(currentInput);
            currentInput = (value === 0) ? 'Erro' : formatResult(1 / value);
            resetScreen = true;
        }
    }

    function formatResult(value) {
        if (!isFinite(value)) return "Erro";
        // 15 dígitos significativos: com 12, R$ 12.345.678.901,23 virava 12.345.678.901,2
        const rounded = Number(value.toPrecision(15));
        let text = rounded.toString();
        if (text.includes('e')) {
            // Sem notação científica no visor ALG: "1e-7" seria lido como 1×e−7 na conta seguinte
            text = Math.abs(rounded) < 1 ? rounded.toFixed(20).replace(/\.?0+$/, '') : BigInt(Math.round(rounded)).toString();
        }
        return text;
    }

    // a + b% = a + a×b/100 e a − b% = a − a×b/100 (como nas calculadoras comuns); "a" é o que vem antes, no mesmo parêntese.
    // Com × e ÷ o b% continua b/100 (a×b% = a×b/100; a÷b% = a÷(b/100)).
    function applyAdditivePercent(expr) {
        const additive = /[\d)]([+\-])(\d+\.?\d*)%/;
        let match;
        while ((match = additive.exec(expr))) {
            const signIndex = match.index + 1;
            let depth = 0, start = signIndex - 1;
            for (; start >= 0; start--) {
                if (expr[start] === ')') depth++;
                else if (expr[start] === '(') { if (depth === 0) break; depth--; }
            }
            const base = expr.slice(start + 1, signIndex);
            const pctEnd = signIndex + 1 + match[2].length + 1;
            expr = expr.slice(0, signIndex + 1) + `((${base})×${match[2]}÷100)` + expr.slice(pctEnd);
        }
        return expr;
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
                .replace(/,/g, '.')
                // zeros à esquerda: o eval leria 010 como octal (= 8)
                .replace(/(^|[^\d.])0+(?=\d)/g, '$1')
                // número com sinal vira (-n): a tecla ± troca o sinal do número e o JavaScript recusa -2**2
                .replace(/(^|[(+\-×÷^])-(\d+\.?\d*)/g, '$1(-$2)');
            expressionToEvaluate = applyAdditivePercent(expressionToEvaluate)
                .replace(/π/g, `(${MATH_CONSTANTS.pi})`)
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
            if (rpnTyping) {
                currentInput = currentInput.slice(0, -1);
                if (currentInput === '' || currentInput === '-') clearEntry();
            } else {
                clearEntry(); // fora da digitação, ⌫ funciona como CLx
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
            // CLx zera X e desliga o stack lift; os acumuladores da média ponderada só zeram no C
            currentInput = '0';
            rpnTyping = false;
            stackLift = false;
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
        rpnTyping = false;
        stackLift = false;
        rpnErrorX = '0';
        resetWeightedAverage();
    }

    function applyValueToField() {
        if (activeInputField) {
            if (!rpnMode) calculate();
            if (currentInput === 'Erro') {
                if (calculatorModal) calculatorModal.style.display = "none";
                activeInputField.focus(); activeInputField = null; return;
            }
            let valueToApply = currentInput;
            const numericValue = parseFloat(currentInput.toString().replace(',', '.')); // garante conversão segura
            
            if (!isNaN(numericValue)) {
                if (activeInputField.type === 'number') {
                    // Para number (ex: Ações em Circulação), usa formato bruto do Javascript sem zeros à direita (ex: 35 ou 35.5)
                    valueToApply = (activeInputField.id === 'periods') ? numericValue.toFixed(8) : numericValue.toString();
                } else {
                    // Para texto, mantemos a formatação amigável com vírgulas original da calculadora
                    const rateFieldIds = ['rate', 'mirrFinancingRate', 'mirrReinvestmentRate', 'npvDiscountRate', 'npvFinancingRate', 'npvReinvestmentRate'];
                    if (rateFieldIds.includes(activeInputField.id)) {
                        valueToApply = numericValue.toFixed(8).replace('.', ',');
                    } else if (activeInputField.id === 'periods') {
                        valueToApply = numericValue.toFixed(8).replace('.', ',');
                    } else {
                        // centavos pelo roundCents da Calculadora Financeira (toFixed(2) levava 1,005 para 1,00)
                        const cents = typeof roundCents === 'function' ? (roundCents(numericValue) || 0) : numericValue;
                        valueToApply = cents.toFixed(2).replace('.', ',');
                    }
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
    // Toda operação encerra a digitação e liga o stack lift. Com erro, a pilha fica como estava.
    function handleRpnOperation(action) {
        const x = parseFloat(currentInput);
        const y = rpnStack[2];

        const twoOperandOps = ['add', 'subtract', 'multiply', 'divide', 'power', 'dateDiff', 'equivRate'];
        const percentOps = ['percent', 'percentDiff']; // usam Y e X, mas o Y fica na pilha (HP 12c)

        const usesY = twoOperandOps.includes(action) || percentOps.includes(action);
        const result = usesY ? performRpnCalculation(action, y, x) : performRpnCalculation(action, x);
        rpnTyping = false;
        stackLift = true;

        if (typeof result !== 'number' || !isFinite(result)) {
            setRpnError();
            return;
        }
        if (twoOperandOps.includes(action)) rpnDrop();
        currentInput = result.toString();
    }

    function setRpnError() {
        rpnErrorX = currentInput;
        currentInput = 'Erro';
        rpnTyping = false;
    }

    // Entrada: [valor] ENTER [peso] x̄w. Resultado: X = média ponderada acumulada, Y = quantidade de entradas.
    function handleWeightedAverage() {
        const weight = parseFloat(currentInput);
        const value = rpnStack[2];
        rpnTyping = false;
        stackLift = true;

        if (!isFinite(weight) || !isFinite(value) || weightedAvgSumOfWeights + weight === 0) {
            setRpnError();
            return;
        }

        weightedAvgSumOfProducts += value * weight;
        weightedAvgSumOfWeights += weight;
        weightedAvgEntries++;

        currentInput = (weightedAvgSumOfProducts / weightedAvgSumOfWeights).toString();
        rpnStack[2] = weightedAvgEntries;
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
                // Dias corridos da 1ª (Y) para a 2ª data (X): negativo se a 2ª for anterior, como na HP 12c
                return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
            case 'percent': return op1 * op2 / 100;
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
    window.handleNumericInputKeydown = function (event) {
        const allowed = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace', 'Tab', 'Home', 'End', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ContextMenu', 'PageUp', 'PageDown', 'Insert', 'F5', 'F12', 'Enter'];
        if (allowed.includes(event.key) || (event.key.startsWith('F') && event.key !== 'F1')) return;
        if (event.key === 'F1') {
            event.preventDefault(); event.stopPropagation();
            openCalculator(event.target);
        }
    };
    window.handleNumericInputDblClick = function (event) {
        const input = event.target;
        if (input.tagName === 'INPUT' && input.type === 'number') {
            const rect = input.getBoundingClientRect();
            // Evita abrir a calculadora se o clique foi na área das setas (spinners), que ocupam cerca de 28px do lado direito.
            if (rect.right - event.clientX < 28) {
                return;
            }
        }
        event.preventDefault();
        openCalculator(input);
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
                    // RPN: como na HP 12c, a tecla seguinte só limpa o erro e devolve o X de antes
                    if (rpnMode) {
                        currentInput = rpnErrorX;
                        updateDisplay();
                    }
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
                                let tempY = rpnStack[2]; rpnStack[2] = parseFloat(currentInput) || 0;
                                currentInput = tempY.toString(); rpnTyping = false; stackLift = true; break;
                            case 'rollDown':
                                let tempX = parseFloat(currentInput) || 0;
                                currentInput = rpnStack[2].toString(); rpnStack[2] = rpnStack[1];
                                rpnStack[1] = rpnStack[0]; rpnStack[0] = tempX; rpnTyping = false; stackLift = true; break;
                            case 'percent':
                            case 'add': case 'subtract': case 'multiply': case 'divide': case 'power':
                            case 'inverse': case 'sqrt': case 'log': case 'ln': case 'exp':
                            case 'dateDiff': case 'percentDiff': case 'equivRate':
                                handleRpnOperation(action); break;
                            case 'weightedAverage':
                                handleWeightedAverage(); break;
                            default:
                                switch (action) {
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
    window.openCalculator = openCalculator;
});