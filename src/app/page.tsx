"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { generateCode } from '@/ai/flows/generate-code-from-prompt';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
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

const initialExplanation = "This is a basic Arduino sketch. The `setup()` function runs once at the beginning to initialize serial communication. The `loop()` function runs repeatedly, doing nothing but waiting for one second in each iteration. Use the AI controls to generate more complex code.";

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
  const { toast } = useToast();

  const updatePipeline = (step: keyof PipelineStatus, status: PipelineStep) => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };

  const runPipelineStep = (step: keyof Omit<PipelineStatus, 'codeGen'>): Promise<boolean> => {
    return new Promise((resolve) => {
      updatePipeline(step, 'processing');
      const duration = 1500 + Math.random() * 1500;
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        if (success) {
          updatePipeline(step, 'completed');
          toast({ title: 'Success', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step completed.` });
          resolve(true);
        } else {
          updatePipeline(step, 'failed');
          toast({ title: 'Failed', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step failed.`, variant: 'destructive' });
          resolve(false);
        }
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

    const currentHistoryItem: HistoryItem = { id: crypto.randomUUID(), code, board: boardInfo, visualizerHtml: visualizerHtml, timestamp: new Date(), prompt };
    setHistory(prev => [currentHistoryItem, ...prev]);

    try {
      const { code: newCode, board: newBoard, libraries: newLibraries } = await generateCode({ prompt });
      
      setCode(newCode);
      const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
      setBoardInfo(newBoardInfo);
      
      const { html: newVisualizerHtml } = await generateVisualExplanation({ code: newCode });
      setVisualizerHtml(newVisualizerHtml);
      
      updatePipeline('codeGen', 'completed');
      toast({ title: 'Success', description: 'New code generated. Starting deployment pipeline...' });

      // Start automated pipeline
      const compileSuccess = await runPipelineStep('compile');
      if (!compileSuccess) throw new Error('Compilation failed.');

      const uploadSuccess = await runPipelineStep('upload');
      if (!uploadSuccess) throw new Error('Upload failed.');

      await runPipelineStep('verify');

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
    }
  };

  const handleManualCompile = async (step: keyof Omit<PipelineStatus, 'codeGen'>) => {
    setIsGenerating(true);
    await runPipelineStep(step);
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
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      <main className="grid flex-grow grid-cols-[340px_1fr_380px] grid-rows-[auto_1fr] gap-4 p-4 overflow-hidden">
        <AppHeader 
          pipelineStatus={pipelineStatus} 
          onCompile={handleManualCompile}
          onShowHistory={() => setIsHistoryOpen(true)}
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
          setCode={setCode}
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
