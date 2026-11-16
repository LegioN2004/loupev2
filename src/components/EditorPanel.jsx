import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  StepForward, 
  Terminal, 
  Code2, 
  Globe, 
  Edit3, 
  Eye, 
  Trash2,
  History
} from 'lucide-react';
import { HistoryLog } from './HistoryLog.jsx';

export function EditorPanel({
  code,
  onCodeChange,
  html,
  onHtmlChange,
  state,
  onSaveAndRun,
  onPause,
  onResume,
  onStep,
  onStop,
  onDomClick,
  onClearConsole
}) {
  const [htmlEditing, setHtmlEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'html'
  const [bottomTab, setBottomTab] = useState('console'); // 'console' | 'history'
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const scratchpadContainerRef = useRef(null);

  const lines = code.split('\n');

  // Sync scrolling between line numbers and textarea
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to Save & Run, Tab support
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSaveAndRun();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onCodeChange(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Attach event handlers inside scratchpad HTML
  useEffect(() => {
    const container = scratchpadContainerRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const target = e.target;
      if (target && target !== container) {
        let selector = target.tagName.toLowerCase();
        if (target.id) {
          selector = `#${target.id}`;
        } else if (target.className) {
          selector = `.${target.className.split(' ')[0]}`;
        }
        onDomClick(selector, 'click');
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html, onDomClick]);

  return (
    <div className="editor-panel">
      {/* Editor Toolbar */}
      <div className="panel-toolbar">
        <div className="toolbar-actions">
          <button
            className="btn btn-primary btn-save-run"
            onClick={onSaveAndRun}
            title="Save and run simulation (⌘ + Enter)"
          >
            <Play className="icon-xs fill-current" />
            <span className="no-wrap">Save + Run</span>
            <kbd className="kbd-shortcut">⌘↵</kbd>
          </button>

          {state.running && (
            <div className="run-controls-group">
              {state.paused ? (
                <button
                  className="btn btn-secondary btn-control"
                  onClick={onResume}
                  title="Resume execution"
                >
                  <Play className="icon-xs fill-current text-green" />
                  <span className="no-wrap">Resume</span>
                </button>
              ) : (
                <button
                  className="btn btn-secondary btn-control"
                  onClick={onPause}
                  title="Pause execution"
                >
                  <Pause className="icon-xs fill-current text-amber" />
                  <span className="no-wrap">Pause</span>
                </button>
              )}

              <button
                className="btn btn-secondary btn-control"
                onClick={onStep}
                title="Step forward one statement"
              >
                <StepForward className="icon-xs" />
                <span className="no-wrap">Step</span>
              </button>

              <button
                className="btn btn-secondary btn-control text-red"
                onClick={onStop}
                title="Stop execution"
              >
                <Square className="icon-xs fill-current" />
                <span className="no-wrap">Stop</span>
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-tabs">
          <button
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <Code2 className="icon-xs" />
            <span className="no-wrap">JavaScript</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
            onClick={() => setActiveTab('html')}
          >
            <Globe className="icon-xs" />
            <span className="no-wrap">HTML Scratchpad</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="editor-content-area">
        {activeTab === 'editor' ? (
          <div className="code-editor-container">
            {/* Line numbers column */}
            <div className="line-numbers" ref={lineNumbersRef}>
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const isActive = state.activeLine === lineNum;
                return (
                  <div 
                    key={lineNum} 
                    className={`line-num ${isActive ? 'active-line-num' : ''}`}
                  >
                    {isActive ? <span className="active-arrow">▶</span> : lineNum}
                  </div>
                );
              })}
            </div>

            {/* Code textarea */}
            <div className="textarea-wrapper">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                className="code-textarea"
                placeholder="Write or paste your JavaScript code here..."
              />
            </div>
          </div>
        ) : (
          <div className="html-scratchpad-panel">
            <div className="scratchpad-header">
              <span className="section-title">
                {htmlEditing ? 'Edit Scratchpad HTML' : 'Live Interactive Scratchpad'}
              </span>
              <button
                className="btn-text"
                onClick={() => setHtmlEditing(!htmlEditing)}
              >
                {htmlEditing ? (
                  <>
                    <Eye className="icon-xs" />
                    <span>View Live</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="icon-xs" />
                    <span>Edit HTML</span>
                  </>
                )}
              </button>
            </div>

            {htmlEditing ? (
              <textarea
                value={html}
                onChange={(e) => onHtmlChange(e.target.value)}
                className="html-textarea"
                placeholder="Enter HTML (e.g. <button>Click me</button>)..."
                spellCheck="false"
              />
            ) : (
              <div className="scratchpad-interactive-view">
                <div 
                  ref={scratchpadContainerRef}
                  className="interactive-dom-root"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                <p className="scratchpad-hint">
                  Click the elements above to trigger DOM event callbacks!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Panel: Console / Event History Log */}
      <div className="bottom-dock-panel">
        <div className="dock-header">
          <div className="dock-tabs">
            <button
              className={`dock-tab ${bottomTab === 'console' ? 'active' : ''}`}
              onClick={() => setBottomTab('console')}
            >
              <Terminal className="icon-xs" />
              <span>Console</span>
              {state.consoleLogs.length > 0 && (
                <span className="badge-count">{state.consoleLogs.length}</span>
              )}
            </button>

            <button
              className={`dock-tab ${bottomTab === 'history' ? 'active' : ''}`}
              onClick={() => setBottomTab('history')}
            >
              <History className="icon-xs" />
              <span>Event History Log</span>
              {state.historyLogs.length > 0 && (
                <span className="badge-count badge-accent">{state.historyLogs.length}</span>
              )}
            </button>
          </div>

          {bottomTab === 'console' && state.consoleLogs.length > 0 && (
            <button 
              className="btn-icon-xs" 
              onClick={onClearConsole} 
              title="Clear console"
            >
              <Trash2 className="icon-xs" />
            </button>
          )}
        </div>

        <div className="dock-body">
          {bottomTab === 'console' ? (
            <div className="console-body">
              {state.consoleLogs.length === 0 ? (
                <div className="console-empty">No console output yet. Runs console.log(...) here.</div>
              ) : (
                <div className="console-entries">
                  {state.consoleLogs.map((log) => (
                    <div key={log.id} className={`console-row console-${log.type}`}>
                      <span className="console-time">{log.time}</span>
                      {log.line && <span className="console-line">L{log.line}</span>}
                      <span className="console-arrow">›</span>
                      <span className="console-message">{log.args.join(' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <HistoryLog historyLogs={state.historyLogs} />
          )}
        </div>
      </div>
    </div>
  );
}
