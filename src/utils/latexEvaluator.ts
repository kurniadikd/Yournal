/**
 * LaTeX Expression Evaluator
 * 
 * Parses LaTeX strings to extract variables and evaluates
 * mathematical expressions with user-provided variable values.
 */

// Known LaTeX commands/constants that should NOT be treated as variables
const LATEX_COMMANDS = new Set([
  'frac', 'sqrt', 'sum', 'prod', 'int', 'lim', 'log', 'ln', 'exp',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'text', 'mathrm', 'mathbf', 'mathit', 'vec', 'hat', 'bar', 'dot',
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  'begin', 'end', 'pmatrix', 'bmatrix', 'vmatrix',
  'cdot', 'cdots', 'ldots', 'times', 'div', 'pm', 'mp',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim',
  'infty', 'partial', 'nabla', 'forall', 'exists',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta',
  'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
  'omicron', 'rho', 'sigma', 'tau', 'upsilon',
  'phi', 'chi', 'psi', 'omega',
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta',
  'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi',
  'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
  'Phi', 'Chi', 'Psi', 'Omega',
  'hbar', 'ell',
  'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
  'quad', 'qquad', 'space',
]);

// Greek letters that CAN be variables (commonly used as physics/math vars)
const GREEK_VARIABLES = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta',
  'theta', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau',
  'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
  'Phi', 'Psi', 'Omega',
]);

// Constants that have fixed numeric values
const MATH_CONSTANTS: Record<string, number> = {
  'pi': Math.PI,
  'e': Math.E,
  'Pi': Math.PI,
};

/**
 * Extract variable names from a LaTeX expression string.
 * Returns unique variable names sorted alphabetically.
 */
export function extractVariables(latex: string): string[] {
  const variables = new Set<string>();
  
  // Remove LaTeX environments and standard commands that don't contain variables
  let cleaned = latex
    .replace(/\\begin\{[^}]*\}/g, '')
    .replace(/\\end\{[^}]*\}/g, '')
    .replace(/\\text\{[^}]*\}/g, '')
    .replace(/\\mathrm\{[^}]*\}/g, '')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '');

  // If it's an equation "y = x + 1", we treat the LHS as a result, not an input variable
  // unless it also appears on the RHS.
  let rhs = cleaned;
  let lhsVar = "";
  if (cleaned.includes('=')) {
    const [left, right] = cleaned.split('=');
    rhs = right;
    // Check if LHS is a simple variable
    const leftMatch = left.trim().match(/^[a-zA-Z]$|^\\([a-zA-Z]+)$|^([a-zA-Z])_\{?([a-zA-Z0-9]+)\}?$/);
    if (leftMatch) {
      lhsVar = left.trim();
    }
  }

  // Find all letters [a-zA-Z] that are NOT part of a \command
  // First, identify all \commands and temporary replace them to avoid matching inside them
  const commands: string[] = [];
  const withPlaceholders = rhs.replace(/\\([a-zA-Z]+)/g, (match, cmd) => {
    if (GREEK_VARIABLES.has(cmd)) {
      return match; // Keep Greek variables
    }
    commands.push(match);
    return `__CMD${commands.length - 1}__`;
  });

  // Now match all letters in the remaining string
  const letterPattern = /[a-zA-Z]/g;
  let match;
  while ((match = letterPattern.exec(withPlaceholders)) !== null) {
    const letter = match[0];
    // Skip 'e' and 'i' if they are constants
    if (letter === 'e' || letter === 'i') continue; // i for complex (unsupported) or index (handled by subscript)
    variables.add(letter);
  }

  // Find Greek letter variables
  const greekPattern = /\\([a-zA-Z]+)/g;
  while ((match = greekPattern.exec(rhs)) !== null) {
    const cmd = match[1];
    if (GREEK_VARIABLES.has(cmd) && !MATH_CONSTANTS[cmd]) {
      variables.add(`\\${cmd}`);
    }
  }

  // Find subscripted variables: x_1, a_i, x_{ij}, etc.
  const subscriptPattern = /([a-zA-Z])_\{?([a-zA-Z0-9]+)\}?/g;
  while ((match = subscriptPattern.exec(rhs)) !== null) {
    const fullVar = `${match[1]}_${match[2]}`;
    variables.add(fullVar);
    // Remove the base letter if it was added
    variables.delete(match[1]);
  }

  // Clean up
  for (const c of Object.keys(MATH_CONSTANTS)) {
    variables.delete(c);
    variables.delete('\\' + c);
  }

  // Common physics/math constants and non-variables
  ['d', 'f', 'g', 'h'].forEach(v => {
    // These are often functions (f(x)) or constants (g = 9.8)
    // For now, keep them but they might be tricky
  });
  
  variables.delete('d'); // usually differential

  // Don't include the target variable (LHS) in the required inputs
  if (lhsVar) {
    // However, if lhsVar exists on RHS, it's still an input (recursive or stateful eq)
    // For simplicity, if it's "E = mc^2", we remove E from the "inputs" list
    // because that's what the user wants to calculate.
    variables.delete(lhsVar);
  }

  return Array.from(variables).sort();
}

