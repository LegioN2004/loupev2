import { Interpreter, AbortError } from './interpreter.js';

let nextId = 1;
function uid(prefix = 'id') {
  return `${prefix}_${nextId++}_${Math.random().toString(36).slice(2, 6)}`;
}

const TASK_PALETTE = [
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#8b5cf6'  // Violet
];

export class Runtime {
  constructor() {
    this.callStack = [];
    this.exitingFrames = []; // Ghost exit states
    this.webApis = [];
    this.exitingApis = [];   // Ghost exit states
    this.callbackQueue = [];
    this.renderQueue = [];
    this.consoleLogs = [];

    // Narrator
    this.narrator = {
      text: 'Click "Save + Run" or press ⌘↵ to start execution.',
      category: 'info',
      detail: 'Ready to trace Call Stack, Web APIs, and the Event Loop.'
    };

    // Event History Audit Log
    this.historyLogs = [];
    this.stepIndex = 0;

    // Time-Travel Snapshots
    this.snapshots = [];
    this.viewingSnapshotIndex = null;

    // Event Loop Gatekeeper Checklist
    this.gatekeeper = {
      isStackEmpty: true,
      hasQueueItems: false,
      stackBlockedBy: null,
      statusText: 'Waiting for code execution...',
      action: 'idle'
    };

    // Color mapper for async operations
    this.colorIndex = 0;
    this.taskColors = new Map();

    this.running = false;
    this.paused = false;
    this.stepping = false;
    this.activeLine = null;
    this.eventLoopSpinning = false;
    this.simulateRenders = false;
    this.delay = 700; // ms per step

    this.aborted = false;
    this.listeners = new Set();
    this.resumeResolvers = [];

    this.webApiInterval = null;
    this.renderQueueInterval = null;
    this.eventLoopRunning = false;
  }

