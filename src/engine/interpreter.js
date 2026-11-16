import * as acorn from 'acorn';

export class AbortError extends Error {
  constructor() {
    super('Execution aborted');
    this.name = 'AbortError';
  }
}

export class ReturnValue {
  constructor(value) {
    this.value = value;
  }
}

export class BreakSignal {}
export class ContinueSignal {}

export class Scope {
  constructor(parent = null, isFunctionScope = false) {
    this.parent = parent;
    this.isFunctionScope = isFunctionScope;
    this.vars = Object.create(null);
  }

  get(name) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
      return this.vars[name];
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }

  set(name, value) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
      this.vars[name] = value;
      return value;
    }
    if (this.parent && this.parent.has(name)) {
      return this.parent.set(name, value);
    }
    this.vars[name] = value;
    return value;
  }

  setLocal(name, value) {
    this.vars[name] = value;
    return value;
  }

  setVar(name, value) {
    let scope = this;
    while (scope.parent && !scope.isFunctionScope) {
      scope = scope.parent;
    }
    scope.vars[name] = value;
    return value;
  }

  has(name) {
    return (
      Object.prototype.hasOwnProperty.call(this.vars, name) ||
      (this.parent ? this.parent.has(name) : false)
    );
  }
}

export class Interpreter {
  constructor(runtime) {
    this.runtime = runtime;
    this.stepCount = 0;
    this.MAX_STEPS = 50000;
  }

