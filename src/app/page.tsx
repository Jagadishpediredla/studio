"use client";

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { generateCode } from '@/ai/flows/generate-code-from-prompt';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { compileCode, getCompilationStatus } from '@/app/actions';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep } from '@/lib/types';

import AppHeader from '@/components/app-header';
import AiControls from '@/components/ai-controls';
import Esp32Pinout from '@/components/esp32-pinout';
import CodeEditorPanel from '@/components/code-editor-panel';
import IntelligencePanel from '@/components/intelligence-panel';
import { useToast } from '@/hooks/use-toast';
import { HistorySheet } from '@/components/history-sheet';

const initialCode = `// Use the AI Controls to generate code for your ESP32
void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  Serial.println("Hello, ESP32!");
}

void loop() {
  // put your main code here, to run repeatedly:
  delay(1000);
}`;

const initialVisualizerHtml = `
<body class="bg-gray-900 text-gray-100 flex items-center justify-center h-full font-sans">
  <div class="text-center p-8 rounded-lg bg-gray-800 shadow-xl">
    <h1 class="text-3xl font-bold text-blue-400 mb-4">Initial Sketch</h1>
    <p class="text-lg">This is a basic Arduino sketch.</p>
    <div class="mt-6 text-left space-y-4">
        <div class="p-4 bg-gray-700 rounded-lg">
            <h2 class="font-semibold text-xl text-green-400">setup()</h2>
            <p>Runs once to initialize serial communication at 115200 bps.</p>
        </div>
        <div class="p-4 bg-gray-700 rounded-lg">
            <h2 class="font-semibold text-xl text-yellow-400">loop()</h2>
            <p>Runs repeatedly, pausing for 1 second in each iteration.</p>
        </div>
    </div>
    <p class="mt-8 text-sm text-gray-400">Use the AI controls to generate more complex code.</p>
  </div>
</body>
`;

