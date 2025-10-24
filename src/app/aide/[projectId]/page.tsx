
"use client";

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { aideChat } from '@/ai/flows/aide-chat-flow.ts';
import { findActiveDesktopClient, submitCompilationRequest, writeClientLog, getBuildInfo, getBinary, getProject, updateProject } from '@/app/actions';
import type { HistoryItem, BoardInfo, FirebaseStatusUpdate, StatusUpdate, ChatMessage, BuildInfo, Project } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { type ToolRequestPart } from 'genkit';
import { analyzeCodeForExplanation } from '@/ai/flows/analyze-code-for-explanation';
import { generateVisualExplanation } from '@/ai/flows/generate-visual-explanation';
import { generateTechnicalAnalysisReport } from '@/ai/flows/generate-technical-analysis-report';

import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavRail from '@/components/nav-rail';
import AiControls from '@/components/ai-controls';
import CodeEditorPanel from '@/components/code-editor-panel';
import IntelligencePanel from '@/components/intelligence-panel';
import { useToast } from '@/hooks/use-toast';
import { HistorySheet } from '@/components/history-sheet';
import { Skeleton } from '@/components/ui/skeleton';

export default function AidePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  const [prompt, setPrompt] = useState<string>('');
  const [visualizerHtml, setVisualizerHtml] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Derived state, with fallbacks for loading state
  const code = project?.code ?? '';
  const chatHistory = project?.chatHistory ?? [];
  const boardInfo = project?.boardInfo ?? { fqbn: 'esp32:esp32:esp32', libraries: [] };
  const versionHistory = project?.versionHistory ?? [];


  const cleanupListeners = useCallback(() => {
    if (statusListenerUnsubscribeRef.current) {
        statusListenerUnsubscribeRef.current();
        statusListenerUnsubscribeRef.current = undefined;
    }
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      setIsLoadingProject(true);
      const result = await getProject(projectId);
      if (result.success && result.project) {
        const loadedProject = {
          ...result.project,
          versionHistory: (result.project.versionHistory || []).map(v => ({...v, timestamp: new Date(v.timestamp)}))
        }
        setProject(loadedProject as Project);
        if (loadedProject.versionHistory.length > 0) {
          setVisualizerHtml(loadedProject.versionHistory[0].visualizerHtml || '');
        }
      } else {
        toast({ title: 'Error', description: `Could not load project: ${result.error}`, variant: 'destructive' });
        router.push('/');
      }
      setIsLoadingProject(false);
    };

    loadProjectData();
    
    return () => cleanupListeners();
  }, [projectId, router, toast, cleanupListeners]);

  const updateProjectData = useCallback(async (updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (!project) return;
      
      const updatedProject = { ...project, ...updates };
      setProject(updatedProject);
      
      // Debounce updates to avoid hammering the database
      const handler = setTimeout(async () => {
        const result = await updateProject(projectId, updates);
        if (!result.success) {
            toast({
                title: "Save Error",
                description: `Failed to save project changes: ${result.error}`,
                variant: 'destructive'
            })
        }
      }, 500);

      return () => clearTimeout(handler);
      
  }, [project, projectId, toast]);
  
  const addLog = (message: string, type: StatusUpdate['type'] = 'info') => {
    setCompilationLogs(prev => {
        const newLog: StatusUpdate = {
            message,
            type,
            timestamp: new Date().toISOString(),
        };
        // Simple check to avoid duplicate consecutive logs
        if (prev.length > 0 && prev[prev.length - 1].message === message) {
            return prev;
        }
        return [...prev, newLog];
    });
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
    addLog(`[CLOUD] Submitting job to desktop client '${desktopId}'...`);
    
    const payload = { code, board: boardInfo.fqbn, libraries: boardInfo.libraries, desktopId };
    
    const result = await submitCompilationRequest(payload);

    if (result.success && result.requestId) {
      jobStateRef.current.requestId = result.requestId;
      const firebaseLogMsg = `[FIREBASE] Wrote to /requests/${desktopId}/${result.requestId}`;
      addLog(firebaseLogMsg, 'success');
      addLog(`[CLOUD] Job submitted with ID: ${result.requestId}. Waiting for acknowledgment...`);
      return result.requestId;
    } else {
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

  // Using useCallback for handleSendMessage to stabilize its reference
  const handleSendMessage = useCallback(async (overridePrompt?: string) => {
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
            // NOTE: We are intentionally not awaiting executeTool here
            // because it has its own state management for compilation.
            // Awaiting it would block the UI from updating with the initial AI response.
            executeTool(part, newChatHistory); 
          }
        }
      }
      
      // Only add a new assistant message if there's text content.
      // Tool responses will add their own messages.
      if (responseText) {
        newChatHistory = [...newChatHistory, { role: 'assistant', content: responseText }];
        updateProjectData({ chatHistory: newChatHistory });
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred while talking to the AI.';
      const newHistory = [...chatHistory, { role: 'assistant', content: `I ran into an error: ${message}` }];
      updateProjectData({ chatHistory: newHistory });
      toast({ title: 'AI Error', description: message, variant: 'destructive' });
    } finally {
        if (!jobStateRef.current.requestId) {
          setIsGenerating(false);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, prompt, chatHistory, code, updateProjectData, toast]);


  const monitorCompilationStatus = useCallback((requestId: string, submitTime: number) => {
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
            addLog('[DESKTOP] Compilation successful. Fetching build information...', 'success');
            
            const buildId = jobStateRef.current.buildId || status.buildId;
            if (buildId) {
              if (jobStateRef.current.logId) {
                await writeClientLog(jobStateRef.current.logId, 'job_completed', 'Job completed successfully on desktop client');
              }
              await handleFirmwareDownload(buildId, jobStateRef.current.historyId);
            } else {
               addLog(`[CLOUD] Error: Compilation completed but no buildId was found.`, 'error');
               toast({ title: 'Build Info Failed', description: 'Compilation completed but no buildId was found.', variant: 'destructive' });
            }
            setIsGenerating(false);

        } else if (status.status === 'failed') {
            cleanupListeners();
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
        addLog(`[FIREBASE] Error: Firebase listener error: ${error.message}`, 'error');
        toast({ title: 'Real-time Error', description: `Firebase listener error: ${error.message}`, variant: 'destructive' });
        setIsGenerating(false);
    });

    timeoutRef.current = setTimeout(() => {
        cleanupListeners();
        const errorMsg = 'Job timed out after 3 minutes. The desktop client did not respond or complete in time.';
        addLog(`[CLOUD] Error: ${errorMsg}`, 'error');
        if (jobStateRef.current.logId) {
            writeClientLog(jobStateRef.current.logId, 'timeout', 'Job timeout after 3 minutes');
        }
        toast({ title: 'Job Timeout', description: errorMsg, variant: 'destructive' });
        setIsGenerating(false);
    }, 180000);
  }, [cleanupListeners, code.length, boardInfo, handleSendMessage, toast]);
  

  const executeTool = async (toolRequest: ToolRequestPart, currentChatHistory: ChatMessage[]) => {
    const toolName = toolRequest.toolRequest.name;
    const toolInput = toolRequest.toolRequest.input;
    let newHistory = [...currentChatHistory];

    const toolExecutors: { [key: string]: (input: any) => Promise<any> } = {
        generateCode: async (input) => {
            addLog('[AIDE] Thinking... AI is analyzing your request and the current code.');
            const historyId = crypto.randomUUID();
            jobStateRef.current.historyId = historyId;

            const { code: newCode, board: newBoard, libraries: newLibraries } = input;
            const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };

            // Update local state immediately for responsiveness
            setProject(p => p ? { ...p, code: newCode, boardInfo: newBoardInfo } : null);

            addLog('[AIDE] Code generation complete. Generating AI summary and visualization...', 'success');
            toast({ title: 'Success', description: 'New code generated.' });

            // Fire-and-forget the enrichment and saving
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
                    versionHistory: [currentHistoryItem, ...(project?.versionHistory || [])],
                });
            }).catch(err => {
                console.error("Error in AI enrichment:", err);
                addLog(`[AI] Enrichment failed: ${err.message}`, 'error');
            });
            
            return input;
        },
        compileCode: async () => {
            setCompilationLogs([]);
            addLog('[AIDE] Starting compilation pipeline...');
            
            addLog('[AIDE] Checking for online desktop clients...');
            const health = await findActiveDesktopClient();

            if (!health.success || !health.clientId) {
                const errorMessage = health.error || 'No online desktop clients found.';
                addLog(`[AIDE] Error: ${errorMessage}`, 'error');
                toast({ title: 'Health Check Failed', description: errorMessage, variant: 'destructive', duration: 20000 });
                return { success: false, message: `I couldn't connect to a desktop client. ${errorMessage}` };
            }

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
        try {
            const toolResponse = await toolExecutors[toolName](toolInput);
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
                 newHistory = [...newHistory, { role: 'assistant', content: assistantMessageContent }];
                 updateProjectData({ chatHistory: newHistory });
            }
        } catch (error: any) {
            const errorMessage = `Error executing tool ${toolName}: ${error.message}`;
            addLog(`[AIDE] ${errorMessage}`, 'error');
            newHistory = [...newHistory, { role: 'assistant', content: errorMessage }];
            updateProjectData({ chatHistory: newHistory });
        }
    } else {
        const errorMessage = `Unknown tool: ${toolName}`;
        addLog(`[AIDE] ${errorMessage}`, 'error');
        newHistory = [...newHistory, { role: 'assistant', content: errorMessage }];
        updateProjectData({ chatHistory: newHistory });
    }
  };


  const handleManualAction = async (action: 'compile' | 'testConnection' | 'showHistory') => {
    if (action === 'showHistory') {
        setIsHistoryOpen(true);
        return;
    }
    
    setIsGenerating(true);
    setCompilationLogs([]);
    jobStateRef.current = { requestId: '', logId: '', buildId: '', lastStatus: '', historyId: crypto.randomUUID() };

    if (action === 'compile') {
        await executeTool({ toolRequest: { name: 'compileCode', input: {} } } as any, chatHistory);
    } else if (action === 'testConnection') {
      const health = await findActiveDesktopClient();
      if (health.success && health.clientId) {
        toast({ title: 'Connection Successful', description: `Successfully connected to desktop client: ${health.clientId}` });
      } else {
        toast({ title: 'Connection Failed', description: health.error || 'Could not connect to desktop client.', variant: 'destructive' });
      }
      setIsGenerating(false);
    } else {
        setIsGenerating(false);
    }
  }

  const handleRestoreFromHistory = (item: HistoryItem) => {
    const newChatHistory: ChatMessage[] = [...chatHistory, {role: 'assistant', content: `Code has been restored to the version from ${item.timestamp.toLocaleString()}.`}];
    updateProjectData({ 
        code: item.code, 
        boardInfo: item.board,
        chatHistory: newChatHistory
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
  
  const handleCodeChange = (newCode: string) => {
      if (project) {
        updateProjectData({ code: newCode });
      }
  };

  if (isLoadingProject || !project) {
    return (
        <div className="h-screen w-screen bg-background text-foreground flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Project...</p>
            </div>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
        <NavRail onShowHistory={() => setIsHistoryOpen(true)} />
        <main className="flex-grow flex min-h-0">
           <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={60} minSize={30}>
                         <AiControls
                            projectName={project.name}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            onSendMessage={handleSendMessage}
                            isGenerating={isGenerating}
                            chatHistory={chatHistory}
                            onManualAction={handleManualAction}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={40} minSize={20}>
                       <CodeEditorPanel
                            code={code}
                            onCodeChange={handleCodeChange}
                            boardInfo={boardInfo}
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

    