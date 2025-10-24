
"use client";

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { aideChat } from '@/ai/flows/aide-chat-flow';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { analyzeCodeForExplanation } from '@/ai/flows/analyze-code-for-explanation';
import { findActiveDesktopClient, submitCompilationRequest, writeClientLog, getBuildInfo, getBinary } from '@/app/actions';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep, FirebaseStatusUpdate, StatusUpdate, ChatMessage, BuildInfo } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { AITool } from 'genkit/ai';

import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppHeader from '@/components/app-header';
import AiControls from '@/components/ai-controls';
import CodeEditorPanel from '@/components/code-editor-panel';
import IntelligencePanel from '@/components/intelligence-panel';
import { useToast } from '@/hooks/use-toast';
import { HistorySheet } from '@/components/history-sheet';
import DeploymentPipeline from '@/components/deployment-pipeline';
import StatusIndicator from '@/components/status-indicator';

const initialCode = `// Welcome to your AIDE Project!
// Use the AI Chat to start building.
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`;

const initialVisualizerHtml = `
<body class="bg-gray-900 text-gray-100 flex items-center justify-center h-full font-sans">
  <div class="text-center p-8 rounded-lg bg-gray-800 shadow-xl">
    <h1 class="text-3xl font-bold text-blue-400 mb-4">AIDE Project Initialized</h1>
    <p class="text-lg">Your agentic IDE is ready. Start by chatting with the AI.</p>
  </div>
</body>
`;