export default function Home() {
  const [prompt, setPrompt] = useState<string>('Blink an LED on pin 13');
  const [code, setCode] = useState<string>(initialCode);
  const [boardInfo, setBoardInfo] = useState<BoardInfo>({ fqbn: 'esp32:esp32:esp32', libraries: [] });
  const [visualizerHtml, setVisualizerHtml] = useState<string>(initialVisualizerHtml);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    codeGen: 'pending',
    compile: 'pending',
    upload: 'pending',
    verify: 'pending',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('System Idle');
  const { toast } = useToast();
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updatePipeline = (step: keyof PipelineStatus, status: PipelineStep) => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };

  const stopStatusPolling = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
      setCurrentStatus('System Idle');
    }
  };

  const startStatusPolling = () => {
    stopStatusPolling();
    setCurrentStatus('Connecting to compilation server...');
    statusIntervalRef.current = setInterval(async () => {
      const statusRes = await getCompilationStatus();
      if (statusRes.success && statusRes.message) {
        const newStatus = statusRes.message as string;
        setCurrentStatus(prev => newStatus !== prev ? newStatus : prev);
      }
    }, 2000);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopStatusPolling();
  }, []);

  const runCompileStep = async (): Promise<boolean> => {
    updatePipeline('compile', 'processing');
    startStatusPolling();
    
    const result = await compileCode({ code, board: boardInfo });
    stopStatusPolling();

    if (result.success && result.firmware) {
      updatePipeline('compile', 'completed');
      setCurrentStatus('Compilation successful. Firmware is ready for download.');
      toast({ title: 'Success', description: 'Firmware compiled successfully.' });
      
      const byteCharacters = atob(result.firmware);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmware-${new Date().getTime()}.bin`;
      a.click();
      URL.revokeObjectURL(url);
      
      return true;
    } else {
      updatePipeline('compile', 'failed');
      const finalStatus = result.statusUpdates || [];
      setCurrentStatus(finalStatus.at(-1) || 'Compilation failed.');
      const errorDescription = (
        <div>
            <p className="font-semibold">Compilation failed. See details below:</p>
            <pre className="mt-2 w-full rounded-md bg-destructive/20 p-4 text-destructive-foreground whitespace-pre-wrap font-code text-xs">
                {result.error}
            </pre>
        </div>
      );
      toast({ 
        title: 'Compilation Failed', 
        description: errorDescription, 
        variant: 'destructive',
        duration: 20000,
      });
      return false;
    }
  };
  
  const runPlaceholderStep = (step: keyof Omit<PipelineStatus, 'codeGen' | 'compile'>): Promise<boolean> => {
    return new Promise((resolve) => {
      updatePipeline(step, 'processing');
      setCurrentStatus(`Simulating ${step} step...`);
      const duration = 1500 + Math.random() * 1000;
      setTimeout(() => {
        updatePipeline(step, 'completed');
        setCurrentStatus(`Simulated ${step} step complete.`);
        toast({ title: 'Step Complete', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step is simulated.` });
        resolve(true);
      }, duration);
    });
  };


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Prompt cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    setPipelineStatus({ codeGen: 'processing', compile: 'pending', upload: 'pending', verify: 'pending' });
    setCurrentStatus('Generating code with AI...');

    const currentHistoryItem: HistoryItem = { id: crypto.randomUUID(), code, board: boardInfo, visualizerHtml: visualizerHtml, timestamp: new Date(), prompt };
    setHistory(prev => [currentHistoryItem, ...prev]);

    try {
      const { code: newCode, board: newBoard, libraries: newLibraries } = await generateCode({ prompt });
      
      setCode(newCode);
      const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
      setBoardInfo(newBoardInfo);
      updatePipeline('codeGen', 'completed');
      setCurrentStatus('Code generation complete.');
      
      const visPromise = generateVisualExplanation({ code: newCode }).then(({ html: newVisualizerHtml }) => {
        setVisualizerHtml(newVisualizerHtml);
      });
      
      toast({ title: 'Success', description: 'New code generated. Starting deployment pipeline...' });

      // Start automated pipeline
      const compileSuccess = await runCompileStep();
      await visPromise; // Wait for visualizer to finish
      if (!compileSuccess) {
        // The compilation failed. The error is already handled in runCompileStep.
        // We just need to stop the pipeline execution here.
        return;
      }

      const uploadSuccess = await runPlaceholderStep('upload');
      if (!uploadSuccess) throw new Error('Upload failed.');

      await runPlaceholderStep('verify');

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred during the pipeline.';
      if (!message.includes('failed')) { // Avoid duplicate toasts for failed steps
        toast({ title: 'Pipeline Failed', description: message, variant: 'destructive' });
      }
      if (pipelineStatus.codeGen !== 'completed') {
        updatePipeline('codeGen', 'failed');
        setHistory(prev => prev.slice(1)); // Revert history only if code gen failed
      }
    } finally {
      setIsGenerating(false);
      stopStatusPolling();
    }
  };
  
  const handleManualAction = async (step: keyof Omit<PipelineStatus, 'codeGen'>) => {
    setIsGenerating(true);
    let success = false;
    if (step === 'compile') {
      success = await runCompileStep();
    } else {
      success = await runPlaceholderStep(step);
    }
    setIsGenerating(false);
  }

  const handleRestoreFromHistory = (item: HistoryItem) => {
    setCode(item.code);
    setBoardInfo(item.board);
    setVisualizerHtml(item.visualizerHtml);
    setPrompt(item.prompt);
    setIsHistoryOpen(false);
    toast({ title: 'Restored', description: `Restored code from ${item.timestamp.toLocaleTimeString()}` });
  };
  
  const handleDownloadCode = (code: string, timestamp: Date) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiot-studio-code-${timestamp.getTime()}.ino`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: `Code snapshot downloaded.` });
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
      <main className="grid flex-grow grid-cols-[340px_1fr_380px] grid-rows-[auto_1fr] gap-4 p-4 overflow-hidden">
        <AppHeader 
          pipelineStatus={pipelineStatus}
          onManualAction={handleManualAction}
          onShowHistory={() => setIsHistoryOpen(true)}
          isGenerating={isGenerating}
          currentStatus={currentStatus}
          className="col-span-3" 
        />
        
        <div className="row-start-2 flex h-full flex-col gap-4 overflow-hidden">
          <AiControls 
            prompt={prompt} 
            setPrompt={setPrompt} 
            onGenerate={handleGenerate} 
            isGenerating={isGenerating} 
          />
          <Esp32Pinout className="flex-grow min-h-0" />
        </div>

        <CodeEditorPanel
          className="row-start-2 flex flex-col h-full min-h-0"
          code={code}
          onCodeChange={setCode}
          boardInfo={boardInfo}
        />
        
        <IntelligencePanel
          className="row-start-2 flex flex-col h-full min-h-0"
          visualizerHtml={visualizerHtml}
        />
      </main>
      <HistorySheet 
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        history={history}
        onRestore={handleRestoreFromHistory}
        onDownload={handleDownloadCode}
      />
    </div>
  );
}
