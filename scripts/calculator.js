export class Calculator {
  constructor() {
    this.clear();
    this.history = [];
  }
  clear() {
    this.display = "0";
    this.acc = null;
    this.operator = null;
    this.waiting = false;
    this.repeat = null;
    this.expression = "";
  }
  number(value) {
    if (this.display === "错误" || this.waiting) {
      this.display = "0";
      this.waiting = false;
      if (!this.operator) this.repeat = null;
    }
    if (value === ".") {
      if (!this.display.includes(".")) this.display += ".";
    } else if (this.display.replace(/[-.]/g, "").length < 14)
      this.display =
        this.display === "0"
          ? value
          : this.display === "-0"
            ? `-${value}`
            : this.display + value;
  }
  value() {
    return Number(this.display);
  }
  format(value) {
    return Number.isFinite(value) && Math.abs(value) < 1e100
      ? String(Number(value.toPrecision(12)))
      : "错误";
  }
  calculate(a, op, b) {
    return op === "+"
      ? a + b
      : op === "−"
        ? a - b
        : op === "×"
          ? a * b
          : op === "÷"
            ? a / b
            : b;
  }
  operation(op) {
    if (this.display === "错误") return;
    const value = this.value();
    if (this.operator && !this.waiting) {
      this.acc = this.calculate(this.acc, this.operator, value);
      this.display = this.format(this.acc);
    } else this.acc = value;
    this.operator = op;
    this.waiting = true;
    this.expression = `${this.display} ${op}`;
    this.repeat = null;
  }
  equals() {
    if (this.display === "错误") return;
    const op = this.operator || this.repeat?.op;
    if (!op) return;
    const a = this.operator ? this.acc : this.value(),
      b = this.operator ? this.value() : this.repeat.value;
    const result = this.format(this.calculate(a, op, b));
    this.expression = `${a} ${op} ${b} =`;
    this.history.unshift({ expression: this.expression, result });
    this.history = this.history.slice(0, 100);
    this.display = result;
    this.repeat = { op, value: b };
    this.operator = null;
    this.acc = null;
    this.waiting = true;
  }
  percent() {
    if (this.display === "错误") return;
    const value = this.value();
    this.display = this.format(
      this.acc !== null && ["+", "−"].includes(this.operator)
        ? (this.acc * value) / 100
        : value / 100,
    );
  }
  sign() {
    if (this.display !== "错误")
      this.display = this.display.startsWith("-")
        ? this.display.slice(1)
        : `-${this.display}`;
  }
  backspace() {
    if (this.display === "错误") {
      this.clear();
      return;
    }
    if (this.waiting) return;
    this.display = this.display.slice(0, -1);
    if (!this.display || this.display === "-") this.display = "0";
  }
  input(key) {
    if (/^[0-9.]$/.test(key)) this.number(key);
    else if (["+", "−", "×", "÷"].includes(key)) this.operation(key);
    else if (key === "=") this.equals();
    else if (key === "AC") this.clear();
    else if (key === "%") this.percent();
    else if (key === "±") this.sign();
    else if (key === "⌫") this.backspace();
  }
}
