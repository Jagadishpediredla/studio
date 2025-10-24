
"use client";

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { aideChat } from '@/ai/flows/aide-chat-flow.ts';
import { findActiveDesktopClient, submitCompilationRequest, writeClientLog, getBuildInfo, getBinary, getProject, updateProject } from '@/app/actions';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep, FirebaseStatusUpdate, StatusUpdate, ChatMessage, BuildInfo, Project } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { type ToolRequestPart, type Part } from 'genkit';
import { analyzeCodeForExplanation } from '@/ai/flows/analyze-code-for-explanation';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { generateTechnicalAnalysisReport } from '@/ai/flows/generate-technical-analysis-report';

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
import { Skeleton } from '@/components/ui/skeleton';

export default function AidePage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  const [prompt, setPrompt] = useState<string>('');
  const [visualizerHtml, setVisualizerHtml] = useState<string>('');
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

  // Derived state
  const code = project?.code ?? '';
  const chatHistory = project?.chatHistory ?? [];
  const boardInfo = project?.boardInfo ?? { fqbn: 'esp32:esp32:esp32', libraries: [] };
  const versionHistory = project?.versionHistory ?? [];

  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoadingProject(true);
      const result = await getProject(projectId);
      if (result.success && result.project) {
        setProject(result.project);
        // Set visualizer from the most recent history item if available
        if (result.project.versionHistory.length > 0) {
          setVisualizerHtml(result.project.versionHistory[0].visualizerHtml);
        }
      } else {
        toast({ title: 'Error', description: `Could not load project: ${result.error}`, variant: 'destructive' });
        router.push('/');
      }
      setIsLoadingProject(false);
    };

    if (projectId) {
      loadProjectData();
    }
     return () => cleanupListeners();
  }, [projectId, router, toast]);


  const updateProjectData = async (updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
      if (!project) return;
      
      const newProjectState: Project = { 
          ...project, 
          ...updates,
          // Ensure timestamp objects are correctly handled if they are part of the update
          versionHistory: (updates.versionHistory || project.versionHistory).map(item => ({
              ...item,
              timestamp: new Date(item.timestamp) 
          })),
      };
      setProject(newProjectState);
      
      // The server action will handle converting dates back to strings/numbers for Firebase
      await updateProject(projectId, updates);
  };
  

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

    // Prefer .bin, then .hex, then .elf
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
      const newVersionHistory = versionHistory.map(item => 
        item.id === historyId 
        ? { ...item, buildId, binary: { filename, fileType: fileType! } } 
        : item
      );
      updateProjectData({ versionHistory: newVersionHistory });
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
            addLog(`[CLOUD] Desktop client acknowledged. Log ID: ${status.logId}`);
            
            await writeClientLog(status.logId, 'request_submitted', 'Compilation request submitted by client', { codeLength: code.length, board: boardInfo.fqbn });
            await writeClientLog(status.logId, 'acknowledgment_received', 'Desktop client acknowledged request', { responseTime: Date.now() - submitTime, clientId: status.clientId });
        }
        
        if (status.status !== jobStateRef.current.lastStatus && jobStateRef.current.logId) {
            jobStateRef.current.lastStatus = status.status;
             await writeClientLog(jobStateRef.current.logId, `status_update_${status.status}`, `Status: ${status.message}`, { progress: status.progress, iteration: status.iteration, elapsedTime: status.elapsedTime });
        }

        addLog(`[DESKTOP] [${status.phase}] ${status.status} (${status.progress}%) - ${status.message}`, status.status === 'failed' ? 'error' : 'info');

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
               addLog(`[CLOUD] Error: Compilation completed but no buildId was found.`, 'error');
               toast({ title: 'Build Info Failed', description: 'Compilation completed but no buildId was found.', variant: 'destructive' });
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
            
            const retryPrompt = `The compilation failed with the following error. Please analyze this error, fix the code, and then start the compilation again. Error: \n\n${status.message}`;
            addLog('[AIDE] Compilation failed. Asking AI to fix the code...', 'error');
            handleSendMessage(retryPrompt);
        }
    };
    
    statusListenerUnsubscribeRef.current = onValue(statusRef, onStatusUpdate, (error) => {
        cleanupListeners();
        updatePipeline('compile', 'failed');
        addLog(`[FIREBASE] Error: Firebase listener error: ${error.message}`, 'error');
        toast({ title: 'Real-time Error', description: `Firebase listener error: ${error.message}`, variant: 'destructive' });
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

  const executeTool = async (toolRequest: ToolRequestPart) => {
    const toolName = toolRequest.toolRequest.name;
    const toolInput = toolRequest.toolRequest.input;

    const toolExecutors: { [key: string]: (input: any) => Promise<any> } = {
        generateCode: async (input) => {
            updatePipeline('codeGen', 'processing');
            addLog('[AIDE] Thinking... AI is analyzing your request and the current code.');
            const historyId = crypto.randomUUID();
            jobStateRef.current.historyId = historyId;

            const { code: newCode, board: newBoard, libraries: newLibraries } = input;
            const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
            
            setProject(p => p ? { ...p, code: newCode, boardInfo: newBoardInfo } : null);

            addLog('[AIDE] Code generation complete. Generating AI summary and visualization...', 'success');
            toast({ title: 'Success', description: 'New code generated.' });

            Promise.all([
                generateVisualExplanation({ code: newCode }),
                analyzeCodeForExplanation({ code: newCode }),
            ]).then(([visualResult, explanationResult]) => {
                const visualizerHtmlResult = visualResult.html || '<body>Visualizer failed to generate.</body>';
                const explanationResultText = explanationResult.explanation || 'AI summary failed to generate.';
                
                setVisualizerHtml(visualizerHtmlResult);
                addLog('[AIDE] AI Visualizer and Summary updated.', 'success');

                const currentHistoryItem: HistoryItem = { 
                    id: historyId, 
                    code: newCode, 
                    board: newBoardInfo, 
                    visualizerHtml: visualizerHtmlResult, 
                    timestamp: new Date(), 
                    prompt: prompt,
                    explanation: explanationResultText,
                };
                
                updateProjectData({
                    code: newCode,
                    boardInfo: newBoardInfo,
                    versionHistory: [currentHistoryItem, ...versionHistory],
                });
            }).catch(err => {
                console.error("Error in AI enrichment:", err);
                addLog(`[AI] Enrichment failed: ${err.message}`, 'error');
            });
            
            return input;
        },
        compileCode: async () => {
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
                return { success: false, message: `I couldn't connect to a desktop client. ${errorMessage}` };
            }

            updatePipeline('serverCheck', 'completed');
            addLog(`[AIDE] Found online client: ${health.clientId}.`, 'success');

            const submitTime = Date.now();
            const requestId = await runCompileStep(health.clientId);
            
            if (requestId) {
                monitorCompilationStatus(requestId, submitTime);
                return { success: true, message: 'Compilation started.' };
            } else {
                setIsGenerating(false);
                return { success: false, message: 'Failed to submit compilation request.' };
            }
        },
        analyzeCode: async (input) => {
             const { explanation } = await analyzeCodeForExplanation(input);
             return { explanation };
        },
        visualizeCode: async (input) => {
            const { html } = await generateVisualExplanation(input);
            setVisualizerHtml(html);
            return { html };
        },
        runTechnicalAnalysis: async (input) => {
            const { report } = await generateTechnicalAnalysisReport(input);
            return { report };
        }
    };
    
    if (toolExecutors[toolName]) {
        return await toolExecutors[toolName](toolInput);
    } else {
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };


  const handleSendMessage = async (overridePrompt?: string) => {
    const currentPrompt = overridePrompt || prompt;
    if (!currentPrompt.trim() || !project) return;
    
    const userMessage: ChatMessage = { role: 'user', content: currentPrompt };
    let newChatHistory: ChatMessage[] = [...chatHistory, userMessage];

    if (!overridePrompt) {
        updateProjectData({ chatHistory: newChatHistory });
        setPrompt('');
    } else {
        const autoFixMessage: ChatMessage = { role: 'assistant', content: "I've detected a compilation error. I will try to fix it and re-compile." };
        newChatHistory = [...chatHistory, autoFixMessage, userMessage];
        updateProjectData({ chatHistory: newChatHistory });
    }

    setIsGenerating(true);
    setCurrentStatus('AI is thinking...');

    try {
      const response = await aideChat({
        history: chatHistory.map(m => ({ role: m.role, content: m.content as string })),
        code,
        prompt: currentPrompt,
      });

      let responseText = '';
      if (response.candidates[0].message.content) {
        for (const part of response.candidates[0].message.content) {
          if (part.text) {
            responseText += part.text;
          } else if (part.toolRequest) {
            const toolResponse = await executeTool(part);
            const toolName = part.toolRequest.name;
            let assistantMessageContent;

            if (toolName === 'generateCode') {
                 assistantMessageContent = `I have generated new code for you. I've also updated the AI summary and visualization.`;
            } else if (toolName === 'compileCode' && toolResponse.success) {
                 assistantMessageContent = `I have started the compilation process. You can monitor the progress in the logs.`;
            } else if (toolName === 'analyzeCode') {
                 assistantMessageContent = toolResponse.explanation;
            } else if (toolName === 'visualizeCode') {
                 assistantMessageContent = `I've generated a new visual explanation of the code. You can see it in the "Visualizer" tab.`;
            } else if (toolName === 'runTechnicalAnalysis') {
                 assistantMessageContent = `Here is the technical analysis report:\n\n${toolResponse.report}`;
            } else {
                 assistantMessageContent = `Tool ${toolName} executed.`;
            }
            
            if (assistantMessageContent) {
                 newChatHistory = [...newChatHistory, { role: 'assistant', content: assistantMessageContent }];
                 updateProjectData({ chatHistory: newChatHistory });
            }
          }
        }
      }

      if (responseText) {
        newChatHistory = [...newChatHistory, { role: 'assistant', content: responseText }];
        updateProjectData({ chatHistory: newChatHistory });
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred while talking to the AI.';
      const newHistory = [...chatHistory, { role: 'assistant', content: `I ran into an error: ${message}` }];
      setProject(p => p ? {...p, chatHistory: newHistory} : null);
      // Avoid calling updateProjectData here to prevent loops on error
      toast({ title: 'AI Error', description: message, variant: 'destructive' });
    } finally {
        if (!jobStateRef.current.requestId) {
          setIsGenerating(false);
        }
        setCurrentStatus('Awaiting instructions...');
    }
  };


  const handleManualAction = async (step: keyof Omit<PipelineStatus, 'codeGen'> | 'testConnection') => {
    setIsGenerating(true);
    setCompilationLogs([]);
    jobStateRef.current = { requestId: '', logId: '', buildId: '', lastStatus: '', historyId: crypto.randomUUID() };

    if (step === 'compile') {
        await executeTool({ toolRequest: { name: 'compileCode', input: {} } } as any);
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
    updateProjectData({ 
        code: item.code, 
        boardInfo: item.board,
        chatHistory: [...chatHistory, {role: 'assistant', content: `Code has been restored to the version from ${item.timestamp.toLocaleString()}.`}]
    });
    setVisualizerHtml(item.visualizerHtml);
    setIsHistoryOpen(false);
    toast({ title: 'Restored', description: `Restored code from ${item.timestamp.toLocaleTimeString()}` });
  };
  
  const handleDownloadCode = (codeToDownload: string, timestamp: Date) => {
    const blob = new Blob([codeToDownload], { type: 'text/plain' });
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

  if (isLoadingProject || !project) {
    return (
        <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
            <header className="flex items-center justify-between px-3 py-2 border-b h-14">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>
            <main className="flex-grow flex min-h-0 border-t">
                <Skeleton className="h-full w-full" />
            </main>
             <footer className="border-t px-4 py-1 flex items-center gap-4 text-xs h-14">
                <Skeleton className="h-8 w-full" />
             </footer>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
        <AppHeader 
          projectName={project.name}
          onManualAction={handleManualAction}
          onShowHistory={() => setIsHistoryOpen(true)}
          isGenerating={isGenerating}
        />
        <main className="flex-grow flex min-h-0 border-t">
           <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={65}>
                        <CodeEditorPanel
                            code={code}
                            onCodeChange={(newCode) => updateProjectData({ code: newCode })}
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
            <ResizablePanel defaultSize={50} minSize={30}>
               <IntelligencePanel
                    visualizerHtml={visualizerHtml}
                    compilationLogs={compilationLogs}
                />
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
        <footer className="border-t px-4 py-1 flex items-center gap-4 text-xs h-14">
            <DeploymentPipeline status={pipelineStatus} />
            <StatusIndicator isProcessing={isGenerating} statusMessage={currentStatus} />
        </footer>
        <HistorySheet 
          isOpen={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          history={versionHistory}
          onRestore={handleRestoreFromHistory}
          onDownloadCode={handleDownloadCode}
          onDownloadBinary={handleDownloadBinary}
          isGenerating={isGenerating}
        />
      </div>
    </TooltipProvider>
  );
}