  assignColor(key) {
    if (!this.taskColors.has(key)) {
      const color = TASK_PALETTE[this.colorIndex % TASK_PALETTE.length];
      this.colorIndex++;
      this.taskColors.set(key, color);
    }
    return this.taskColors.get(key);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.updateGatekeeper();
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  updateGatekeeper() {
    const isStackEmpty = this.callStack.length === 0;
    const hasQueueItems = this.callbackQueue.length > 0;
    const activeFrame = this.callStack[this.callStack.length - 1];

    let action = 'idle';
    let statusText = 'Waiting for async events';

    if (!isStackEmpty && hasQueueItems) {
      action = 'waiting_stack';
      statusText = `Call Stack is busy with ${activeFrame?.name || 'function'}. Queue must wait!`;
    } else if (isStackEmpty && hasQueueItems) {
      action = 'shifting';
      statusText = `Stack is clear! Event Loop can move ${this.callbackQueue[0]?.name} to Stack.`;
    } else if (!isStackEmpty) {
      action = 'running';
      statusText = `Call Stack executing: ${activeFrame?.name || 'synchronous code'}`;
    } else if (this.running) {
      action = 'idle';
      statusText = 'Call Stack empty. Waiting for Web API timers or user interaction.';
    }

    this.gatekeeper = {
      isStackEmpty,
      hasQueueItems,
      stackBlockedBy: !isStackEmpty ? activeFrame?.name : null,
      statusText,
      action
    };
  }

  setNarrator(category, text, detail = '') {
    this.narrator = { category, text, detail, timestamp: Date.now() };
    this.recordHistory(category, text, detail);
    this.recordSnapshot();
    this.notify();
  }

  recordHistory(type, title, detail = '', color = null, line = null) {
    this.stepIndex++;
    this.historyLogs.unshift({
      id: uid('hist'),
      step: this.stepIndex,
      time: new Date().toLocaleTimeString(),
      type,
      title,
      detail,
      color: color || '#6366f1',
      line: line || this.activeLine
    });
  }

  recordSnapshot() {
    // Only capture while live running (not while user is time-traveling)
    if (this.viewingSnapshotIndex !== null) return;

    const snapshot = {
      stepIndex: this.stepIndex,
      callStack: JSON.parse(JSON.stringify(this.callStack)),
      webApis: JSON.parse(JSON.stringify(this.webApis)),
      callbackQueue: JSON.parse(JSON.stringify(this.callbackQueue)),
      consoleLogs: JSON.parse(JSON.stringify(this.consoleLogs)),
      activeLine: this.activeLine,
      narrator: { ...this.narrator },
      gatekeeper: { ...this.gatekeeper }
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
  }

  getState() {
    return {
      callStack: [...this.callStack],
      exitingFrames: [...this.exitingFrames],
      webApis: [...this.webApis],
      exitingApis: [...this.exitingApis],
      callbackQueue: [...this.callbackQueue],
      renderQueue: [...this.renderQueue],
      consoleLogs: [...this.consoleLogs],
      historyLogs: [...this.historyLogs],
      narrator: { ...this.narrator },
      gatekeeper: { ...this.gatekeeper },
      stepIndex: this.stepIndex,
      totalSteps: this.snapshots.length,
      currentStep: this.viewingSnapshotIndex !== null ? this.viewingSnapshotIndex + 1 : this.snapshots.length,
      isTimeTraveling: this.viewingSnapshotIndex !== null,
      running: this.running,
      paused: this.paused,
      activeLine: this.activeLine,
      eventLoopSpinning: this.eventLoopSpinning,
      simulateRenders: this.simulateRenders,
      delay: this.delay
    };
  }

  // Time Travel: Step Back
  stepBack() {
    this.paused = true;
    const total = this.snapshots.length;
    if (total <= 1) return;

    let targetIdx = this.viewingSnapshotIndex !== null ? this.viewingSnapshotIndex - 1 : total - 2;
    if (targetIdx < 0) targetIdx = 0;

    this.applySnapshot(targetIdx);
  }

  // Time Travel: Step Forward
  stepForward() {
    const total = this.snapshots.length;
    if (total === 0) return;

    if (this.viewingSnapshotIndex !== null) {
      if (this.viewingSnapshotIndex < total - 1) {
        this.applySnapshot(this.viewingSnapshotIndex + 1);
      } else {
        this.returnToLive();
      }
    } else {
      this.step();
    }
  }

  applySnapshot(index) {
    if (!this.snapshots[index]) return;
    this.viewingSnapshotIndex = index;
    const snap = this.snapshots[index];

    this.callStack = JSON.parse(JSON.stringify(snap.callStack));
    this.webApis = JSON.parse(JSON.stringify(snap.webApis));
    this.callbackQueue = JSON.parse(JSON.stringify(snap.callbackQueue));
    this.consoleLogs = JSON.parse(JSON.stringify(snap.consoleLogs));
    this.activeLine = snap.activeLine;
    this.narrator = { ...snap.narrator };
    this.gatekeeper = { ...snap.gatekeeper };
    this.notify();
  }

  returnToLive() {
    this.viewingSnapshotIndex = null;
    if (this.snapshots.length > 0) {
      const snap = this.snapshots[this.snapshots.length - 1];
      this.callStack = JSON.parse(JSON.stringify(snap.callStack));
      this.webApis = JSON.parse(JSON.stringify(snap.webApis));
      this.callbackQueue = JSON.parse(JSON.stringify(snap.callbackQueue));
      this.consoleLogs = JSON.parse(JSON.stringify(snap.consoleLogs));
      this.activeLine = snap.activeLine;
      this.narrator = { ...snap.narrator };
      this.gatekeeper = { ...snap.gatekeeper };
    }
    this.notify();
  }

  setDelay(ms) {
    this.delay = Math.max(50, Math.min(3000, Number(ms) || 700));
    this.notify();
  }

  setSimulateRenders(enabled) {
    this.simulateRenders = Boolean(enabled);
    if (!this.simulateRenders) {
      this.renderQueue = [];
    }
    this.notify();
  }

  logConsole(type, args) {
    const formattedArgs = args.map((a) => {
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a, null, 2);
        } catch {
          return String(a);
        }
      }
      return String(a);
    });

    const entry = {
      id: uid('log'),
      time: new Date().toLocaleTimeString(),
      type,
      args: formattedArgs,
      line: this.activeLine
    };

    this.consoleLogs.push(entry);
    this.setNarrator('console', `Console ${type}: ${formattedArgs.join(' ')}`, `Output generated on Line ${this.activeLine || '?'}`);

