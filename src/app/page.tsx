"use client";

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { generateCode } from '@/ai/flows/generate-code-from-prompt';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { checkServerHealth, startCompilation } from '@/app/actions';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep, CompilationJob } from '@/lib/types';

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
  const [compilationLogs, setCompilationLogs] = useState<string[]>(['Compilation logs will appear here.']);
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  const updatePipeline = (step: keyof PipelineStatus, status: PipelineStep) => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopStreaming();
  }, []);
  
  const handleFirmwareDownload = (job: CompilationJob) => {
    if (!job.result?.binary) {
      toast({ title: 'Download Failed', description: 'No binary data found in compilation result.', variant: 'destructive' });
      return;
    }
    
    const byteCharacters = atob(job.result.binary);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.result.filename || `firmware-${new Date().getTime()}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCurrentStatus('Firmware downloaded successfully.');
    toast({ title: 'Success', description: `Firmware "${a.download}" downloaded.` });
  };


  const runCompileStep = async (): Promise<string | null> => {
    updatePipeline('compile', 'processing');
    setCurrentStatus('Starting compilation job...');
    const payload = { code, board: boardInfo };
    setCompilationLogs(prev => [...prev, 'Sending code to compilation server...', `Payload: ${JSON.stringify(payload, null, 2)}`]);
    
    const result = await startCompilation(payload);

    if (result.success && result.jobId) {
      const logMessage = `Compilation job started with ID: ${result.jobId}`;
      setCurrentStatus(logMessage);
      setCompilationLogs(prev => [...prev, logMessage]);
      return result.jobId;
    } else {
      updatePipeline('compile', 'failed');
      const errorMessage = result.error || 'Failed to start compilation job.';
      setCurrentStatus(`Error: ${errorMessage}`);
      setCompilationLogs(prev => [...prev, `Error: ${errorMessage}`]);
      toast({ 
        title: 'Compilation Failed', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 20000,
      });
      return null;
    }
  };

  const streamCompilationStatus = (jobId: string) => {
    stopStreaming();
    const API_URL = process.env.NEXT_PUBLIC_COMPILATION_API_URL || 'http://localhost:3001';
    const API_KEY = process.env.NEXT_PUBLIC_COMPILATION_API_KEY;
    
    if (!API_KEY) {
      const errorMsg = "Compilation API key is not configured on the client.";
      console.error(errorMsg);
      updatePipeline('compile', 'failed');
      setCurrentStatus(errorMsg);
      setCompilationLogs(prev => [...prev, `Error: ${errorMsg}`]);
      toast({ title: 'Configuration Error', description: errorMsg, variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    const url = `${API_URL}/compile/status/${jobId}/stream?apiKey=${encodeURIComponent(API_KEY)}`;

    eventSourceRef.current = new EventSource(url);
    
    setCompilationLogs(prev => [...prev, `Opening real-time stream to: ${url.replace(API_KEY, '****')}`]);


    eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { job } = data;

        if (job) {
            setCompilationLogs(job.statusUpdates || ['Waiting for server logs...']);
            setCurrentStatus(`Job ${job.id}: ${job.status}...`);

            if (data.type === 'end') {
                stopStreaming();
                if (job.status === 'completed') {
                    updatePipeline('compile', 'completed');
                    setCurrentStatus('Compilation successful. Firmware is ready.');
                    handleFirmwareDownload(job);
                    
                    // Continue with the rest of the pipeline
                    (async () => {
                      const uploadSuccess = await runPlaceholderStep('upload');
                      if (uploadSuccess) {
                        await runPlaceholderStep('verify');
                      }
                      setIsGenerating(false);
                    })();
                } else if (job.status === 'failed') {
                    updatePipeline('compile', 'failed');
                    const errorMsg = job.error || 'An unknown compilation error occurred.';
                    setCurrentStatus(`Compilation Failed: ${errorMsg}`);
                    const errorDescription = (
                        <div>
                            <p className="font-semibold">Compilation failed. See details below:</p>
                            <pre className="mt-2 w-full rounded-md bg-destructive/20 p-4 text-destructive-foreground whitespace-pre-wrap font-code text-xs">
                                {errorMsg}
                            </pre>
                        </div>
                    );
                    toast({ title: 'Compilation Failed', description: errorDescription, variant: 'destructive', duration: 20000 });
                    setIsGenerating(false);
                }
            }
        }
    };

    eventSourceRef.current.onerror = (err) => {
        console.error('EventSource failed:', err);
        stopStreaming();
        updatePipeline('compile', 'failed');
        const errorMsg = 'Connection to compilation stream lost. Check server logs and network.';
        setCurrentStatus(errorMsg);
        setCompilationLogs(prev => [...prev, `Error: ${errorMsg}`]);
        toast({ title: 'Stream Error', description: errorMsg, variant: 'destructive' });
        setIsGenerating(false);
    };
  };
  
  const runPlaceholderStep = (step: keyof Omit<PipelineStatus, 'codeGen' | 'compile'>): Promise<boolean> => {
    return new Promise((resolve) => {
      updatePipeline(step, 'processing');
      const statusMsg = `Simulating ${step} step...`;
      setCurrentStatus(statusMsg);
      setCompilationLogs(prev => [...prev, statusMsg]);
      const duration = 1500 + Math.random() * 1000;
      setTimeout(() => {
        updatePipeline(step, 'completed');
        const completeMsg = `Simulated ${step} step complete.`;
        setCurrentStatus(completeMsg);
        setCompilationLogs(prev => [...prev, completeMsg]);
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
    setCompilationLogs(['AI is generating code...']);

    // --- Pre-flight Health Check ---
    setCurrentStatus('Checking compilation server connection...');
    setCompilationLogs(prev => [...prev, 'Pinging compilation server...']);
    const health = await checkServerHealth();

    if (!health.success) {
      const errorMessage = health.error || 'Compilation server is unreachable.';
      setCurrentStatus(errorMessage);
      setCompilationLogs(prev => [...prev, `Error: ${errorMessage}`]);
      toast({ title: 'Server Not Ready', description: errorMessage, variant: 'destructive', duration: 20000 });
      setIsGenerating(false);
      setPipelineStatus({ codeGen: 'pending', compile: 'failed', upload: 'pending', verify: 'pending' });
      return;
    }
    setCurrentStatus('Server connection established.');
    setCompilationLogs(prev => [...prev, 'Server is healthy.']);
    // --- End Health Check ---


    const currentHistoryItem: HistoryItem = { id: crypto.randomUUID(), code, board: boardInfo, visualizerHtml: visualizerHtml, timestamp: new Date(), prompt };
    setHistory(prev => [currentHistoryItem, ...prev]);

    try {
      const { code: newCode, board: newBoard, libraries: newLibraries } = await generateCode({ prompt });
      
      setCode(newCode);
      const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
      setBoardInfo(newBoardInfo);
      updatePipeline('codeGen', 'completed');
      setCurrentStatus('Code generation complete.');
      setCompilationLogs(prev => [...prev, 'Code generation successful.']);
      
      const visPromise = generateVisualExplanation({ code: newCode }).then(({ html: newVisualizerHtml }) => {
        setVisualizerHtml(newVisualizerHtml);
      });
      
      toast({ title: 'Success', description: 'New code generated. Starting deployment pipeline...' });

      // Start automated pipeline
      const jobId = await runCompileStep();
      await visPromise; // Wait for visualizer to finish

      if (jobId) {
        streamCompilationStatus(jobId);
      } else {
        // Compilation failed to start, stop the process
        setIsGenerating(false);
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred during the pipeline.';
      if (pipelineStatus.codeGen !== 'completed') {
        updatePipeline('codeGen', 'failed');
        setHistory(prev => prev.slice(1)); // Revert history only if code gen failed
      }
      toast({ title: 'Pipeline Failed', description: message, variant: 'destructive' });
      setIsGenerating(false);
      stopStreaming();
    }
  };
  
  const handleManualAction = async (step: keyof Omit<PipelineStatus, 'codeGen'>) => {
    setIsGenerating(true);
    if (step === 'compile') {
      const jobId = await runCompileStep();
      if (jobId) {
        streamCompilationStatus(jobId);
      } else {
        setIsGenerating(false);
      }
    } else {
      await runPlaceholderStep(step);
      setIsGenerating(false);
    }
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
          compilationLogs={compilationLogs}
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