export default function AidePage() {
  const [prompt, setPrompt] = useState<string>('');
  const [code, setCode] = useState<string>(initialCode);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your AI pair programmer, AIDE. I can write code, explain it, and compile it for you. How can I help?" }
  ]);
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
  const [currentStatus, setCurrentStatus] = useState('Awaiting instructions...');
  const [compilationLogs, setCompilationLogs] = useState<StatusUpdate[]>([]);
  const { toast } = useToast();
  
  const jobStateRef = useRef({
    requestId: '',
    logId: '',
    buildId: '',
    lastStatus: '',
    historyId: '',
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
        // Avoid duplicate consecutive logs
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
  
  useEffect(() => {
    return () => cleanupListeners();
  }, []);
  
  const handleFirmwareDownload = async (buildId: string, historyId?: string): Promise<{ success: boolean, filename?: string, fileType?: string }> => {
    addLog(`[CLOUD] Build complete. Requesting binary for build ${buildId}...`);
    
    const buildInfoResult = await getBuildInfo(buildId);

    if (!buildInfoResult.success || !buildInfoResult.build) {
      const errorMsg = `Download Failed: ${buildInfoResult.error || 'Could not retrieve build metadata.'}`;
      addLog(`[CLOUD] ${errorMsg}`, 'error');
      toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
      return { success: false };
    }
    
    const build: BuildInfo = buildInfoResult.build;

    let primaryFile: { filename: string, downloadUrl?: string } | null = null;
    let fileType: 'bin' | 'hex' | 'elf' | undefined;

    if (build.files?.bin) {
        primaryFile = build.files.bin;
        fileType = 'bin';
    } else if (build.files?.hex) {
        primaryFile = build.files.hex;
        fileType = 'hex';
    } else if (build.files?.elf) {
        primaryFile = build.files.elf;
        fileType = 'elf';
    }

    if (!primaryFile || !fileType) {
        const errorMsg = `Download Failed: No downloadable files (.bin, .hex) found in build metadata.`;
        addLog(`[CLOUD] ${errorMsg}`, 'error');
        toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
        return { success: false };
    }
    
    const filename = primaryFile.filename;

    if (build.storage === 'github' && primaryFile.downloadUrl) {
        addLog(`[GITHUB] Downloading from GitHub: ${filename}`);
        const a = document.createElement('a');
        a.href = primaryFile.downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } 
    else {
        addLog(`[FIREBASE] Downloading from Firebase: ${filename}`);
        const result = await getBinary(buildId, fileType);
        if (!result.success || !result.binary) {
          const errorMsg = `Download Failed: ${result.error || 'No binary data found.'}`;
          addLog(`[CLOUD] ${errorMsg}`, 'error');
          toast({ title: 'Download Failed', description: errorMsg, variant: 'destructive' });
          return { success: false };
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
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const successMsg = `Firmware "${filename}" downloaded successfully.`;
    addLog(`[CLOUD] ${successMsg}`, 'success');
    if (jobStateRef.current.logId) {
      await writeClientLog(jobStateRef.current.logId, 'binaries_downloaded', 'All binaries downloaded from Firebase', { fileCount: 1, filename: filename });
    }
    toast({ title: 'Success', description: successMsg });

    if (historyId) {
      setHistory(prev => prev.map(item => 
        item.id === historyId 
        ? { ...item, buildId, binary: { filename, fileType: fileType! } } 
        : item
      ));
    }
    
    return { success: true, filename, fileType };
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
            const ackMsg = `[CLOUD] Desktop client acknowledged. Log ID: ${status.logId}`;
            addLog(ackMsg);
            
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
              if (jobStateRef.current.logId) {
                await writeClientLog(jobStateRef.current.logId, 'job_completed', 'Job completed successfully on desktop client');
              }
              await handleFirmwareDownload(buildId, jobStateRef.current.historyId);
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
                    <p className="font-semibold">Compilation failed. Retrying with AI...</p>
                    <pre className="mt-2 w-full rounded-md bg-destructive/20 p-4 text-destructive-foreground whitespace-pre-wrap font-code text-xs">
                        {status.message}
                    </pre>
                </div>
            );

            if (jobStateRef.current.logId) {
              await writeClientLog(jobStateRef.current.logId, 'job_failed', 'Job failed on desktop client', { error: status.message, errorDetails: status.errorDetails });
            }
            toast({ title: 'Compilation Failed', description: errorDescription, variant: 'destructive', duration: 10000 });
            
            // AUTOMATED ERROR FIXING LOOP
            const retryPrompt = `The compilation failed with the following error. Please analyze this error, fix the code, and then start the compilation again. Error: \n\n${status.message}`;
            addLog('[AIDE] Compilation failed. Asking AI to fix the code...', 'error');
            handleSendMessage(retryPrompt);
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
        setPipelineStatus(prev => {
            if (prev.compile === 'processing' || prev.compile === 'pending') {
                const errorMsg = 'Job timed out after 3 minutes. The desktop client did not respond or complete in time.';
                addLog(`[CLOUD] Error: ${errorMsg}`, 'error');
                if (jobStateRef.current.logId) {
                    writeClientLog(jobStateRef.current.logId, 'timeout', 'Job timeout after 3 minutes');
                } else {
                     console.error("Timeout occurred before logId was received.");
                }
                toast({ title: 'Job Timeout', description: errorMsg, variant: 'destructive' });
                setIsGenerating(false);
                return { ...prev, compile: 'failed' };
            }
            return prev;
        });
    }, 180000);
  };
  
  const runPlaceholderStep = (step: keyof Omit<PipelineStatus, 'codeGen' | 'compile' | 'serverCheck'>): Promise<boolean> => {
    return new Promise((resolve) => {
      updatePipeline(step, 'processing');
      addLog(`[CLOUD] Simulating ${step} step...`);
      const duration = 1500 + Math.random() * 1000;
      setTimeout(() => {
        updatePipeline(step, 'completed');
        addLog(`[CLOUD] Simulated ${step} step complete.`, 'success');
        resolve(true);
      }, duration);
    });
  };

  const handleExecuteTool = async (tool: AITool, toolInput: any) => {
    // This is a type assertion because Genkit's `Tool` type from `genkit/ai` is not directly compatible
    // with the `Tool` type expected by `ai.generate`. This is a workaround.
    const executableTool = tool as any;

    if (executableTool.name === 'generateCode') {
        updatePipeline('codeGen', 'processing');
        addLog('[AIDE] Thinking... AI is analyzing your request and the current code.');
        try {
            const { code: newCode, board: newBoard, libraries: newLibraries } = await executableTool.fn(toolInput);

            const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
            setCode(newCode);
            setBoardInfo(newBoardInfo);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "OK, I've updated the code based on your request." }]);
            updatePipeline('codeGen', 'completed');
            addLog('[AIDE] Code generation complete. Generating AI summary and visualization...', 'success');
            
            toast({ title: 'Success', description: 'New code generated.' });

            const aiEnrichmentPromise = (async () => {
                const historyId = crypto.randomUUID();
                jobStateRef.current.historyId = historyId;

                let visualizerHtmlResult = '<body>Visualizer failed to generate.</body>';
                let explanationResult = 'AI summary failed to generate.';
                
                try {
                    const { html } = await generateVisualExplanation({ code: newCode });
                    visualizerHtmlResult = html;
                    setVisualizerHtml(visualizerHtmlResult);
                    addLog('[AIDE] AI Visualizer updated.', 'success');
                } catch (visError: any) {
                    addLog(`[AI] Visualizer failed: ${visError.message}`, 'error');
                }
                
                try {
                    const { explanation } = await analyzeCodeForExplanation({ code: newCode });
                    explanationResult = explanation;
                    addLog('[AIDE] AI summary generated.', 'success');
                } catch (expError: any) {
                    addLog(`[AI] Summary failed: ${expError.message}`, 'error');
                }

                const currentHistoryItem: HistoryItem = { 
                    id: historyId, 
                    code: newCode, 
                    board: newBoardInfo, 
                    visualizerHtml: visualizerHtmlResult, 
                    timestamp: new Date(), 
                    prompt: prompt,
                    explanation: explanationResult,
                };
                setHistory(prev => [currentHistoryItem, ...prev]);
            })();

            await aiEnrichmentPromise;

        } catch (error: any) {
            console.error(error);
            const message = error.message || 'An error occurred during code generation.';
            updatePipeline('codeGen', 'failed');
            addLog(`[AIDE] Code Generation Failed: ${message}`, 'error');
            setChatHistory(prev => [...prev, { role: 'assistant', content: `I ran into an error generating code: ${message}` }]);
            toast({ title: 'Code Generation Failed', description: message, variant: 'destructive' });
        }

    } else if (executableTool.name === 'compileCode') {
        setPipelineStatus({ serverCheck: 'pending', codeGen: 'completed', compile: 'pending', upload: 'pending', verify: 'pending' });
        setCompilationLogs([]);
        addLog('[AIDE] Starting compilation pipeline...');
        
        updatePipeline('serverCheck', 'processing');
        addLog('[AIDE] Checking for online desktop clients...');
        const health = await findActiveDesktopClient();

        if (!health.success || !health.clientId) {
            updatePipeline('serverCheck', 'failed');
            const errorMessage = health.error || 'No online desktop clients found.';
            addLog(`[AIDE] Error: ${errorMessage}`, 'error');
            toast({ title: 'Health Check Failed', description: errorMessage, variant: 'destructive', duration: 20000 });
            setChatHistory(prev => [...prev, { role: 'assistant', content: `I couldn't connect to a desktop client to start the compilation. ${errorMessage}` }]);
            return;
        }
        updatePipeline('serverCheck', 'completed');
        addLog(`[AIDE] Found online client: ${health.clientId}.`, 'success');

        const submitTime = Date.now();
        const requestId = await runCompileStep(health.clientId);
        
        if (requestId) {
            monitorCompilationStatus(requestId, submitTime);
        } else {
             setIsGenerating(false);
        }
    }
  }


  const handleSendMessage = async (overridePrompt?: string) => {
    const currentPrompt = overridePrompt || prompt;
    if (!currentPrompt.trim()) {
      toast({ title: 'Error', description: 'Message cannot be empty.', variant: 'destructive' });
      return;
    }
    
    if (!overridePrompt) {
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: currentPrompt }];
        setChatHistory(newHistory);
        setPrompt('');
    } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: "I've detected a compilation error. I will try to fix it and re-compile." }]);
    }

    setIsGenerating(true);
    setCurrentStatus('AI is thinking...');

    try {
      const response = await aideChat({
        history: chatHistory.map(m => ({ role: m.role, content: m.content as string })),
        code,
        prompt: currentPrompt,
      });

      const toolRequests = response.toolRequests();
      
      if (toolRequests && toolRequests.length > 0) {
         setChatHistory(prev => [...prev, { role: 'assistant', content: response.text() || "OK, I will perform the requested action." }]);
         // Execute tools sequentially
         for (const toolRequest of toolRequests) {
            await handleExecuteTool(toolRequest.tool as any, toolRequest.input);
         }
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: response.text() }]);
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred while talking to the AI.';
      setChatHistory(prev => [...prev, { role: 'assistant', content: `I ran into an error: ${message}` }]);
      toast({ title: 'AI Error', description: message, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
        setCurrentStatus('Awaiting instructions...');
    }
  };


  const handleManualAction = async (step: keyof Omit<PipelineStatus, 'codeGen'> | 'testConnection') => {
    setIsGenerating(true);
    setCompilationLogs([]);
    jobStateRef.current = { requestId: '', logId: '', buildId: '', lastStatus: '', historyId: crypto.randomUUID() };

    if (step === 'compile') {
        await handleExecuteTool({name: 'compileCode'} as any, {});
    } else if (step === 'testConnection') {
      const health = await findActiveDesktopClient();
      if (health.success && health.clientId) {
        toast({ title: 'Connection Successful', description: `Successfully connected to desktop client: ${health.clientId}` });
      } else {
        toast({ title: 'Connection Failed', description: health.error || 'Could not connect to desktop client.', variant: 'destructive' });
      }
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
    setChatHistory(prev => [...prev, {role: 'assistant', content: `Code has been restored to the version from ${item.timestamp.toLocaleString()}.`}])
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

  const handleDownloadBinary = async (buildId: string) => {
    if (!buildId) return;
    setIsGenerating(true); 
    await handleFirmwareDownload(buildId);
    setIsGenerating(false);
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
        <AppHeader 
          onManualAction={handleManualAction}
          onShowHistory={() => setIsHistoryOpen(true)}
          isGenerating={isGenerating}
        />
        <main className="flex-grow flex min-h-0 border-t">
           <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={65} minSize={40}>
                <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={65}>
                        <CodeEditorPanel
                            code={code}
                            onCodeChange={setCode}
                            boardInfo={boardInfo}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={35} minSize={20}>
                        <AiControls
                            prompt={prompt}
                            setPrompt={setPrompt}
                            onSendMessage={() => handleSendMessage()}
                            isGenerating={isGenerating}
                            chatHistory={chatHistory}
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={30}>
               <IntelligencePanel
                    visualizerHtml={visualizerHtml}
                    compilationLogs={compilationLogs}
                />
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
        <footer className="border-t px-4 py-1 flex items-center gap-4 text-xs">
            <DeploymentPipeline status={pipelineStatus} />
            <StatusIndicator isProcessing={isGenerating} statusMessage={currentStatus} />
        </footer>
        <HistorySheet 
          isOpen={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          history={history}
          onRestore={handleRestoreFromHistory}
          onDownloadCode={handleDownloadCode}
          onDownloadBinary={handleDownloadBinary}
          isGenerating={isGenerating}
        />
      </div>
    </TooltipProvider>
  );
}

    