function isAfterIntegral(latex: string, pos: number): boolean {
  const before = latex.substring(Math.max(0, pos - 10), pos);
  return /\\int|\\,/.test(before);
}

/**
 * Convert a LaTeX expression to a JavaScript-evaluable string.
 * This handles common LaTeX patterns and converts them to JS math.
 */
export function latexToJS(latex: string): string {
  let js = latex;

  // 1. Pre-process Equation: Extract RHS
  if (js.includes('=')) {
    const parts = js.split('=');
    if (parts.length >= 2) {
      js = parts[parts.length - 1].trim();
    }
  }

  // 2. Clean up LaTeX artifacts
  js = js.replace(/\\left|\\right/g, '');
  js = js.replace(/\\,/g, '');
  js = js.replace(/\\quad|\\qquad/g, '');
  js = js.replace(/\\text\{[^}]*\}/g, '');
  js = js.replace(/\\mathrm\{[^}]*\}/g, '');

  // 3. Normalize Operators
  js = js.replace(/\\cdot/g, '*');
  js = js.replace(/\\times/g, '*');
  js = js.replace(/\\div/g, '/');

  // 4. Handle Subscripts early: x_i -> xi
  js = js.replace(/([a-zA-Z])_\{?([a-zA-Z0-9]+)\}?/g, '$1$2');

  // 5. Greek Letter Variables Placeholder
  GREEK_VARIABLES.forEach(g => {
    js = js.replace(new RegExp(`\\\\${g}`, 'g'), `__${g}__`);
  });

  // 6. Implicit Multiplication between Variables (mc -> m*c)
  // We do this BEFORE introducing Math.pow or Math.sin to avoid breaking them
  // Match two letters adjacent, or digit-letter
  js = js.replace(/(\d)([a-zA-Z_])/g, '$1*$2');
  // Adjacent letters (but avoid Greek placeholders for now)
  // This matches a-z followed by a-z if not part of a specialized word
  // For now, let's keep it simple: x y -> x*y
  js = js.replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1*$2');
  // Adjacent variables without space: mc -> m*c
  // (We'll refine this after Greeks are restored)

  // 7. Handle Fractions recursively
  const fracPattern = /\\frac\{([^{}]+)\}\{([^{}]+)\}/;
  let fracMatch;
  let iterations = 0;
  while ((fracMatch = js.match(fracPattern)) && iterations < 10) {
    js = js.replace(fracPattern, '(($1)/($2))');
    iterations++;
  }

  // 8. Replace Constants
  js = js.replace(/\\pi/g, 'Math.PI');
  js = js.replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'Math.E');

  // 9. Restore Greeks then handle their implicit multiplication
  GREEK_VARIABLES.forEach(g => {
    js = js.replace(new RegExp(`__${g}__`, 'g'), g);
  });
  
  // Now handle implicit mult for restored Greeks and normal vars
  // Match: (var)(var) -> (var)*(var)
  // We use a negative lookahead to ensure we don't insert * inside Math.xxx
  js = js.replace(/([a-zA-Z0-9])([a-zA-Z])(?![a-zA-Z0-9]*\()/g, '$1*$2');

  // 10. Handle Powers (Math.pow)
  // {x+y}^2 -> Math.pow(x+y, 2)
  js = js.replace(/\{([^{}]+)\}\^\{?([a-zA-Z0-9.]+)\}?/g, 'Math.pow(($1), $2)');
  // x^2 -> Math.pow(x, 2)
  js = js.replace(/([a-zA-Z0-9.]+)\^\{([^{}]+)\}/g, 'Math.pow($1, $2)');
  js = js.replace(/([a-zA-Z0-9.]+)\^([a-zA-Z0-9.])/g, 'Math.pow($1, $2)');

  // 11. Handle Functions (Math.sin, etc)
  const mathFuncs = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt'];
  mathFuncs.forEach(f => {
    const name = f === 'ln' ? 'log' : (f === 'log' ? 'log10' : f);
    // Handle \func{arg}
    js = js.replace(new RegExp(`\\\\${f}\\{([^}]+)\\}`, 'g'), `Math.${name}($1)`);
    // Handle \func(arg)
    js = js.replace(new RegExp(`\\\\${f}\\(([^)]+)\\)`, 'g'), `Math.${name}($1)`);
    // Handle \func arg
    js = js.replace(new RegExp(`\\\\${f}\\s+([a-zA-Z0-9.]+)`, 'g'), `Math.${name}($1)`);
  });
  
  // Custom sqrt[n]{x}
  js = js.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, 'Math.pow(($2), 1/($1))');

  // 12. Final Cleanup: Remove remaining backslashes and curlies
  js = js.replace(/\\/g, '');
  js = js.replace(/[{}]/g, '');

  // 13. Implicit mult with parentheses
  // Avoid inserting * before Math functions already handled
  js = js.replace(/([0-9a-zA-Z])\((?!Math\.)/g, '$1*(');
  js = js.replace(/\)([0-9a-zA-Z(])/g, ')*$1');

  return js.replace(/\s+/g, '');
}

