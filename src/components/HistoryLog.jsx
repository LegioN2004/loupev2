import React, { useState } from 'react';
import { Layers, CloudLightning, ListOrdered, RotateCw, Terminal, Info, Filter } from 'lucide-react';

export function HistoryLog({ historyLogs }) {
  const [filter, setFilter] = useState('all');

  const filteredLogs = historyLogs.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'stack') return item.type === 'stack';
    if (filter === 'api') return item.type === 'api';
    if (filter === 'eventloop') return item.type === 'eventloop' || item.type === 'queue';
    if (filter === 'console') return item.type === 'console';
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'stack':
        return <Layers className="icon-xs text-blue" />;
      case 'api':
        return <CloudLightning className="icon-xs text-amber" />;
      case 'queue':
        return <ListOrdered className="icon-xs text-green" />;
      case 'eventloop':
        return <RotateCw className="icon-xs text-cyan" />;
      case 'console':
        return <Terminal className="icon-xs text-emerald" />;
      default:
        return <Info className="icon-xs text-muted" />;
    }
  };

  return (
    <div className="history-log-container">
      {/* Filters */}
      <div className="history-filter-bar">
        <div className="filter-title">
          <Filter className="icon-xs" />
          <span>Filter:</span>
        </div>
        <div className="filter-pills">
          <button 
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({historyLogs.length})
          </button>
          <button 
            className={`filter-pill ${filter === 'stack' ? 'active' : ''}`}
            onClick={() => setFilter('stack')}
          >
            Call Stack
          </button>
          <button 
            className={`filter-pill ${filter === 'api' ? 'active' : ''}`}
            onClick={() => setFilter('api')}
          >
            Web APIs
          </button>
          <button 
            className={`filter-pill ${filter === 'eventloop' ? 'active' : ''}`}
            onClick={() => setFilter('eventloop')}
          >
            Event Loop & Queue
          </button>
          <button 
            className={`filter-pill ${filter === 'console' ? 'active' : ''}`}
            onClick={() => setFilter('console')}
          >
            Console
          </button>
        </div>
      </div>

      {/* History Items */}
      <div className="history-items-list">
        {filteredLogs.length === 0 ? (
          <div className="history-empty">No events recorded yet. Run code to see the step history.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="history-item-row">
              <span className="history-step-num">#{log.step}</span>
              <span className="history-time">{log.time}</span>
              <div className="history-icon-badge">{getTypeIcon(log.type)}</div>
              <div className="history-text-col">
                <div className="history-title">{log.title}</div>
                {log.detail && <div className="history-detail">{log.detail}</div>}
              </div>
              {log.line && <span className="history-line-tag">Line {log.line}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
