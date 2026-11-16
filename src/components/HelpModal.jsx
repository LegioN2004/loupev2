import React from 'react';
import { X, Layers, CloudLightning, ListOrdered, RotateCw, ExternalLink } from 'lucide-react';

export function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">What is Loupe?</h2>
            <span className="modal-subtitle">JavaScript Runtime Visualizer</span>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="icon-sm" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-lead">
            Loupe is a tool to help you visualize how JavaScript is single-threaded and how its 
            <strong> Call Stack</strong>, <strong>Event Loop</strong>, <strong>Web APIs</strong>, and 
            <strong> Callback Queue</strong> interact.
          </p>

          <div className="talk-banner">
            <p>
              Based on the classic talk by <strong>Philip Roberts</strong> at JSConf EU 2014:
            </p>
            <a
              href="https://www.youtube.com/watch?v=8aGhZQkoFbQ"
              target="_blank"
              rel="noreferrer"
              className="talk-link"
            >
              <span>"What the heck is the event loop anyway?"</span>
              <ExternalLink className="icon-xs" />
            </a>
          </div>

          <div className="concepts-grid">
            <div className="concept-item">
              <div className="concept-header">
                <Layers className="icon-xs text-blue" />
                <h3>1. Call Stack (LIFO)</h3>
              </div>
              <p>
                JavaScript has a single call stack. When a function is called, it is pushed onto the stack. 
                When it returns, it is popped off.
              </p>
            </div>

            <div className="concept-item">
              <div className="concept-header">
                <CloudLightning className="icon-xs text-amber" />
                <h3>2. Web APIs</h3>
              </div>
              <p>
                Async capabilities like <code>setTimeout</code> and DOM event listeners (<code>$.on</code> / <code>addEventListener</code>) 
                run outside the JS thread. Web APIs handle countdowns and listen for user clicks.
              </p>
            </div>

            <div className="concept-item">
              <div className="concept-header">
                <ListOrdered className="icon-xs text-green" />
                <h3>3. Callback Queue (FIFO)</h3>
              </div>
              <p>
                When a timer completes or a click occurs, the Web API pushes the callback function 
                into the Callback Queue (Task Queue) where it waits its turn.
              </p>
            </div>

            <div className="concept-item">
              <div className="concept-header">
                <RotateCw className="icon-xs text-purple" />
                <h3>4. The Event Loop</h3>
              </div>
              <p>
                The Event Loop has one simple job: look at the Call Stack and look at the Callback Queue. 
                If the Call Stack is <strong>empty</strong>, it takes the first task from the Callback Queue 
                and pushes it onto the Call Stack to run!
              </p>
            </div>
          </div>

          <div className="modal-tip">
            <strong>Pro Tip:</strong> Press <kbd>⌘ + Enter</kbd> (or <kbd>Ctrl + Enter</kbd>) anytime in the editor to instantly save and run your code!
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Got it, let's explore!
          </button>
        </div>
      </div>
    </div>
  );
}
