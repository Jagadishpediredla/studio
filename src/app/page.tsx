
"use client";

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { generateCode } from '@/ai/flows/generate-code-from-prompt';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { findActiveDesktopClient, submitCompilationRequest, writeClientLog, getBuildInfo, getBinary } from '@/app/actions';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep, FirebaseStatusUpdate, StatusUpdate, CompilationJob } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';


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
    serverCheck: 'pending',
    codeGen: 'pending',
    compile: 'pending',
    upload: 'pending',
    verify: 'pending',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('System Idle');
  const [compilationLogs, setCompilationLogs] = useState<StatusUpdate[]>([]);
  const { toast } = useToast();
  
  // Refs for managing state in Firebase listeners
  const jobStateRef = useRef({
    requestId: '',
    logId: '',
    buildId: '',
    lastStatus: '',
  });
  const statusListenerUnsubscribeRef = useRef<() => void>();
  const timeoutRef = useRef<NodeJS.Timeout>();


  const updatePipeline = (step: keyof PipelineStatus, status: PipelineStep) => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };
  
  const addLog = (message: string, type: StatusUpdate['type'] = 'info') => {
    setCompilationLogs(prev => {
        const newLog: StatusUpdate = {
            message,
            type,
            timestamp: new Date().toISOString(),
        };
        // Prevent duplicate consecutive messages
        if (prev.length > 0 && prev[prev.length - 1].message === message) {
            return prev;
        }
        return [...prev, newLog];
    });
    setCurrentStatus(message);
  };


  const cleanupListeners = () => {
    if (statusListenerUnsubscribeRef.current) {
        statusListenerUnsubscribeRef.current();
        statusListenerUnsubscribeRef.current = undefined;
    }
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupListeners();
  }, []);
  
  const handleFirmwareDownload = async (buildId: string) => {
    addLog(`[CLOUD] Build complete. Requesting binary for build ${buildId}...`);
    
    const buildInfoResult = await getBuildInfo(buildId);

    if (!buildInfoResult.success || !buildInfoResult.build) {
      const errorMsg = `Download Failed: ${buildInfoResult.error || 'Could not retrieve build metadata.'}`;
      addLog(`[CLOUD] ${errorMsg}`, 'error');
      toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
      return;
    }

    const availableFiles = buildInfoResult.build.files;
    let fileType: 'hex' | 'bin' | 'elf' | undefined;
    if (availableFiles.hex) fileType = 'hex';
    else if (availableFiles.bin) fileType = 'bin';
    else if (availableFiles.elf) fileType = 'elf';
    
    if (!fileType) {
        const errorMsg = `Download Failed: No downloadable files (.hex, .bin, .elf) found in build metadata.`;
        addLog(`[CLOUD] ${errorMsg}`, 'error');
        toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
        return;
    }

    addLog(`[CLOUD] Downloading file type: ${fileType}`);
    const result = await getBinary(buildId, fileType);

    if (!result.success || !result.binary) {
      const errorMsg = `Download Failed: ${result.error || 'No binary data found.'}`;
      addLog(`[CLOUD] ${errorMsg}`, 'error');
      toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
      return;
    }
    
    const byteCharacters = atob(result.binary);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || `firmware-${new Date().getTime()}.${fileType}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const successMsg = `Firmware "${a.download}" downloaded successfully.`;
    addLog(`[CLOUD] ${successMsg}`, 'success');
    await writeClientLog(jobStateRef.current.logId, 'binaries_downloaded', 'All binaries downloaded from Firebase', { fileCount: 1, filename: a.download });
    toast({ title: 'Success', description: successMsg });
  };


  const runCompileStep = async (desktopId: string): Promise<string | null> => {
    updatePipeline('compile', 'processing');
    const logMessage = `[CLOUD] Submitting job to desktop client '${desktopId}'...`;
    addLog(logMessage);
    
    const payload = { code, board: boardInfo.fqbn, libraries: boardInfo.libraries, desktopId };
    
    const result = await submitCompilationRequest(payload);

    if (result.success && result.requestId) {
      jobStateRef.current.requestId = result.requestId;
      const firebaseLogMsg = `[FIREBASE] Wrote to /requests/${desktopId}/${result.requestId}`;
      addLog(firebaseLogMsg, 'success');
      addLog(`[CLOUD] Job submitted with ID: ${result.requestId}. Waiting for acknowledgment...`);
      // We will write the 'request_submitted' log event AFTER we get the logId
      return result.requestId;
    } else {
      updatePipeline('compile', 'failed');
      const errorMessage = result.error || 'Failed to start compilation job via Firebase.';
      addLog(`[CLOUD] Error: ${errorMessage}`, 'error');
      toast({ 
        title: 'Compilation Failed', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 20000,
      });
      return null;
    }
  };

  const monitorCompilationStatus = (requestId: string, submitTime: number) => {
    cleanupListeners();

    const statusRef = ref(database, `status/${requestId}`);
    addLog(`[CLOUD] Listening to Firebase: /status/${requestId}`);
    
    const onStatusUpdate = async (snapshot: any) => {
        const status: FirebaseStatusUpdate = snapshot.val();
        if (!status) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }

        if (!jobStateRef.current.logId && status.logId) {
            jobStateRef.current.logId = status.logId;
            jobStateRef.current.buildId = status.buildId;
            const ackMsg = `[CLOUD] Desktop client acknowledged request. Received Log ID: ${status.logId}`;
            addLog(ackMsg);
            
            // Per docs: Now that we have logId, write the client-side events
            await writeClientLog(status.logId, 'request_submitted', 'Compilation request submitted by client', {
                codeLength: code.length,
                board: boardInfo.fqbn,
            });
            await writeClientLog(status.logId, 'acknowledgment_received', 'Desktop client acknowledged request', {
                responseTime: Date.now() - submitTime,
                clientId: status.clientId
            });
        }
        
        if (status.status !== jobStateRef.current.lastStatus && jobStateRef.current.logId) {
            jobStateRef.current.lastStatus = status.status;
             await writeClientLog(jobStateRef.current.logId, `status_update_${status.status}`, `Status: ${status.message}`, {
                progress: status.progress,
                iteration: status.iteration,
                elapsedTime: status.elapsedTime
            });
        }

        const serverLog = `[DESKTOP] [${status.phase}] ${status.status} (${status.progress}%) - ${status.message}`;
        addLog(serverLog, status.status === 'failed' ? 'error' : 'info');

        if (status.status === 'completed') {
            cleanupListeners();
            updatePipeline('compile', 'completed');
            addLog('[DESKTOP] Compilation successful. Fetching build information...', 'success');
            
            const buildId = jobStateRef.current.buildId || status.buildId;
            if (buildId) {
              await writeClientLog(jobStateRef.current.logId, 'job_completed', 'Job completed successfully on desktop client');
              await handleFirmwareDownload(buildId);
              const uploadSuccess = await runPlaceholderStep('upload');
              if (uploadSuccess) {
                await runPlaceholderStep('verify');
              }
            } else {
               updatePipeline('compile', 'failed');
               const errorMsg = 'Compilation completed but no buildId was found.';
               addLog(`[CLOUD] Error: ${errorMsg}`, 'error');
               toast({ title: 'Build Info Failed', description: errorMsg, variant: 'destructive' });
            }
            setIsGenerating(false);

        } else if (status.status === 'failed') {
            cleanupListeners();
            updatePipeline('compile', 'failed');
            const errorDescription = (
                <div>
                    <p className="font-semibold">Compilation failed. See details below:</p>
                    <pre className="mt-2 w-full rounded-md bg-destructive/20 p-4 text-destructive-foreground whitespace-pre-wrap font-code text-xs">
                        {status.message}
                    </pre>
                </div>
            );
            if (jobStateRef.current.logId) {
              await writeClientLog(jobStateRef.current.logId, 'job_failed', 'Job failed on desktop client', { error: status.message, errorDetails: status.errorDetails });
            }
            toast({ title: 'Compilation Failed', description: errorDescription, variant: 'destructive', duration: 20000 });
            setIsGenerating(false);
        }
    };
    
    statusListenerUnsubscribeRef.current = onValue(statusRef, onStatusUpdate, (error) => {
        cleanupListeners();
        updatePipeline('compile', 'failed');
        const errorMsg = `Firebase listener error: ${error.message}`;
        addLog(`[FIREBASE] Error: ${errorMsg}`, 'error');
        toast({ title: 'Real-time Error', description: errorMsg, variant: 'destructive' });
        setIsGenerating(false);
    });

    timeoutRef.current = setTimeout(() => {
        cleanupListeners();
        // Only fail if it's still in a processing state
        setPipelineStatus(prev => {
            if (prev.compile === 'processing' || prev.compile === 'pending') {
                const errorMsg = 'Job timed out after 3 minutes. The desktop client did not respond or complete in time.';
                addLog(`[CLOUD] Error: ${errorMsg}`, 'error');
                if (jobStateRef.current.logId) {
                    writeClientLog(jobStateRef.current.logId, 'timeout', 'Job timeout after 3 minutes');
                } else {
                     // If we don't even have a logId, we can't write a log.
                     console.error("Timeout occurred before logId was received.");
                }
                toast({ title: 'Job Timeout', description: errorMsg, variant: 'destructive' });
                setIsGenerating(false);
                return { ...prev, compile: 'failed' };
            }
            return prev;
        });
    }, 180000); // 180 seconds = 3 minutes
  };
  
  const runPlaceholderStep = (step: keyof Omit<PipelineStatus, 'codeGen' | 'compile' | 'serverCheck'>): Promise<boolean> => {
    return new Promise((resolve) => {
      updatePipeline(step, 'processing');
      addLog(`[CLOUD] Simulating ${step} step...`);
      const duration = 1500 + Math.random() * 1000;
      setTimeout(() => {
        updatePipeline(step, 'completed');
        addLog(`[CLOUD] Simulated ${step} step complete.`, 'success');
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
    setPipelineStatus({ serverCheck: 'pending', codeGen: 'pending', compile: 'pending', upload: 'pending', verify: 'pending' });
    setCompilationLogs([]);
    jobStateRef.current = { requestId: '', logId: '', buildId: '', lastStatus: ''};
    
    addLog('[CLOUD] Starting pipeline...');
    
    updatePipeline('serverCheck', 'processing');
    addLog('[CLOUD] Checking for online desktop clients...');
    const health = await findActiveDesktopClient();

    if (!health.success || !health.clientId) {
      updatePipeline('serverCheck', 'failed');
      const errorMessage = health.error || 'No online desktop clients found.';
      addLog(`[CLOUD] Error: ${errorMessage}`, 'error');
      toast({ title: 'Health Check Failed', description: errorMessage, variant: 'destructive', duration: 20000 });
      setIsGenerating(false);
      return;
    }
    updatePipeline('serverCheck', 'completed');
    addLog(`[FIREBASE] Found online client: ${health.clientId}.`, 'success');

    updatePipeline('codeGen', 'processing');
    addLog('[CLOUD] Generating code with AI...');

    const currentHistoryItem: HistoryItem = { id: crypto.randomUUID(), code, board: boardInfo, visualizerHtml: visualizerHtml, timestamp: new Date(), prompt };
    setHistory(prev => [currentHistoryItem, ...prev]);

    try {
      const { code: newCode, board: newBoard, libraries: newLibraries } = await generateCode({ prompt });
      
      setCode(newCode);
      const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
      setBoardInfo(newBoardInfo);
      updatePipeline('codeGen', 'completed');
      
      addLog('[CLOUD] Code generation complete.', 'success');
      
      const visPromise = generateVisualExplanation({ code: newCode }).then(({ html: newVisualizerHtml }) => {
        setVisualizerHtml(newVisualizerHtml);
        addLog('[CLOUD] AI Visualizer updated.', 'success');

      });
      
      toast({ title: 'Success', description: 'New code generated. Starting deployment pipeline...' });

      const submitTime = Date.now();
      const requestId = await runCompileStep(health.clientId);
      await visPromise;

      if (requestId) {
        monitorCompilationStatus(requestId, submitTime);
      } else {
        setIsGenerating(false);
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred during the pipeline.';
      if (pipelineStatus.codeGen !== 'completed') {
        updatePipeline('codeGen', 'failed');
        setHistory(prev => prev.slice(1));
      }
      addLog(`[CLOUD] Pipeline Failed: ${message}`, 'error');
      toast({ title: 'Pipeline Failed', description: message, variant: 'destructive' });
      setIsGenerating(false);
      cleanupListeners();
    }
  };
  
  const handleTestConnection = async () => {
    toast({ title: 'Testing Connection', description: 'Checking connection to Firebase and desktop bridge...' });
    const health = await findActiveDesktopClient();
    if (health.success && health.clientId) {
      toast({ title: 'Connection Successful', description: `Successfully connected to desktop client: ${health.clientId}` });
    } else {
      toast({ title: 'Connection Failed', description: health.error || 'Could not connect to desktop client.', variant: 'destructive' });
    }
  };

  const handleManualAction = async (step: keyof Omit<PipelineStatus, 'codeGen'> | 'testConnection') => {
    setIsGenerating(true);
    setCompilationLogs([]);
    jobStateRef.current = { requestId: '', logId: '', buildId: '', lastStatus: ''};

    if (step === 'compile') {
      const health = await findActiveDesktopClient();
      if (!health.success || !health.clientId) {
         toast({ title: 'No Clients Ready', description: health.error || 'No online desktop clients found.', variant: 'destructive' });
         setIsGenerating(false);
         return;
      }
      const submitTime = Date.now();
      const requestId = await runCompileStep(health.clientId);
      if (requestId) {
        monitorCompilationStatus(requestId, submitTime);
      } else {
        setIsGenerating(false);
      }
    } else if (step === 'testConnection') {
      await handleTestConnection();
      setIsGenerating(false);
    } else if (step !== 'serverCheck') {
      await runPlaceholderStep(step);
      setIsGenerating(false);
    } else {
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
