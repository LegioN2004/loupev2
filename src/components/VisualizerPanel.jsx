import React from 'react';
import { 
  Layers, 
  CloudLightning, 
  ListOrdered, 
  RotateCw, 
  Clock, 
  MousePointer, 
  Monitor,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Zap
} from 'lucide-react';

export function VisualizerPanel({ state }) {
  const isEventLoopActive = state.eventLoopSpinning;
  const gate = state.gatekeeper;

  return (
    <div className="visualizer-panel">
      {/* Top Section: Call Stack + Web APIs */}
      <div className="viz-row top-row">
        {/* Call Stack Section */}
        <div className="viz-box call-stack-box">
          <div className="viz-box-header">
            <div className="viz-box-title">
              <Layers className="icon-xs" />
              <span>Call Stack</span>
              <span className="box-subhint">(LIFO: Last In, First Out)</span>
            </div>
            <span className="badge-count">{state.callStack.length}</span>
          </div>

          <div className="viz-box-content stack-content">
            {state.callStack.length === 0 && state.exitingFrames.length === 0 ? (
              <div className="viz-empty">
                <span className="viz-empty-icon">✓</span>
                <span className="viz-empty-title">Call Stack is empty</span>
                <span className="viz-empty-desc">Ready for next function or callback</span>
              </div>
            ) : (
              <div className="stack-frames-list">
                {/* Active frames in reverse order (newest on top) */}
                {state.callStack.slice().reverse().map((frame, index) => (
                  <div
                    key={frame.id}
                    className={`stack-frame-card ${index === 0 ? 'top-frame' : ''} ${
                      frame.isCallback ? 'callback-frame' : ''
                    }`}
                    style={{ borderLeftColor: frame.color || 'var(--accent-blue)' }}
                  >
                    <div className="frame-header">
                      <div className="frame-title-group">
                        <span 
                          className="frame-color-dot" 
                          style={{ backgroundColor: frame.color || 'var(--accent-blue)' }} 
                        />
                        <span className="frame-name">{frame.name}</span>
                      </div>
                      {frame.line && <span className="frame-line">Line {frame.line}</span>}
                    </div>
                    {frame.isCallback && (
                      <div className="frame-callback-pill" style={{ color: frame.color || 'var(--accent-green)' }}>
                        <Zap className="icon-xs" />
                        <span>Transferred by Event Loop</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Ghost / Completed exiting frames */}
                {state.exitingFrames.map((frame) => (
                  <div
                    key={`exit_${frame.id}`}
                    className="stack-frame-card frame-exiting"
                  >
                    <div className="frame-header">
                      <span className="frame-name">{frame.name}</span>
                      <span className="frame-status-tag">
                        <CheckCircle2 className="icon-xs text-green" />
                        <span>Popped</span>
                      </span>
                    </div>
                    {frame.returnValue && (
                      <div className="frame-return-val">Returned: {frame.returnValue}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Web APIs Section */}
        <div className="viz-box web-apis-box">
          <div className="viz-box-header">
            <div className="viz-box-title">
              <CloudLightning className="icon-xs" />
              <span>Web APIs</span>
              <span className="box-subhint">(Browser Background Threads)</span>
            </div>
            <span className="badge-count">{state.webApis.length}</span>
          </div>

          <div className="viz-box-content apis-content">
            {state.webApis.length === 0 && state.exitingApis.length === 0 ? (
              <div className="viz-empty">
                <span>No active Web APIs</span>
                <span className="viz-empty-desc">Timers & event listeners appear here</span>
              </div>
            ) : (
              <div className="apis-list">
                {state.webApis.map((api) => {
                  const progressPct =
                    api.type === 'timeout' || api.type === 'interval'
                      ? Math.max(0, Math.min(100, (api.remaining / api.total) * 100))
                      : null;

                  return (
                    <div 
                      key={api.id} 
                      className={`api-card api-${api.type}`}
                      style={{ borderLeftColor: api.color || 'var(--accent-amber)' }}
                    >
                      <div className="api-card-header">
                        <div className="api-type-tag" style={{ color: api.color || 'var(--accent-amber)' }}>
                          {api.type === 'timeout' && <Clock className="icon-xs" />}
                          {api.type === 'interval' && <RotateCw className="icon-xs" />}
                          {api.type === 'event' && <MousePointer className="icon-xs" />}
                          <span>{api.type.toUpperCase()}</span>
                        </div>
                        {progressPct !== null && (
                          <span className="api-time-remaining">
                            {(api.remaining / 1000).toFixed(1)}s remaining
                          </span>
                        )}
                      </div>

                      <div className="api-name">{api.name}</div>

                      {progressPct !== null && (
                        <div className="api-progress-bar">
                          <div
                            className="api-progress-fill"
                            style={{ 
                              width: `${progressPct}%`,
                              backgroundColor: api.color || 'var(--accent-amber)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ghost / Expired APIs moving to queue */}
                {state.exitingApis.map((api) => (
                  <div key={`exit_${api.id}`} className="api-card api-card-expired">
                    <div className="api-card-header">
                      <span className="api-name">{api.name}</span>
                      <span className="api-expired-tag">
                        <CheckCircle2 className="icon-xs text-green" />
                        <span>Expired ➔ Sent to Queue</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: The Event Loop Gatekeeper */}
      <div className="viz-row event-loop-row">
        <div className={`gatekeeper-card ${isEventLoopActive ? 'gatekeeper-active' : ''}`}>
          <div className="gatekeeper-left">
            <div className={`event-loop-spinner ${isEventLoopActive ? 'spinning' : ''}`}>
              <RotateCw className="spinner-icon" />
            </div>
            <div className="gatekeeper-branding">
              <span className="gatekeeper-title">The Event Loop</span>
              <span className="gatekeeper-role">Continuous Task Coordinator</span>
            </div>
          </div>

          <div className="gatekeeper-checks">
            <div className={`gate-check-item ${gate.isStackEmpty ? 'check-pass' : 'check-fail'}`}>
              <span className="check-label">1. Call Stack Empty?</span>
              {gate.isStackEmpty ? (
                <span className="check-badge badge-pass">
                  <CheckCircle2 className="icon-xs" /> YES
                </span>
              ) : (
                <span className="check-badge badge-fail" title={gate.stackBlockedBy ? `Busy with: ${gate.stackBlockedBy}` : 'Busy'}>
                  <XCircle className="icon-xs" /> NO (Busy)
                </span>
              )}
            </div>

            <div className={`gate-check-item ${gate.hasQueueItems ? 'check-pass' : 'check-neutral'}`}>
              <span className="check-label">2. Queue Waiting?</span>
              {gate.hasQueueItems ? (
                <span className="check-badge badge-pass">
                  <CheckCircle2 className="icon-xs" /> {state.callbackQueue.length} Task(s)
                </span>
              ) : (
                <span className="check-badge badge-neutral">0 Tasks</span>
              )}
            </div>
          </div>

          <div className="gatekeeper-status-box">
            <div className="gatekeeper-status-text">
              {gate.action === 'shifting' ? (
                <span className="text-cyan flex-center font-bold">
                  <Zap className="icon-xs fill-current" />
                  <span>Transferring callback into Call Stack!</span>
                </span>
              ) : gate.action === 'waiting_stack' ? (
                <span className="text-amber flex-center">
                  <ShieldAlert className="icon-xs" />
                  <span>Call Stack is busy — Queue must wait!</span>
                </span>
              ) : (
                <span className="text-muted">{gate.statusText}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Callback Queue (Task Queue) + Optional Render Queue */}
      <div className="viz-row bottom-row">
        {/* Callback Queue */}
        <div className="viz-box queue-box">
          <div className="viz-box-header">
            <div className="viz-box-title">
              <ListOrdered className="icon-xs" />
              <span>Callback Queue (Task Queue)</span>
              <span className="box-subhint">(FIFO: First In, First Out)</span>
            </div>
            <span className="badge-count">{state.callbackQueue.length}</span>
          </div>

          <div className="viz-box-content queue-content">
            {state.callbackQueue.length === 0 ? (
              <div className="viz-empty">
                <span>Callback Queue is empty</span>
                <span className="viz-empty-desc">Completed Web API callbacks wait here</span>
              </div>
            ) : (
              <div className="queue-list">
                {state.callbackQueue.map((cb, idx) => (
                  <div 
                    key={cb.id} 
                    className="queue-card"
                    style={{ borderTopColor: cb.color || 'var(--accent-green)' }}
                  >
                    <div className="queue-order-badge" style={{ backgroundColor: cb.color || 'var(--accent-green)' }}>
                      #{idx + 1}
                    </div>
                    <div className="queue-card-info">
                      <span className="queue-name">{cb.name}</span>
                      <span className="queue-type-badge">
                        {cb.type.toUpperCase()} • Ready for Event Loop
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Render Queue (Optional toggle) */}
        {state.simulateRenders && (
          <div className="viz-box render-queue-box">
            <div className="viz-box-header">
              <div className="viz-box-title">
                <Monitor className="icon-xs" />
                <span>Render Queue</span>
              </div>
              <span className="badge-count">{state.renderQueue.length}</span>
            </div>

            <div className="viz-box-content render-content">
              {state.renderQueue.length === 0 ? (
                <div className="viz-empty">
                  <span>Display refresh normal (60fps)</span>
                </div>
              ) : (
                <div className="render-list">
                  {state.renderQueue.map((r) => (
                    <div key={r.id} className={`render-card render-${r.state}`}>
                      <div className="render-state-label">
                        {r.state === 'queued' && 'Frame Waiting'}
                        {r.state === 'delayed' && (
                          <span className="text-red flex-center">
                            <Flame className="icon-xs" /> Render Blocked by Stack!
                          </span>
                        )}
                        {r.state === 'rendering' && 'Frame Rendered!'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
