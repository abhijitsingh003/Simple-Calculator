document.addEventListener('DOMContentLoaded', () => {
    const display = document.querySelector('.display');
    const historyDisplay = document.querySelector('.history-display');
    const keys = document.querySelector('.keypad');

    // State
    let currentInput = '0';
    let expressionHistory = [];
    let waitingForNewInput = false;
    let calculated = false;

    // Initial display
    updateDisplay();

    function evaluateExpression(parts) {
        // Create a safe string to eval
        let evalParts = [...parts];
        if (['+', '-', '*', '/'].includes(evalParts[evalParts.length - 1])) {
            evalParts.pop();
        }
        if (evalParts.length === 0) return 0;

        let expressionStr = evalParts.join(' ');
        try {
            if (/[^0-9+\-*/. ]/.test(expressionStr)) return 0;
            // eslint-disable-next-line no-eval
            let result = new Function('return ' + expressionStr)();
            return parseFloat(result.toPrecision(12));
        } catch (e) {
            return 0;
        }
    }

    function updateDisplay() {
        // Main Display
        let formattedValue = '';
        if (currentInput.includes('.')) {
            const parts = currentInput.split('.');
            let integerPart = parts[0];
            if (integerPart === '' || integerPart === '-') integerPart = integerPart || '-0';
            formattedValue = Number(integerPart === '-0' ? 0 : integerPart).toLocaleString('en-US') + '.' + parts[1];
            if (currentInput.startsWith('-') && !formattedValue.startsWith('-')) formattedValue = '-' + formattedValue;
        } else {
            if (currentInput === '-0') formattedValue = '-0';
            else formattedValue = Number(currentInput).toLocaleString('en-US');
        }
        display.textContent = formattedValue;

        // Font size logic: Only shrink mostly if it's crazy long, but reference image keeps it large and wraps.
        const length = formattedValue.length;
        if (length > 12) {
            display.style.fontSize = '70px';
        } else {
            display.style.fontSize = '85px';
        }

        // History Display
        const opSymbols = { '/': '÷', '*': '×', '-': '−', '+': '+' };

        let historyStr = expressionHistory.map(item => {
            if (['+', '-', '*', '/'].includes(item)) return opSymbols[item];
            return item;
        }).join(' ');

        if (calculated) {
            historyStr += ' =';
        }

        historyDisplay.textContent = historyStr;
    }

    function resetOperatorStates() {
        document.querySelectorAll('[data-action="operator"]').forEach(btn => {
            btn.classList.remove('is-active');
        });
    }

    keys.addEventListener('click', e => {
        const element = e.target.closest('button');
        if (!element) return;

        if (element.classList.contains('btn-accent') && element.dataset.action === 'operator') {
            resetOperatorStates();
            element.classList.add('is-active');
        } else if (element.dataset.action !== 'operator') {
            if (element.dataset.number || element.dataset.action === 'decimal') {
                resetOperatorStates();
            }
        }

        const action = element.dataset.action;
        const keyNumber = element.dataset.number;
        const keyOperator = element.dataset.key;

        if (keyNumber !== undefined) {
            inputDigit(keyNumber);
        } else if (action === 'decimal') {
            inputDecimal();
        } else if (action === 'operator') {
            handleOperator(keyOperator);
        } else if (action === 'calculate') {
            calculate();
        } else if (action === 'clear') {
            allClear();
        } else if (action === 'backspace') {
            backspace();
        } else if (action === 'sign') {
            inputSign();
        } else if (action === 'percent') {
            inputPercent();
        }

        updateDisplay();
    });

    function inputDigit(digit) {
        if (calculated) {
            expressionHistory = [];
            currentInput = digit;
            calculated = false;
            waitingForNewInput = false;
        } else if (waitingForNewInput) {
            currentInput = digit;
            waitingForNewInput = false;
        } else {
            currentInput = currentInput === '0' ? digit : currentInput + digit;
        }

        // Increased limit for wrapping demo
        if (currentInput.length > 18) currentInput = currentInput.slice(0, 18);
    }

    function inputDecimal() {
        if (calculated) {
            expressionHistory = [];
            currentInput = '0.';
            calculated = false;
            waitingForNewInput = false;
        } else if (waitingForNewInput) {
            currentInput = '0.';
            waitingForNewInput = false;
        } else if (!currentInput.includes('.')) {
            currentInput += '.';
        }
    }

    function handleOperator(nextOperator) {
        if (calculated) {
            expressionHistory = [currentInput, nextOperator];
            calculated = false;
            waitingForNewInput = true;
            currentInput = '0';
        } else {
            if (waitingForNewInput && expressionHistory.length > 0) {
                expressionHistory.pop();
                expressionHistory.push(nextOperator);
            } else {
                expressionHistory.push(currentInput);
                expressionHistory.push(nextOperator);
                currentInput = '0';
                waitingForNewInput = true;
            }
        }
    }

    function calculate() {
        if (calculated) return;

        expressionHistory.push(currentInput);

        const total = evaluateExpression(expressionHistory);

        let resultStr = String(total);
        currentInput = resultStr;
        calculated = true;
        waitingForNewInput = true;
    }

    function allClear() {
        currentInput = '0';
        expressionHistory = [];
        calculated = false;
        waitingForNewInput = false;
    }

    function backspace() {
        if (calculated || waitingForNewInput) return;

        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
            if (currentInput === '-' || currentInput === '-0') currentInput = '0';
        } else {
            currentInput = '0';
        }
    }

    function inputSign() {
        if (currentInput === '0') return;
        currentInput = String(parseFloat(currentInput) * -1);
    }

    function inputPercent() {
        currentInput = String(parseFloat(currentInput) / 100);
    }

    // Add touch feedback handling
    const buttons = document.querySelectorAll('button');

    buttons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            // e.preventDefault(); // Don't prevent default, or click might not fire on some devices unless we handle that too. 
            // Better to just let click happen but show visual immediately.
            btn.classList.add('active');
        }, { passive: true });

        btn.addEventListener('touchend', () => {
            btn.classList.remove('active');
        });

        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
        });
    });
});
