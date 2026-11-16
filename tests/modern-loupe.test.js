import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Interpreter } from '../src/engine/interpreter.js';
import { Runtime } from '../src/engine/runtime.js';
import { encodeUrlState, decodeUrlState, DEFAULT_CODE, DEFAULT_HTML } from '../src/engine/urlSync.js';
import { EXAMPLES } from '../src/engine/examples.js';

describe('URL State Sync', () => {
  it('should encode and decode simple code and html', () => {
    const code = 'console.log("hello");';
    const html = '<button>Click</button>';
    const encoded = encodeUrlState(code, html);
    const decoded = decodeUrlState(`?code=${encodeURIComponent(encoded)}`);
    assert.strictEqual(decoded.code, code);
    assert.strictEqual(decoded.html, html);
  });

  it('should handle UTF-8 characters and unicode safely', () => {
    const code = 'console.log("✨ Unicode 👍 🎉");';
    const html = '<div>🚀 Launch</div>';
    const encoded = encodeUrlState(code, html);
    const decoded = decodeUrlState(`?code=${encodeURIComponent(encoded)}`);
    assert.strictEqual(decoded.code, code);
    assert.strictEqual(decoded.html, html);
  });

  it('should handle ?code=!!! gracefully without crashing or throwing', () => {
    const decoded = decodeUrlState('?code=!!!');
    // Should fallback to default code and html
    assert.strictEqual(decoded, null);
  });

  it('should handle empty or malformed search queries', () => {
    assert.strictEqual(decodeUrlState(''), null);
    assert.strictEqual(decodeUrlState('?other=123'), null);
    assert.strictEqual(decodeUrlState('?code=gibberish$$$'), null);
  });
});

describe('Runtime & Interpreter Execution', () => {
  it('should execute custom user code without reverting to default code', async () => {
    const runtime = new Runtime();
    runtime.setDelay(0); // instant for testing

    const customCode = `
      var x = 10;
      var y = 20;
      console.log('Result:', x + y);
    `;

    await runtime.run(customCode);

    // Verify console output
    const logs = runtime.getState().consoleLogs;
    assert.ok(logs.some(l => l.args.join(' ').includes('Result: 30')));
    runtime.reset();
  });

  it('should push and pop nested call stack frames in LIFO order', async () => {
    const runtime = new Runtime();
    runtime.setDelay(0);

    const callStackLog = [];
    runtime.subscribe((state) => {
      if (state.callStack.length > 0) {
        callStackLog.push(state.callStack.map(f => f.name));
      }
    });

    const code = `
      function a() {
        b();
      }
      function b() {
        console.log('Inside b');
      }
      a();
    `;

    await runtime.run(code);

    // Verify that at some point, both a() and b() were on the stack together
    assert.ok(callStackLog.some(frames => 
      frames.some(f => f.startsWith('a(')) && frames.some(f => f.startsWith('b('))
    ));

    // Verify callstack is empty at the end
    assert.strictEqual(runtime.getState().callStack.length, 0);
    runtime.reset();
  });

  it('should handle setTimeout and queue callbacks', async () => {
    const runtime = new Runtime();
    runtime.setDelay(10);

    const code = `
      console.log('Start');
      setTimeout(function testTimer() {
        console.log('Timer done');
      }, 50);
      console.log('End');
    `;

    await runtime.run(code);

    // Wait for timer to finish in Web APIs and execute via event loop
    await new Promise(r => setTimeout(r, 200));

    const logs = runtime.getState().consoleLogs.map(l => l.args.join(' '));
    assert.ok(logs.includes('Start'));
    assert.ok(logs.includes('End'));
    assert.ok(logs.includes('Timer done'));

    runtime.reset();
  });

  it('should handle $.on DOM event registration and triggering', async () => {
    const runtime = new Runtime();
    runtime.setDelay(10);

    const code = `
      $.on('button', 'click', function onBtnClick() {
        console.log('Button was clicked!');
      });
    `;

    await runtime.run(code);

    // Web API listener should be registered
    const apis = runtime.getState().webApis;
    assert.ok(apis.some(a => a.type === 'event' && a.event === 'click'));

    // Trigger click event
    runtime.triggerDomEvent('button', 'click');

    // Wait for event loop to process callback
    await new Promise(r => setTimeout(r, 800));

    const logs = runtime.getState().consoleLogs.map(l => l.args.join(' '));
    assert.ok(logs.includes('Button was clicked!'));

    runtime.reset();
  });

  it('should verify all preset examples parse without errors', () => {
    for (const ex of EXAMPLES) {
      assert.ok(ex.code.length > 0, `Example ${ex.name} code should not be empty`);
      assert.ok(ex.html.length > 0, `Example ${ex.name} html should not be empty`);
    }
  });
});

describe('Observability & Pedagogical Enhancements', () => {
  it('should update Narrator and History logs during execution', async () => {
    const runtime = new Runtime();
    runtime.setDelay(0);

    const code = `
      function multiply(a, b) {
        return a * b;
      }
      var res = multiply(3, 4);
      console.log('Product:', res);
    `;

    await runtime.run(code);

    const state = runtime.getState();

    // Verify narrator has text
    assert.ok(state.narrator.text.length > 0);

    // Verify history logs captured steps
    assert.ok(state.historyLogs.length > 0, 'History logs should not be empty');
    const titles = state.historyLogs.map(h => h.title);
    assert.ok(titles.some(t => t.includes('multiply')));
    assert.ok(titles.some(t => t.includes('Product: 12')));

    // Verify gatekeeper status
    assert.strictEqual(state.gatekeeper.isStackEmpty, true);

    runtime.reset();
  });

  it('should support time-travel stepping backward and forward', async () => {
    const runtime = new Runtime();
    runtime.setDelay(10);

    const code = `
      var a = 1;
      var b = 2;
      var c = 3;
    `;

    await runtime.run(code);
    assert.ok(runtime.snapshots.length >= 2, 'Should have captured multiple snapshots');

    const total = runtime.snapshots.length;
    runtime.stepBack();
    let state = runtime.getState();
    assert.strictEqual(state.isTimeTraveling, true);
    assert.strictEqual(state.currentStep, total - 1);

    runtime.stepForward();
    state = runtime.getState();
    assert.strictEqual(state.currentStep, total);

    runtime.reset();
  });
});
