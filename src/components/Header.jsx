import React, { useState } from 'react';
import { 
  HelpCircle, 
  Share2, 
  Check, 
  Sliders, 
  RotateCcw, 
  Layers
} from 'lucide-react';
import { EXAMPLES } from '../engine/examples.js';

export function Header({ 
  state, 
  onDelayChange, 
  onSimulateRendersChange, 
  onSelectExample, 
  onResetDefault, 
  onOpenHelp
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand">
          <span className="logo-title">loupeV2</span>
          <span className="logo-badge">Runtime Visualizer</span>
        </div>

        <div className="status-badge-container">
          {state.running ? (
            state.paused ? (
              <span className="status-badge status-paused">
                <span className="status-dot"></span> Paused
              </span>
            ) : (
              <span className="status-badge status-running">
                <span className="status-dot pulse"></span> Running
              </span>
            )
          ) : (
            <span className="status-badge status-idle">
              <span className="status-dot"></span> Ready
            </span>
          )}
        </div>
      </div>

      <div className="header-controls">
        {/* Delay Speed Slider */}
        <div className="control-group speed-control" title="Execution delay between steps">
          <Sliders className="icon-xs" />
          <span className="control-label">Delay:</span>
          <input
            type="range"
            min="50"
            max="1800"
            step="50"
            value={state.delay}
            onChange={(e) => onDelayChange(Number(e.target.value))}
            className="slider"
          />
          <span className="speed-val">{state.delay}ms</span>
        </div>

        {/* Simulate Renders Toggle */}
        <label className="control-group toggle-group" title="Simulate browser render queue ticks (demonstrates UI blocking)">
          <input
            type="checkbox"
            checked={state.simulateRenders}
            onChange={(e) => onSimulateRendersChange(e.target.checked)}
            className="toggle-checkbox"
          />
          <Layers className="icon-xs text-muted" />
          <span className="control-label no-wrap">Simulate Renders</span>
        </label>

        {/* Examples Dropdown */}
        <div className="control-group">
          <select
            className="select-examples"
            onChange={(e) => {
              const selected = EXAMPLES.find((ex) => ex.id === e.target.value);
              if (selected) onSelectExample(selected);
              e.target.value = '';
            }}
            defaultValue=""
          >
            <option value="" disabled>Load Example...</option>
            {EXAMPLES.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {/* Share Button */}
        <button 
          className="btn-icon" 
          onClick={handleShare} 
          title="Copy shareable link with current code"
        >
          {copied ? <Check className="icon-sm text-green" /> : <Share2 className="icon-sm" />}
          <span className="no-wrap">{copied ? 'Copied!' : 'Share'}</span>
        </button>

        {/* Reset Default */}
        <button 
          className="btn-icon" 
          onClick={onResetDefault} 
          title="Reset to default code"
        >
          <RotateCcw className="icon-sm" />
          <span className="no-wrap">Reset</span>
        </button>

        {/* Help Button */}
        <button 
          className="btn-icon btn-help" 
          onClick={onOpenHelp} 
          title="About Loupe and the Event Loop"
        >
          <HelpCircle className="icon-sm" />
          <span className="no-wrap">Help</span>
        </button>
      </div>
    </header>
  );
}
