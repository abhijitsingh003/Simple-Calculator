document.addEventListener('DOMContentLoaded', () => {
    const display = document.querySelector('.display');
    const historyDisplay = document.querySelector('.history-display');
    const keys = document.querySelector('.keypad');

    // State
    let currentInput = '0'; // Holds the full expression string (e.g., "10+2*3")
    let lastResult = '';    // Holds the calculation result for history formatting
    let justCalculated = false;

    // Initial display
    updateDisplay();

    function safeEval(str) {
        // Basic safety check: only allow numbers and operators
        if (/[^0-9+\-*/.()]/.test(str)) return 0;
        try {
            // eslint-disable-next-line no-eval
            let result = new Function('return ' + str)();
            // Handle division by zero or other errors returning Infinity/NaN
            if (!isFinite(result) || isNaN(result)) return 'Error';

            // Fix float precision issues (e.g. 0.1 + 0.2)
            // Precision 12 is usually enough for basic calcs
            return parseFloat(result.toPrecision(12));
        } catch (e) {
            return 'Error';
        }
    }

    function formatExpr(expr) {
        return expr
            .replace(/\*/g, '×')
            .replace(/\//g, '÷')
            .replace(/-/g, '−')
            .replace(/\+/g, '+');
    }

    function updateDisplay() {
        display.textContent = formatExpr(currentInput);

        // Font size logic based on CSS overflow, mainly keeping base logic simple

        // History Display
        if (justCalculated && lastResult !== '') {
            historyDisplay.textContent = formatExpr(lastResult) + ' =';

            // Auto scroll history to end
            setTimeout(() => {
                historyDisplay.scrollLeft = historyDisplay.scrollWidth;
            }, 10);
        } else {
            historyDisplay.textContent = '';
        }
    }

    function resetOperatorStates() {
        document.querySelectorAll('[data-action="operator"]').forEach(btn => {
            btn.classList.remove('is-active');
        });
    }

    // Scroll handling for display
    // We might need to auto-scroll to the end when typing
    function scrollToRight() {
        // Small timeout to allow DOM update
        setTimeout(() => {
            display.scrollLeft = display.scrollWidth;
        }, 10);
    }

    keys.addEventListener('click', e => {
        const element = e.target.closest('button');
        if (!element) return;

        // Visual button states (operators only highlight if they are the LAST char? 
        // In expression mode, usually operators don't stay highlighted 'active' in the same way 
        // because you can type "10+2+" and the previous + isn't "pending" in the same sense.
        // But we can briefly highlight them. For now, let's remove persistence or keep it simple.)
        resetOperatorStates();

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
        scrollToRight();
    });

    function inputDigit(digit) {
        if (justCalculated) {
            // New calculation starts
            currentInput = digit;
            justCalculated = false;
            lastResult = '';
        } else {
            if (currentInput === '0') {
                currentInput = digit;
            } else {
                currentInput += digit;
            }
        }
    }

    function inputDecimal() {
        if (justCalculated) {
            currentInput = '0.';
            justCalculated = false;
            lastResult = '';
            return;
        }

        // Prevent multiple decimals in the same number segment
        // Find the last number segment
        const segments = currentInput.split(/[+\-*/]/);
        const lastSegment = segments[segments.length - 1];

        if (!lastSegment.includes('.')) {
            currentInput += '.';
        }
    }

    function handleOperator(nextOperator) {
        if (justCalculated) {
            // Continue with result
            justCalculated = false;
            lastResult = '';
        }

        // Prevent double operators? Or replace the last one?
        // Standard behavior is often replacing the last operator if immediately pressed again.
        const lastChar = currentInput.slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
            // Replace last operator
            currentInput = currentInput.slice(0, -1) + nextOperator;
        } else {
            currentInput += nextOperator;
        }
    }

    function calculate() {
        if (justCalculated) return; // Do nothing if already showing result

        // If expression ends with operator, remove it? or ignore?
        let expr = currentInput;
        const lastChar = expr.slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
            expr = expr.slice(0, -1);
        }

        if (!expr) return;

        // Save current input for history display before updating
        lastResult = expr;

        let result = safeEval(expr);
        currentInput = String(result);
        justCalculated = true;
    }

    function allClear() {
        currentInput = '0';
        lastResult = '';
        justCalculated = false;
    }

    function backspace() {
        if (justCalculated) {
            allClear(); // AC behavior on result usually
            return;
        }

        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
    }

    function inputSign() {
        // Toggle sign of the *last number* in the expression
        // Complicated regex approach: find the last number block
        if (justCalculated) {
            // Treat entire result as number
            let val = parseFloat(currentInput);
            if (!isNaN(val)) {
                currentInput = String(val * -1);
            }
            return;
        }

        // Regex to match the last number (including potential existing negative sign not part of an operator?)
        // Easiest is to split by operators, modify last part, reassemble.
        // Need to be careful about negative numbers vs minus operator.
        // Simple heuristic: search backwards for [+\-*/], whatever follows is the number.

        // This is tricky with things like "10*-5". 
        // Let's iterate backwards.

        let i = currentInput.length - 1;
        // Skip trailing spaces if any (though we don't store them)

        // Move back until we find a digit or dot
        // Then move back until we find NOT a digit/dot (the separator)

        // But wait, if we are at the end, currentInput is the string.
        // We want to wrap the last operand in (-...) or remove (-)

        // Simpler for this specific request:
        // Identify the last operand. 
        // If it starts with -, remove it (if it was neg).
        // If it's pos, add -.

        // Regex for Last Number: /(-?\d*\.?\d+)$/
        // But that fails for "5-3" -> "3" is last number. change to "-3" -> "5--3"? Safe eval handles "5--3" as 5+3 usually or error?
        // JS eval "5--3" works (5 minus negative 3).
        // Let's try to extract the last chunk.

        const match = currentInput.match(/(\d*\.?\d+)$/);
        if (match) {
            const lastNumStr = match[0];
            const index = match.index;

            // Check if preceded by '-' that isn't an operator (i.e. start of string or after another operator)
            // But strict operator logic uses '-' as binary. Unary '-' is context dependent.
            // Let's simply:
            // If we have "10+5", make it "10+(-5)"? Or "10+-5"?
            // "10+-5" is valid in JS eval.
            // If we have "10+-5", make it "10+5".

            // Check character before the number
            let charBefore = currentInput[index - 1];

            if (charBefore === '-') {
                // Check if THAT minus is a binary operator or a sign.
                // If the char before THAT minus is a digit, then the minus is a binary operator: "5-3"
                // So we change "3" to "-3". -> "5--3"
                if (index > 1 && /[0-9.]/.test(currentInput[index - 2])) {
                    // Binary minus. Replace match with -match
                    const partBefore = currentInput.slice(0, index);
                    const partAfter = currentInput.slice(index);
                    currentInput = partBefore + '-' + partAfter; // "5-" + "3" -> "5--3"
                } else {
                    // It is a negative sign (start of string "-5" or "*-5")
                    // Remove it.
                    const partBefore = currentInput.slice(0, index - 1);
                    const partAfter = currentInput.slice(index);
                    currentInput = partBefore + partAfter;
                }
            } else {
                // Positive number, make it negative
                const partBefore = currentInput.slice(0, index);
                const partAfter = currentInput.slice(index);
                currentInput = partBefore + '-' + partAfter;
            }
        }
    }

    function inputPercent() {
        // Take last number and divide by 100
        if (justCalculated) {
            let val = parseFloat(currentInput);
            currentInput = String(val / 100);
            return;
        }

        const match = currentInput.match(/(\d*\.?\d+)$/);
        if (match) {
            const lastNumStr = match[0];
            const index = match.index;

            const val = parseFloat(lastNumStr);
            const newVal = val / 100;

            const partBefore = currentInput.slice(0, index);
            currentInput = partBefore + newVal;
        }
    }

    // Add touch feedback handling
    const buttons = document.querySelectorAll('button');

    buttons.forEach(btn => {
        btn.addEventListener('touchend', () => {
            btn.classList.remove('active');
        });

        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
        });
    });

    // Touch feedback handles active states.
    // Mouse Drag-to-Scroll for desktop users
    function enableDragScroll(el) {
        let isDown = false;
        let startX;
        let scrollLeft;

        el.addEventListener('mousedown', (e) => {
            isDown = true;
            el.style.cursor = 'grabbing';
            startX = e.pageX - el.offsetLeft;
            scrollLeft = el.scrollLeft;
            e.preventDefault();
        });

        el.addEventListener('mouseleave', () => {
            isDown = false;
            el.style.cursor = 'default';
        });

        el.addEventListener('mouseup', () => {
            isDown = false;
            el.style.cursor = 'default';
        });

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - el.offsetLeft;
            const walk = (x - startX) * 2; // Scroll-fast
            el.scrollLeft = scrollLeft - walk;
        });
    }

    enableDragScroll(display);
    enableDragScroll(historyDisplay);
});
