import React from 'react';
import { 
  Layers, 
  CloudLightning, 
  ListOrdered, 
  RotateCw, 
  Terminal, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  History,
  RotateCcw
} from 'lucide-react';

export function NarratorBanner({ 
  narrator, 
  stepIndex, 
  totalSteps, 
  currentStep, 
  isTimeTraveling, 
  onStepBack, 
  onStepForward,
  onReturnToLive 
}) {
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'stack':
        return { label: 'Call Stack', icon: Layers, colorClass: 'badge-stack' };
      case 'api':
        return { label: 'Web APIs', icon: CloudLightning, colorClass: 'badge-api' };
      case 'queue':
        return { label: 'Callback Queue', icon: ListOrdered, colorClass: 'badge-queue' };
      case 'eventloop':
        return { label: 'Event Loop', icon: RotateCw, colorClass: 'badge-eventloop' };
      case 'console':
        return { label: 'Console', icon: Terminal, colorClass: 'badge-console' };
      default:
        return { label: 'Runtime', icon: Info, colorClass: 'badge-info' };
    }
  };

  const meta = getCategoryMeta(narrator.category);
  const Icon = meta.icon;

  return (
    <div className={`narrator-banner ${isTimeTraveling ? 'time-travel-active' : ''}`}>
      <div className="narrator-left">
        <div className={`narrator-category-badge ${meta.colorClass}`}>
          <Icon className="icon-xs" />
          <span>{meta.label}</span>
        </div>

        <div className="narrator-text-group">
          <div className="narrator-headline">{narrator.text}</div>
          {narrator.detail && (
            <div className="narrator-subline">{narrator.detail}</div>
          )}
        </div>
      </div>

      <div className="narrator-right">
        {isTimeTraveling && (
          <button 
            className="btn-return-live" 
            onClick={onReturnToLive} 
            title="Return to live execution"
          >
            <RotateCcw className="icon-xs" />
            <span>Return to Live</span>
          </button>
        )}

        {totalSteps > 0 && (
          <div className="step-timeline-controls">
            <button
              className="btn-timeline-step"
              onClick={onStepBack}
              disabled={currentStep <= 1}
              title="Step backward in history (Previous state)"
            >
              <ChevronLeft className="icon-sm" />
              <span>Back</span>
            </button>

            <div className="timeline-step-badge" title="Current step / Total steps">
              <History className="icon-xs text-muted" />
              <span>Step {currentStep} of {totalSteps}</span>
            </div>

            <button
              className="btn-timeline-step"
              onClick={onStepForward}
              title="Step forward"
            >
              <span>Next</span>
              <ChevronRight className="icon-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
