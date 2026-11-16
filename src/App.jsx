import React, { useState, useEffect, useRef } from 'react';
import { Runtime } from './engine/runtime.js';
import { 
  DEFAULT_CODE, 
  DEFAULT_HTML, 
  decodeUrlState, 
  updateUrlQuery 
} from './engine/urlSync.js';
import { Header } from './components/Header.jsx';
import { NarratorBanner } from './components/NarratorBanner.jsx';
import { EditorPanel } from './components/EditorPanel.jsx';
import { VisualizerPanel } from './components/VisualizerPanel.jsx';
import { HelpModal } from './components/HelpModal.jsx';

export function App() {
  // Read initial code and html from URL query if present, otherwise default
  const initialData = decodeUrlState() || { code: DEFAULT_CODE, html: DEFAULT_HTML };

  const [code, setCode] = useState(initialData.code);
  const [html, setHtml] = useState(initialData.html);
  const [helpOpen, setHelpOpen] = useState(false);

  // Runtime reference
  const runtimeRef = useRef(null);
  if (!runtimeRef.current) {
    runtimeRef.current = new Runtime();
  }
  const runtime = runtimeRef.current;

  // React state synced with Runtime
  const [simState, setSimState] = useState(() => runtime.getState());

  useEffect(() => {
    const unsubscribe = runtime.subscribe((updated) => {
      setSimState(updated);
    });

    // Auto-run initially
    runtime.run(code);

    return () => {
      unsubscribe();
      runtime.reset();
    };
  }, []);

  // Save + Run
  const handleSaveAndRun = () => {
    updateUrlQuery(code, html);
    runtime.run(code);
  };

  const handlePause = () => runtime.pause();
  const handleResume = () => runtime.resume();
  const handleStep = () => runtime.step();
  const handleStop = () => runtime.reset();

  const handleDelayChange = (val) => {
    runtime.setDelay(val);
  };

  const handleSimulateRendersChange = (val) => {
    runtime.setSimulateRenders(val);
  };

  const handleDomClick = (selector, event) => {
    runtime.triggerDomEvent(selector, event);
  };

  const handleClearConsole = () => {
    runtime.clearConsole();
  };

  const handleSelectExample = (example) => {
    setCode(example.code);
    setHtml(example.html);
    updateUrlQuery(example.code, example.html);
    runtime.run(example.code);
  };

  const handleResetDefault = () => {
    setCode(DEFAULT_CODE);
    setHtml(DEFAULT_HTML);
    updateUrlQuery(DEFAULT_CODE, DEFAULT_HTML);
    runtime.run(DEFAULT_CODE);
  };

  return (
    <div className="loupe-app">
      <Header
        state={simState}
        code={code}
        html={html}
        onDelayChange={handleDelayChange}
        onSimulateRendersChange={handleSimulateRendersChange}
        onSelectExample={handleSelectExample}
        onResetDefault={handleResetDefault}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <NarratorBanner
        narrator={simState.narrator}
        stepIndex={simState.stepIndex}
        totalSteps={simState.totalSteps}
        currentStep={simState.currentStep}
        isTimeTraveling={simState.isTimeTraveling}
        onStepBack={() => runtime.stepBack()}
        onStepForward={() => runtime.stepForward()}
        onReturnToLive={() => runtime.returnToLive()}
      />

      <main className="main-workspace">
        <EditorPanel
          code={code}
          onCodeChange={setCode}
          html={html}
          onHtmlChange={setHtml}
          state={simState}
          onSaveAndRun={handleSaveAndRun}
          onPause={handlePause}
          onResume={handleResume}
          onStep={handleStep}
          onStop={handleStop}
          onDomClick={handleDomClick}
          onClearConsole={handleClearConsole}
        />

        <VisualizerPanel state={simState} />
      </main>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