  async run(code) {
    this.stepCount = 0;
    let ast;
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        locations: true,
        sourceType: 'script'
      });
    } catch (err) {
      throw new Error(`Syntax Error: ${err.message}`);
    }

    const globalScope = this.createGlobalScope();
    await this.evalProgram(ast, globalScope);
  }

  createGlobalScope() {
    const scope = new Scope(null, true);

    // Console
    scope.setLocal('console', {
      log: (...args) => this.runtime.logConsole('log', args),
      warn: (...args) => this.runtime.logConsole('warn', args),
      error: (...args) => this.runtime.logConsole('error', args),
      info: (...args) => this.runtime.logConsole('info', args),
      clear: () => this.runtime.clearConsole()
    });

    // Web APIs - Timers
    scope.setLocal('setTimeout', (fn, delay = 0) => {
      return this.runtime.registerTimeout(fn, Number(delay) || 0);
    });

    scope.setLocal('clearTimeout', (id) => {
      this.runtime.clearTimeout(id);
    });

    scope.setLocal('setInterval', (fn, delay = 0) => {
      return this.runtime.registerInterval(fn, Number(delay) || 0);
    });

    scope.setLocal('clearInterval', (id) => {
      this.runtime.clearInterval(id);
    });

    // jQuery-like $ helper
    scope.setLocal('$', {
      on: (selector, event, fn) => {
        return this.runtime.registerDomListener(selector, event, fn);
      }
    });

    // Document mock
    scope.setLocal('document', {
      querySelector: (selector) => this.createElementProxy(selector),
      querySelectorAll: (selector) => [this.createElementProxy(selector)],
      getElementById: (id) => this.createElementProxy(`#${id}`),
      addEventListener: (event, fn) => {
        return this.runtime.registerDomListener('document', event, fn);
      }
    });

    // Standard JavaScript built-ins
    scope.setLocal('Math', Math);
    scope.setLocal('Date', Date);
    scope.setLocal('JSON', JSON);
    scope.setLocal('parseInt', parseInt);
    scope.setLocal('parseFloat', parseFloat);
    scope.setLocal('isNaN', isNaN);
    scope.setLocal('isFinite', isFinite);
    scope.setLocal('String', String);
    scope.setLocal('Number', Number);
    scope.setLocal('Boolean', Boolean);
    scope.setLocal('Array', Array);
    scope.setLocal('Object', Object);
    scope.setLocal('undefined', undefined);
    scope.setLocal('Infinity', Infinity);
    scope.setLocal('NaN', NaN);

    return scope;
  }

  createElementProxy(selector) {
    return {
      addEventListener: (event, fn) => {
        return this.runtime.registerDomListener(selector, event, fn);
      },
      click: () => {
        this.runtime.triggerDomEvent(selector, 'click');
      }
    };
  }

  async checkStepLimit() {
    this.stepCount++;
    if (this.stepCount > this.MAX_STEPS) {
      throw new Error(`Step limit exceeded (${this.MAX_STEPS} steps). Possible infinite loop.`);
    }
  }

  async evalProgram(node, scope) {
    // Hoist function declarations
    for (const stmt of node.body) {
      if (stmt.type === 'FunctionDeclaration' && stmt.id) {
        scope.setLocal(stmt.id.name, this.createFunction(stmt, scope));
      }
    }

    for (const stmt of node.body) {
      if (stmt.type !== 'FunctionDeclaration') {
        const res = await this.evalStatement(stmt, scope);
        if (res instanceof ReturnValue) {
          return res.value;
        }
      }
    }
  }

  createFunction(node, parentScope) {
    const fnName = node.id ? node.id.name : 'anonymous';
    const fn = async (...args) => {
      await this.checkStepLimit();
      const fnScope = new Scope(parentScope, true);

      // Bind parameters
      node.params.forEach((param, i) => {
        if (param.type === 'Identifier') {
          fnScope.setLocal(param.name, args[i]);
        } else if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
          fnScope.setLocal(param.name, args[i] !== undefined ? args[i] : null);
        }
      });

      // Bind arguments object
      fnScope.setLocal('arguments', args);

      // Body execution
      if (node.body.type === 'BlockStatement') {
        // Hoist inner functions
        for (const stmt of node.body.body) {
          if (stmt.type === 'FunctionDeclaration' && stmt.id) {
            fnScope.setLocal(stmt.id.name, this.createFunction(stmt, fnScope));
          }
        }

        for (const stmt of node.body.body) {
          if (stmt.type !== 'FunctionDeclaration') {
            const res = await this.evalStatement(stmt, fnScope);
            if (res instanceof ReturnValue) {
              return res.value;
            }
          }
        }
        return undefined;
      } else {
        // Arrow function expression body: e.g. `() => x * 2`
        return await this.evalExpression(node.body, fnScope);
      }
    };

    fn.astNode = node;
    fn.functionName = fnName;
    fn.line = node.loc ? node.loc.start.line : 1;
    return fn;
  }

  async evalStatement(node, scope) {
    if (!node) return;
    await this.checkStepLimit();

    // Trigger step highlighting on lines with executable statements
    if (node.type !== 'BlockStatement' && node.loc) {
      await this.runtime.onStep(node);
    }

    switch (node.type) {
      case 'EmptyStatement':
        return;

      case 'ExpressionStatement':
        return await this.evalExpression(node.expression, scope);

      case 'VariableDeclaration': {
        const isVar = node.kind === 'var';
        for (const decl of node.declarations) {
          const val = decl.init ? await this.evalExpression(decl.init, scope) : undefined;
          if (decl.id.type === 'Identifier') {
            if (isVar) {
              scope.setVar(decl.id.name, val);
            } else {
              scope.setLocal(decl.id.name, val);
            }
          }
        }
        break;
      }

      case 'ReturnStatement': {
        const val = node.argument ? await this.evalExpression(node.argument, scope) : undefined;
        return new ReturnValue(val);
      }

      case 'IfStatement': {
        const test = await this.evalExpression(node.test, scope);
        if (test) {
          return await this.evalStatement(node.consequent, scope);
        } else if (node.alternate) {
          return await this.evalStatement(node.alternate, scope);
        }
        break;
      }

      case 'BlockStatement': {
        const blockScope = new Scope(scope, false);
        for (const stmt of node.body) {
          const res = await this.evalStatement(stmt, blockScope);
          if (res instanceof ReturnValue || res instanceof BreakSignal || res instanceof ContinueSignal) {
            return res;
          }
        }
        break;
      }

      case 'WhileStatement': {
        while (await this.evalExpression(node.test, scope)) {
          const res = await this.evalStatement(node.body, scope);
          if (res instanceof ReturnValue) return res;
          if (res instanceof BreakSignal) break;
        }
        break;
      }

      case 'DoWhileStatement': {
        do {
          const res = await this.evalStatement(node.body, scope);
          if (res instanceof ReturnValue) return res;
          if (res instanceof BreakSignal) break;
        } while (await this.evalExpression(node.test, scope));
        break;
      }

      case 'ForStatement': {
        const loopScope = new Scope(scope, false);
        if (node.init) {
          if (node.init.type === 'VariableDeclaration') {
            await this.evalStatement(node.init, loopScope);
          } else {
            await this.evalExpression(node.init, loopScope);
          }
        }

        while (node.test ? await this.evalExpression(node.test, loopScope) : true) {
          const res = await this.evalStatement(node.body, loopScope);
          if (res instanceof ReturnValue) return res;
          if (res instanceof BreakSignal) break;
          if (node.update) {
            await this.evalExpression(node.update, loopScope);
          }
        }
        break;
      }

      case 'BreakStatement':
        return new BreakSignal();

      case 'ContinueStatement':
        return new ContinueSignal();

      case 'TryStatement': {
        try {
          return await this.evalStatement(node.block, scope);
        } catch (err) {
          if (err instanceof AbortError) throw err;
          if (node.handler) {
            const catchScope = new Scope(scope, false);
            if (node.handler.param && node.handler.param.type === 'Identifier') {
              catchScope.setLocal(node.handler.param.name, err);
            }
            return await this.evalStatement(node.handler.body, catchScope);
          }
        } finally {
          if (node.finalizer) {
            await this.evalStatement(node.finalizer, scope);
          }
        }
        break;
      }

      default:
        console.warn('Unhandled statement:', node.type);
    }
  }

  async evalExpression(node, scope) {
    if (!node) return undefined;
    await this.checkStepLimit();

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return scope.get(node.name);

      case 'TemplateLiteral': {
        let str = '';
        for (let i = 0; i < node.quasis.length; i++) {
          str += node.quasis[i].value.raw;
          if (i < node.expressions.length) {
            str += String(await this.evalExpression(node.expressions[i], scope));
          }
        }
        return str;
      }

      case 'BinaryExpression': {
        const left = await this.evalExpression(node.left, scope);
        const right = await this.evalExpression(node.right, scope);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '==': return left == right;
          case '===': return left === right;
          case '!=': return left != right;
          case '!==': return left !== right;
          case '<': return left < right;
          case '<=': return left <= right;
          case '>': return left > right;
          case '>=': return left >= right;
          case '&': return left & right;
          case '|': return left | right;
          case '^': return left ^ right;
          default: throw new Error(`Unknown binary operator ${node.operator}`);
        }
      }

      case 'LogicalExpression': {
        const left = await this.evalExpression(node.left, scope);
        if (node.operator === '&&') {
          return left ? await this.evalExpression(node.right, scope) : left;
        } else if (node.operator === '||') {
          return left ? left : await this.evalExpression(node.right, scope);
        } else if (node.operator === '??') {
          return left !== null && left !== undefined ? left : await this.evalExpression(node.right, scope);
        }
        break;
      }

      case 'UnaryExpression': {
        const arg = await this.evalExpression(node.argument, scope);
        switch (node.operator) {
          case '!': return !arg;
          case '-': return -arg;
          case '+': return +arg;
          case '~': return ~arg;
          case 'typeof': return typeof arg;
          case 'void': return void arg;
          default: throw new Error(`Unknown unary operator ${node.operator}`);
        }
      }

      case 'UpdateExpression': {
        if (node.argument.type === 'Identifier') {
          const current = Number(scope.get(node.argument.name)) || 0;
          const next = node.operator === '++' ? current + 1 : current - 1;
          scope.set(node.argument.name, next);
          return node.prefix ? next : current;
        }
        break;
      }

      case 'AssignmentExpression': {
        const rightVal = await this.evalExpression(node.right, scope);
        if (node.left.type === 'Identifier') {
          const varName = node.left.name;
          if (node.operator === '=') {
            scope.set(varName, rightVal);
          } else if (node.operator === '+=') {
            scope.set(varName, scope.get(varName) + rightVal);
          } else if (node.operator === '-=') {
            scope.set(varName, scope.get(varName) - rightVal);
          } else if (node.operator === '*=') {
            scope.set(varName, scope.get(varName) * rightVal);
          } else if (node.operator === '/=') {
            scope.set(varName, scope.get(varName) / rightVal);
          }
          return rightVal;
        } else if (node.left.type === 'MemberExpression') {
          const obj = await this.evalExpression(node.left.object, scope);
          const prop = node.left.computed
            ? await this.evalExpression(node.left.property, scope)
            : node.left.property.name;
          if (obj) {
            obj[prop] = rightVal;
          }
          return rightVal;
        }
        break;
      }

      case 'MemberExpression': {
        const obj = await this.evalExpression(node.object, scope);
        if (!obj) return undefined;
        let prop;
        if (node.computed) {
          prop = await this.evalExpression(node.property, scope);
        } else {
          prop = node.property.name;
        }
        const val = obj[prop];
        if (typeof val === 'function') {
          return val.bind(obj);
        }
        return val;
      }

      case 'CallExpression': {
        const callee = await this.evalExpression(node.callee, scope);
        const args = [];
        for (const argNode of node.arguments) {
          args.push(await this.evalExpression(argNode, scope));
        }

        // Format call name for Call Stack display
        const callName = this.formatCallName(node, args);
        const line = node.loc ? node.loc.start.line : 1;

        // Push frame to Call Stack
        const frameId = await this.runtime.pushStack(callName, line);

        let result;
        try {
          if (typeof callee === 'function') {
            result = await callee(...args);
          } else {
            throw new Error(`${callName} is not a function`);
          }
        } finally {
          // Pop frame from Call Stack with result
          await this.runtime.popStack(frameId, result);
        }
        return result;
      }

      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.createFunction(node, scope);

      case 'ArrayExpression': {
        const arr = [];
        for (const el of node.elements) {
          arr.push(await this.evalExpression(el, scope));
        }
        return arr;
      }

      case 'ObjectExpression': {
        const obj = {};
        for (const prop of node.properties) {
          if (prop.type === 'Property') {
            const key = prop.computed
              ? await this.evalExpression(prop.key, scope)
              : prop.key.name || prop.key.value;
            const val = await this.evalExpression(prop.value, scope);
            obj[key] = val;
          }
        }
        return obj;
      }

      default:
        console.warn('Unhandled expression node:', node.type);
        return undefined;
    }
  }

  formatCallName(node, evaluatedArgs) {
    let name = 'anonymous';
    if (node.callee.type === 'Identifier') {
      name = node.callee.name;
    } else if (node.callee.type === 'MemberExpression') {
      const obj = node.callee.object.name || 'obj';
      const prop = node.callee.property.name || 'prop';
      name = `${obj}.${prop}`;
    }

    const formattedArgs = evaluatedArgs.map((arg) => {
      if (typeof arg === 'function') {
        return arg.functionName ? `${arg.functionName}()` : 'function()';
      }
      if (typeof arg === 'string') {
        return JSON.stringify(arg.length > 25 ? arg.slice(0, 22) + '...' : arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return Array.isArray(arg) ? `[Array(${arg.length})]` : '{...}';
      }
      return String(arg);
    });

    return `${name}(${formattedArgs.join(', ')})`;
  }
}