    // Mirror to real browser console
    if (type === 'error') {
      console.error('[Loupe]', ...args);
    } else if (type === 'warn') {
      console.warn('[Loupe]', ...args);
    } else {
      console.log('%c[Loupe]', 'color: #3b82f6; font-weight: bold;', ...args);
    }
  }

  clearConsole() {
    this.consoleLogs = [];
    this.notify();
  }

  async onStep(node, customNarrative = null) {
    if (this.aborted) throw new AbortError();

    this.activeLine = node?.loc?.start?.line || null;
    
    if (customNarrative) {
      this.setNarrator('step', customNarrative, `Executing Line ${this.activeLine}`);
    } else if (this.activeLine) {
      this.setNarrator('step', `Executing Line ${this.activeLine}`, `${node.type}`);
    }

    this.notify();

    // If paused, wait for resume or step
    while (this.paused && !this.stepping && !this.aborted) {
      await new Promise((r) => this.resumeResolvers.push(r));
    }
    if (this.aborted) throw new AbortError();

    if (this.stepping) {
      this.stepping = false;
      this.paused = true;
      this.notify();
      return;
    }

    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, this.delay));
    }
    if (this.aborted) throw new AbortError();
  }

  async pushStack(name, line, color = null) {
    if (this.aborted) throw new AbortError();

    const taskColor = color || this.assignColor(name);
    const frame = {
      id: uid('frame'),
      name,
      line,
      color: taskColor,
      isCallback: false,
      status: 'active'
    };

    this.callStack.push(frame);
    this.setNarrator(
      'stack',
      `Pushed ${name} onto Call Stack (LIFO)`,
      `Sits on top of the stack (Depth: ${this.callStack.length})`
    );
    this.notify();

    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, Math.min(this.delay, 300)));
    }
    return frame.id;
  }

  async popStack(frameId, returnValue = undefined) {
    let removedFrame = null;
    if (frameId) {
      const idx = this.callStack.findIndex((f) => f.id === frameId);
      if (idx !== -1) {
        removedFrame = this.callStack.splice(idx, 1)[0];
      } else {
        removedFrame = this.callStack.pop();
      }
    } else {
      removedFrame = this.callStack.pop();
    }

    if (removedFrame) {
      // Create ghost / exit animation item
      const ghostFrame = {
        ...removedFrame,
        status: 'completed',
        returnValue: returnValue !== undefined ? String(returnValue) : null
      };
      this.exitingFrames.push(ghostFrame);

      // Clean up ghost after 900ms
      setTimeout(() => {
        this.exitingFrames = this.exitingFrames.filter((f) => f.id !== ghostFrame.id);
        this.notify();
      }, 900);

      const retStr = returnValue !== undefined ? ` (Returned: ${returnValue})` : '';
      this.setNarrator(
        'stack',
        `Popped ${removedFrame.name} from Call Stack${retStr}`,
        this.callStack.length === 0
          ? 'Call Stack is now completely EMPTY!'
          : `Stack depth is now ${this.callStack.length}`
      );
    }

    this.notify();

    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, Math.min(this.delay, 250)));
    }
  }

  registerTimeout(fn, delayMs) {
    const fnName = fn.functionName ? `${fn.functionName}()` : 'anonymous()';
    const color = this.assignColor(fnName);
    const timer = {
      id: uid('timer'),
      type: 'timeout',
      name: fnName,
      code: fnName,
      delay: delayMs,
      remaining: delayMs,
      total: delayMs,
      color,
      callback: fn,
      line: fn.line || 1
    };

    this.webApis.push(timer);
    this.setNarrator(
      'api',
      `Offloaded setTimeout(${fnName}, ${delayMs}ms) to Web APIs`,
      `Browser background timer starts countdown (${(delayMs / 1000).toFixed(1)}s)`
    );
    this.notify();
    return timer.id;
  }

  registerInterval(fn, delayMs) {
    const fnName = fn.functionName ? `${fn.functionName}()` : 'anonymous()';
    const color = this.assignColor(fnName);
    const interval = {
      id: uid('interval'),
      type: 'interval',
      name: fnName,
      code: fnName,
      delay: delayMs,
      remaining: delayMs,
      total: delayMs,
      color,
      callback: fn,
      line: fn.line || 1
    };

    this.webApis.push(interval);
    this.setNarrator('api', `Registered setInterval(${fnName}, ${delayMs}ms) in Web APIs`);
    this.notify();
    return interval.id;
  }

  clearTimeout(id) {
    const item = this.webApis.find((w) => w.id === id);
    this.webApis = this.webApis.filter((w) => w.id !== id);
    if (item) {
      this.setNarrator('api', `Cancelled timer ${item.name} via clearTimeout`);
    }
    this.notify();
  }

  clearInterval(id) {
    this.webApis = this.webApis.filter((w) => w.id !== id);
    this.notify();
  }

  registerDomListener(selector, event, fn) {
    const fnName = fn.functionName ? `${fn.functionName}()` : 'anonymous()';
    const color = this.assignColor(fnName);
    const label = `$.on('${selector}', '${event}', ${fnName})`;
    const listener = {
      id: uid('dom'),
      type: 'event',
      name: label,
      code: label,
      selector,
      event,
      color,
      callback: fn,
      line: fn.line || 1
    };

    this.webApis.push(listener);
    this.setNarrator(
      'api',
      `Registered DOM event listener in Web APIs: [${event}] on '${selector}'`,
      'Waiting for user to click or trigger element in HTML scratchpad'
    );
    this.notify();
    return listener.id;
  }

  triggerDomEvent(selector, event) {
    const matches = this.webApis.filter(
      (w) =>
        w.type === 'event' &&
        w.event === event &&
        (w.selector === selector ||
          selector === 'all' ||
          (selector.startsWith('#') && w.selector.includes(selector.slice(1))) ||
          (w.selector === 'button' && selector.includes('button')))
    );

    for (const match of matches) {
      const task = {
        id: uid('cb'),
        type: 'event',
        name: `[${match.event}] ${match.callback.functionName || 'onClick'}()`,
        color: match.color,
        callback: match.callback,
        line: match.line
      };
      this.callbackQueue.push(task);
      this.setNarrator(
        'queue',
        `User clicked '${selector}'! Spawned ${task.name} into Callback Queue`,
        this.callStack.length > 0
          ? 'Call Stack is busy, so the callback waits in queue.'
          : 'Call Stack is empty, Event Loop will pick it up soon!'
      );
    }

    if (matches.length > 0) {
      this.notify();
    }
  }

  startTimers() {
    if (this.webApiInterval) clearInterval(this.webApiInterval);

    const TICK = 50;
    this.webApiInterval = setInterval(() => {
      if (this.paused || !this.running || this.viewingSnapshotIndex !== null) return;

      let changed = false;
      const expiredTimeouts = [];

      this.webApis = this.webApis.filter((api) => {
        if (api.type === 'timeout' || api.type === 'interval') {
          api.remaining = Math.max(0, api.remaining - TICK);
          changed = true;

          if (api.remaining <= 0) {
            expiredTimeouts.push(api);
            if (api.type === 'interval') {
              api.remaining = api.total;
              return true;
            }
            return false;
          }
        }
        return true;
      });

      for (const item of expiredTimeouts) {
        // Ghost animation for expired timer
        const ghostApi = { ...item, status: 'expired' };
        this.exitingApis.push(ghostApi);
        setTimeout(() => {
          this.exitingApis = this.exitingApis.filter((a) => a.id !== ghostApi.id);
          this.notify();
        }, 700);

        const task = {
          id: uid('cb'),
          type: item.type,
          name: item.name,
          color: item.color,
          callback: item.callback,
          line: item.line
        };
        this.callbackQueue.push(task);
        this.setNarrator(
          'queue',
          `Timer expired (${(item.total / 1000).toFixed(1)}s)! Moved ${item.name} to Callback Queue`,
          this.callStack.length > 0
            ? 'Call Stack is occupied. Callback must wait its turn.'
            : 'Call Stack is clear. Event Loop will pick it up!'
        );
        changed = true;
      }

      if (changed) {
        this.notify();
      }
    }, TICK);
  }

  startRenderSimulator() {
    if (this.renderQueueInterval) clearInterval(this.renderQueueInterval);

    this.renderQueueInterval = setInterval(() => {
      if (!this.simulateRenders || !this.running || this.viewingSnapshotIndex !== null) return;

      const renderId = uid('render');
      this.renderQueue.push({
        id: renderId,
        state: 'queued'
      });
      this.notify();

      setTimeout(() => {
        const item = this.renderQueue.find((r) => r.id === renderId);
        if (!item) return;

        if (this.callStack.length === 0) {
          item.state = 'rendering';
          this.notify();
          setTimeout(() => {
            this.renderQueue = this.renderQueue.filter((r) => r.id !== renderId);
            this.notify();
          }, 200);
        } else {
          item.state = 'delayed';
          this.notify();
        }
      }, 50);
    }, 1200);
  }

  async startEventLoop() {
    if (this.eventLoopRunning) return;
    this.eventLoopRunning = true;

    while (!this.aborted && this.running) {
      if (this.viewingSnapshotIndex === null && !this.paused) {
        // Event Loop Gatekeeper Condition:
        // 1. Call Stack must be EMPTY (length === 0)
        // 2. Callback Queue must have items
        if (this.callStack.length === 0 && this.callbackQueue.length > 0) {
          const nextTask = this.callbackQueue[0];
          this.eventLoopSpinning = true;
          this.setNarrator(
            'eventloop',
            `Event Loop Gate: Stack is EMPTY ➔ Shifting ${nextTask.name} into Call Stack!`,
            'The Event Loop transfers tasks from the Task Queue to the Call Stack.'
          );
          this.notify();

          // Smooth transition delay so learner sees the loop spin and pull
          await new Promise((r) => setTimeout(r, Math.min(this.delay, 500)));
          if (this.aborted || !this.running) break;

          const task = this.callbackQueue.shift();
          this.eventLoopSpinning = false;

          // Push callback frame to Call Stack
          const frame = {
            id: uid('cb_frame'),
            name: task.name,
            line: task.line,
            color: task.color,
            isCallback: true,
            status: 'active'
          };
          this.callStack.push(frame);
          this.activeLine = task.line;
          this.setNarrator(
            'stack',
            `Executing Callback ${task.name} on Call Stack`,
            `Source function invoked (Line ${task.line || '?'})`
          );
          this.notify();

          await new Promise((r) => setTimeout(r, Math.min(this.delay, 300)));
          if (this.aborted) break;

          // Execute callback
          try {
            if (typeof task.callback === 'function') {
              await task.callback();
            }
          } catch (err) {
            if (!(err instanceof AbortError)) {
              this.logConsole('error', [err.message]);
            }
          } finally {
            // Pop callback frame with ghost exit
            this.callStack = this.callStack.filter((f) => f.id !== frame.id);
            this.exitingFrames.push({ ...frame, status: 'completed' });
            setTimeout(() => {
              this.exitingFrames = this.exitingFrames.filter((f) => f.id !== frame.id);
              this.notify();
            }, 800);

            this.activeLine = null;
            this.setNarrator(
              'stack',
              `Callback ${task.name} completed and popped from Call Stack`,
              'Call Stack is empty once again.'
            );
            this.notify();
            await new Promise((r) => setTimeout(r, Math.min(this.delay, 200)));
          }
        }
      }

      await new Promise((r) => setTimeout(r, 60));
    }

    this.eventLoopRunning = false;
  }

  async run(code) {
    this.reset();
    this.aborted = false;
    this.running = true;
    this.paused = false;
    this.stepping = false;
    this.viewingSnapshotIndex = null;

    this.setNarrator('info', 'Started script execution', 'Evaluating synchronous JavaScript statements...');
    this.notify();

    this.startTimers();
    this.startRenderSimulator();
    this.startEventLoop();

    const interpreter = new Interpreter(this);
    try {
      const mainColor = '#6366f1';
      const mainFrameId = await this.pushStack('main()', 1, mainColor);
      await interpreter.run(code);
      await this.popStack(mainFrameId);
      this.activeLine = null;
      this.setNarrator(
        'info',
        'Synchronous execution finished!',
        'Main script finished. Call Stack is empty. Waiting for background Web APIs.'
      );
      this.notify();
    } catch (err) {
      if (err instanceof AbortError) return;
      this.logConsole('error', [err.message]);
      this.callStack = [];
      this.activeLine = null;
      this.setNarrator('error', `Execution error: ${err.message}`);
      this.notify();
    }
  }

  pause() {
    this.paused = true;
    this.narrator = {
      category: 'info',
      text: 'Execution paused',
      detail: 'Press Resume or use Step Forward / Step Back to inspect.',
      timestamp: Date.now()
    };
    this.notify();
  }

  resume() {
    this.paused = false;
    this.stepping = false;
    this.viewingSnapshotIndex = null;
    const resolvers = this.resumeResolvers;
    this.resumeResolvers = [];
    for (const r of resolvers) r();
    this.narrator = {
      category: 'info',
      text: 'Execution resumed',
      detail: 'Continuing step-by-step playback.',
      timestamp: Date.now()
    };
    this.notify();
  }

  step() {
    if (!this.paused) {
      this.pause();
    }
    this.stepping = true;
    const resolvers = this.resumeResolvers;
    this.resumeResolvers = [];
    for (const r of resolvers) r();
  }

  reset() {
    this.aborted = true;
    this.running = false;
    this.paused = false;
    this.stepping = false;
    this.activeLine = null;
    this.eventLoopSpinning = false;
    this.viewingSnapshotIndex = null;

    if (this.webApiInterval) {
      clearInterval(this.webApiInterval);
      this.webApiInterval = null;
    }
    if (this.renderQueueInterval) {
      clearInterval(this.renderQueueInterval);
      this.renderQueueInterval = null;
    }

    const resolvers = this.resumeResolvers;
    this.resumeResolvers = [];
    for (const r of resolvers) r();

    this.callStack = [];
    this.exitingFrames = [];
    this.webApis = [];
    this.exitingApis = [];
    this.callbackQueue = [];
    this.renderQueue = [];
    this.snapshots = [];
    this.stepIndex = 0;
    this.colorIndex = 0;
    this.taskColors.clear();

    this.narrator = {
      text: 'Execution stopped. Ready to run.',
      category: 'info',
      detail: 'Click "Save + Run" or press ⌘↵ to start.'
    };
    this.updateGatekeeper();
    this.notify();
  }
}