/**
 * Wraps variables in the LaTeX string with a KaTeX-compatible htmlClass macro.
 * This allows the UI to identify and attach interaction handlers to rendered variables.
 * Requires { trust: true } in KaTeX options.
 */
export function getInteractiveLatex(latex: string, variables: string[]): string {
  if (variables.length === 0) return latex;

  // Build a single regex that matches any of the variables.
  // Sort variables by length descending to match longest first (e.g. \alpha before a).
  const sortedVars = [...variables].sort((a, b) => b.length - a.length);
  const patterns = sortedVars.map(v => {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // For Greek commands like \alpha, ensure they don't match substrings of other commands.
    // For single letters, ensure they are not preceded by a backslash.
    return v.startsWith('\\') ? `${escaped}(?![a-zA-Z])` : `(?<!\\\\)${escaped}(?![a-zA-Z])`;
  });
  
  try {
    const combinedRegex = new RegExp(patterns.join('|'), 'g');
    return latex.replace(combinedRegex, (match) => {
      // Find the clean name for the variable to use in the class
      const cleanName = match.replace(/\\/g, '').replace(/[\{\}]/g, '');
      return `\\htmlClass{math-var-pld var-${cleanName} cursor-pointer hover:bg-[var(--color-secondary-container)]/50 rounded px-1 transition-colors}{${match}}`;
    });
  } catch (e) {
    console.error("Regex construction failed for interactive latex:", e);
    return latex;
  }
}

/**
 * Evaluate a LaTeX expression with given variable values.
 * Returns the numeric result or an error message.
 */
export function evaluateLatex(
  latex: string, 
  values: Record<string, number>
): { result: number | null; error: string | null } {
  try {
    let jsExpr = latexToJS(latex);

    // Substitute variable values
    // Sort by length descending to avoid partial replacements (e.g., "mu" before "m")
    const sortedVars = Object.keys(values).sort((a, b) => b.length - a.length);
    for (const varName of sortedVars) {
      const cleanName = varName.replace(/\\/g, '');
      // Use word boundary-aware replacement
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      jsExpr = jsExpr.replace(new RegExp(escapedName, 'g'), `(${values[varName]})`);
    }

    // Safety check: only allow math operations
    const safePattern = /^[0-9+\-*/().,%\s]*$|Math\./;
    // Remove Math.xxx calls for safety check
    const stripped = jsExpr.replace(/Math\.\w+/g, '').replace(/[0-9+\-*/().,%\s]/g, '');
    if (stripped.length > 0) {
      // There are still unresolved variables
      return { result: null, error: `Variabel belum terisi semua: ${stripped}` };
    }

    // Evaluate using Function constructor (safer than eval)
    const fn = new Function(`"use strict"; return (${jsExpr});`);
    const result = fn();

    if (typeof result !== 'number' || isNaN(result)) {
      return { result: null, error: 'Hasil tidak valid (NaN)' };
    }

    if (!isFinite(result)) {
      return { result: Infinity, error: null };
    }

    return { result, error: null };
  } catch (err: any) {
    return { result: null, error: `Gagal mengevaluasi: ${err.message}` };
  }
}

/**
 * Format a number for display.
 * Uses locale formatting and handles special cases.
 */
export function formatResult(value: number): string {
  if (!isFinite(value)) return '∞';
  if (Number.isInteger(value)) return value.toLocaleString('id-ID');
  
  // For very small or very large numbers, use scientific notation
  if (Math.abs(value) < 0.001 || Math.abs(value) > 1e9) {
    return value.toExponential(4);
  }
  
  // Normal range: up to 6 decimal places
  return parseFloat(value.toFixed(6)).toLocaleString('id-ID', { maximumFractionDigits: 6 });
}
