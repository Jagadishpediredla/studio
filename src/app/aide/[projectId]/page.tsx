
"use client";

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { aideChat } from '@/ai/flows/aide-chat-flow';
import { getProject, updateProject, compileCode, getJobStatus } from '@/app/actions';
import type { HistoryItem, ChatMessage, Project } from '@/lib/types';
import { type ToolRequestPart, type GenerateResponse } from 'genkit';
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
import { Loader2, Play, Bot, MoreHorizontal, Cog, UploadCloud, ShieldCheck, BrainCircuit, History as HistoryIcon } from 'lucide-react';
import StatusIndicator from '@/components/status-indicator';
import { Button } from '@/components/ui/button';
import type { PipelineStatus } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import DeploymentPipeline from '@/components/deployment-pipeline';

export type StatusUpdate = {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
    progress?: number;
};

export default function AidePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  const [prompt, setPrompt] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isIntelligencePanelOpen, setIsIntelligencePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'visualizer'>('logs');

  const [isGenerating, setIsGenerating] = useState(false);
  const [compilationLogs, setCompilationLogs] = useState<StatusUpdate[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    serverCheck: 'pending',
    codeGen: 'pending',
    compile: 'pending',
    upload: 'pending',
    verify: 'pending',
  });

  const { toast } = useToast();
  
  const jobStateRef = useRef({
    jobId: '',
    historyId: '',
    statusPoller: undefined as NodeJS.Timeout | undefined,
  });

  // Derived state, with fallbacks for loading state
  const code = project?.code ?? '';
  const chatHistory = project?.chatHistory ?? [];
  const boardInfo = project?.boardInfo ?? { fqbn: 'esp32:esp32:esp32', libraries: [] };
  const versionHistory = project?.versionHistory ?? [];
  const visualizerHtml = project?.versionHistory?.[0]?.visualizerHtml ?? '<body>No visualization available yet.</body>';
  const lastLogMessage = compilationLogs.length > 0 ? compilationLogs[compilationLogs.length-1].message : "Ready";

  const cleanupPoller = useCallback(() => {
    if (jobStateRef.current.statusPoller) {
        clearInterval(jobStateRef.current.statusPoller);
        jobStateRef.current.statusPoller = undefined;
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
      } else {
        toast({ title: 'Error', description: `Could not load project: ${result.error}`, variant: 'destructive' });
        router.push('/');
      }
      setIsLoadingProject(false);
    };

    loadProjectData();
    
    return () => cleanupPoller();
  }, [projectId, router, toast, cleanupPoller]);

  const updateProjectData = useCallback(async (updates: Partial<Omit<Project, 'id' | 'versionHistory'>> & { versionHistory?: HistoryItem[] }) => {
    if (!projectId) return;
  
    setProject(prev => {
      if (!prev) return null;
      const updatedVersionHistory = updates.versionHistory 
        ? updates.versionHistory.map(v => ({...v, timestamp: new Date(v.timestamp) })) 
        : prev.versionHistory;
      
      return { ...prev, ...updates, versionHistory: updatedVersionHistory, updatedAt: new Date().toISOString() };
    });
  
    const result = await updateProject(projectId, updates as Partial<Omit<Project, 'id'>>);
    if (!result.success) {
      toast({
        title: "Save Error",
        description: `Failed to save project changes: ${result.error}`,
        variant: 'destructive'
      });
    }
  }, [projectId, toast]);
  
  const addLog = (message: string, type: StatusUpdate['type'] = 'info', progress?: number) => {
    setCompilationLogs(prev => {
        const newLog: StatusUpdate = {
            message,
            type,
            progress,
            timestamp: new Date().toISOString(),
        };
        if (prev.length > 0 && prev[prev.length - 1].message === message) {
            return prev;
        }
        return [...prev, newLog];
    });
  };
  
  const updatePipeline = (step: keyof PipelineStatus, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };
  
  const handleManualAction = (step: keyof Omit<PipelineStatus, 'codeGen'>) => {
    // Skip serverCheck as it's not a manual action
    if (step === 'serverCheck') return;
    
    updatePipeline(step, 'processing');
    // In a real implementation, this would trigger the actual action
    // For now, we'll simulate with a timeout
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        updatePipeline(step, 'completed');
        toast({ title: 'Success', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step completed.` });
      } else {
        updatePipeline(step, 'failed');
        toast({ title: 'Failed', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step failed.`, variant: 'destructive' });
      }
    }, 2000 + Math.random() * 2000);
  };
  
  const handleFirmwareDownload = async (result: any) => {
    addLog(`[APP] Build complete. Downloading binary...`);
    
    const downloadUrl = result.downloads.bin.startsWith('http') 
      ? result.downloads.bin 
      : process.env.NEXT_PUBLIC_COMPILATION_API_URL + result.downloads.bin;

    const filename = result.downloads.bin.split('/').pop();
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const successMsg = `Firmware "${filename}" downloaded successfully.`;
    addLog(`[APP] ${successMsg}`, 'success');
    toast({ title: 'Success', description: successMsg });

    if (jobStateRef.current.historyId) {
      const newVersionHistory = versionHistory.map(item => 
        item.id === jobStateRef.current.historyId 
        ? { ...item, buildId: result.build.buildId, binary: { filename, fileType: 'bin' } } 
        : item
      );
      updateProjectData({ versionHistory: newVersionHistory });
    }
    
    return { success: true, filename, fileType: 'bin' };
  };

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
        newChatHistory = [...chatHistory, autoFixMessage];
        updateProjectData({ chatHistory: newChatHistory });
    }

    setIsGenerating(true);

    try {
      const response: GenerateResponse = await aideChat({
        history: chatHistory.map(m => ({ role: m.role, content: m.content as string })),
        code,
        prompt: currentPrompt,
      });

      // Handle the Genkit response
      if (response && response.message) {
        const content = response.message.content;
        let assistantResponseText = '';
        
        // If content is an array of parts
        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.text) {
              assistantResponseText += part.text;
            }
            if (part.toolRequest) {
              await executeTool(part, newChatHistory); 
              assistantResponseText = ''; // Clear text if tool is used
            }
          }
        } 
        // If content is a string
        else if (typeof content === 'string') {
          assistantResponseText = content;
        }
        
        if (assistantResponseText) {
          newChatHistory = [...newChatHistory, { role: 'assistant' as const, content: assistantResponseText }];
          updateProjectData({ chatHistory: newChatHistory });
        }
      }

    } catch (error: any) {
      console.error(error);
      const message = error.message || 'An error occurred while talking to the AI.';
      const newHistory = [...chatHistory, userMessage, { role: 'assistant' as const, content: `I ran into an error: ${message}` }];
      updateProjectData({ chatHistory: newHistory });
      toast({ title: 'AI Error', description: message, variant: 'destructive' });
    } finally {
      if (!isCompiling) {
        setIsGenerating(false);
      }
    }
  }, [project, prompt, chatHistory, code, isCompiling, updateProjectData, toast]);


  const monitorCompilationStatus = useCallback((jobId: string) => {
    cleanupPoller();
    setIsCompiling(true);
    setIsGenerating(true);
    setIsIntelligencePanelOpen(true);
    setActiveTab('logs');

    jobStateRef.current.statusPoller = setInterval(async () => {
        const statusResult = await getJobStatus(jobId);

        if(!statusResult.success) {
            addLog(`[APP] Error polling status: ${statusResult.error}`, 'error');
            return;
        }

        addLog(`[COMPILER] ${statusResult.status} (${statusResult.progress || 0}%)`, 'info', statusResult.progress);
        
        if (statusResult.isCompleted) {
            cleanupPoller();
            if (statusResult.build) {
                addLog('[APP] Compilation successful. Fetching build information...', 'success');
                await handleFirmwareDownload(statusResult);
            } else {
                 addLog(`[APP] Error: Compilation completed but no build info was returned.`, 'error');
                 toast({ title: 'Build Failed', description: 'Compilation completed but no build info was returned.', variant: 'destructive' });
            }
            setIsCompiling(false);
            setIsGenerating(false);

        } else if (statusResult.isFailed) {
            cleanupPoller();
            const errorMessage = statusResult.error || "Compilation failed with an unknown error.";
            const errorDescription = (
                <div>
                    <p className="font-semibold">Compilation failed. Retrying with AI...</p>
                    <pre className="mt-2 w-full rounded-md bg-destructive/20 p-4 text-destructive-foreground whitespace-pre-wrap font-code text-xs">
                        {errorMessage}
                    </pre>
                </div>
            );

            toast({ title: 'Compilation Failed', description: errorDescription, variant: 'destructive', duration: 10000 });
            
            const retryPrompt = `The compilation failed with the following error. Please analyze this error, fix the code, and then start the compilation again. Error: \n\n${errorMessage}`;
            addLog('[AIDE] Compilation failed. Asking AI to fix the code...', 'error');
            handleSendMessage(retryPrompt);
            setIsCompiling(false);
        }
    }, 2000);

  }, [cleanupPoller, handleSendMessage, toast]);
  

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

            addLog('[AIDE] Code generation complete. Generating AI summary and visualization...', 'success');
            toast({ title: 'Success', description: 'New code generated.' });

            const [visualResult, explanationResult] = await Promise.all([
                generateVisualExplanation({ code: newCode }),
                analyzeCodeForExplanation({ code: newCode }),
            ]);

            const visualizerHtmlResult = visualResult.html || '<body>Visualizer failed to generate.</body>';
            const explanationResultText = explanationResult.explanation || 'AI summary failed to generate.';
            
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
            addLog('[AIDE] AI Visualizer and Summary updated.', 'success');
            
            return input;
        },
        compileCode: async () => {
            setCompilationLogs([]);
            addLog('[AIDE] Starting compilation pipeline...');
            setIsIntelligencePanelOpen(true);
            setActiveTab('logs');
            
            const payload = { code, board: boardInfo.fqbn, libraries: boardInfo.libraries };
            addLog(`[APP] Submitting job to cloud compiler...`);

            const result = await compileCode(payload);

            if (result.success && result.jobId) {
              jobStateRef.current.jobId = result.jobId;
              addLog(`[APP] Job submitted with ID: ${result.jobId}. Waiting for status updates...`, 'success');
              monitorCompilationStatus(result.jobId);
              return { success: true, message: 'Compilation started.' };
            } else {
              const errorMessage = result.error || 'Failed to start compilation job.';
              addLog(`[APP] Error: ${errorMessage}`, 'error');
              toast({ title: 'Compilation Failed', description: errorMessage, variant: 'destructive'});
              setIsCompiling(false);
              setIsGenerating(false);
              return { success: false, message: `I couldn't start the compilation. ${errorMessage}` };
            }
        },
        analyzeCode: async (input) => {
             const { explanation } = await analyzeCodeForExplanation(input);
             return { explanation };
        },
        visualizeCode: async (input) => {
            const { html } = await generateVisualExplanation(input);
            if (versionHistory.length > 0) {
              updateProjectData({
                versionHistory: [{...versionHistory[0], visualizerHtml: html}, ...versionHistory.slice(1)]
              });
            }
            setIsIntelligencePanelOpen(true);
            setActiveTab('visualizer');
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
                 assistantMessageContent = `I've generated a new visual explanation of the code. You can see it in the Intelligence Panel.`;
            } else if (toolName === 'runTechnicalAnalysis') {
                 assistantMessageContent = `Here is the technical analysis report:\n\n${toolResponse.report}`;
            } else {
                 assistantMessageContent = `Tool ${toolName} executed.`;
            }
            
            if (assistantMessageContent) {
                 newHistory = [...newHistory, { role: 'assistant' as const, content: assistantMessageContent }];
                 updateProjectData({ chatHistory: newHistory });
            }
        } catch (error: any) {
            const errorMessage = `Error executing tool ${toolName}: ${error.message}`;
            addLog(`[AIDE] ${errorMessage}`, 'error');
            newHistory = [...newHistory, { role: 'assistant' as const, content: errorMessage }];
            updateProjectData({ chatHistory: newHistory });
        }
    } else {
        const errorMessage = `Unknown tool: ${toolName}`;
        addLog(`[AIDE] ${errorMessage}`, 'error');
        newHistory = [...newHistory, { role: 'assistant' as const, content: errorMessage }];
        updateProjectData({ chatHistory: newHistory });
    }
  };

  const handleNavAction = (action: 'showHistory' | 'showIntelligence') => {
    if (action === 'showHistory') setIsHistoryOpen(true);
    if (action === 'showIntelligence') {
      setIsIntelligencePanelOpen(true);
      // Default to logs when opening, as it's the most common action
      setActiveTab('logs');
    }
  }

  const handleManualCompile = async () => {
    setIsGenerating(true);
    setCompilationLogs([]);
    jobStateRef.current = { jobId: '', historyId: project?.versionHistory?.[0]?.id || crypto.randomUUID(), statusPoller: undefined };
    await executeTool({ toolRequest: { name: 'compileCode', input: {} } } as any, chatHistory);
  }

  const handleRestoreFromHistory = (item: HistoryItem) => {
    const newChatHistory: ChatMessage[] = [...chatHistory, {role: 'assistant', content: `Code has been restored to the version from ${item.timestamp.toLocaleString()}.`}];
    updateProjectData({ 
        code: item.code, 
        boardInfo: item.board,
        chatHistory: newChatHistory,
        versionHistory: [item, ...versionHistory.filter(v => v.id !== item.id)]
    });
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

  const handleDownloadBinary = async (buildId?: string) => {
    if (!buildId) {
        toast({ title: "Binary Not Found", description: "This version does not have a compiled binary.", variant: "destructive"});
        return;
    };
    const job = versionHistory.find(v => v.buildId === buildId);
    if(!job || !job.binary?.filename) {
        toast({ title: "Binary Not Found", description: "Could not find the filename for this build.", variant: "destructive"});
        return;
    }
    const downloadUrl = `${process.env.NEXT_PUBLIC_COMPILATION_API_URL}/api/download/${buildId}/${job.binary.filename}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = job.binary.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Downloaded", description: `Binary ${job.binary.filename} downloaded.`});
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

  const isActionInProgress = Object.values(pipelineStatus).some(status => status === 'processing');

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
        <NavRail onNavAction={handleNavAction} />
        <div className="flex-1 flex flex-col min-w-0 sm:pl-14 pb-16 sm:pb-0">
          {/* Enhanced Header with Prominent Compile Button */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-lg font-headline font-bold text-foreground">{project?.name || 'AIoT Studio'}</h1>
                <p className="text-xs text-muted-foreground">Cloud-based IoT Development Environment</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleManualCompile} 
                disabled={isGenerating || isCompiling}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Play className="mr-2 h-4 w-4" />
                Compile & Run
                {(isGenerating || isCompiling) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsHistoryOpen(true)}
                size="sm"
              >
                <HistoryIcon className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">History</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleManualAction('compile')} disabled={isActionInProgress}>
                    <Cog className="mr-2 h-4 w-4" /> Compile Firmware
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleManualAction('upload')} disabled={isActionInProgress}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload to Device
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleManualAction('verify')} disabled={isActionInProgress}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Verify on Device
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsIntelligencePanelOpen(true)}>
                    <BrainCircuit className="mr-2 h-4 w-4" /> Intelligence Panel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {/* Status Bar */}
          <div className="px-4 py-2 border-b bg-muted/50">
            <DeploymentPipeline 
              status={pipelineStatus} 
              compilationStatus={compilationLogs.map(log => log.message)} 
            />
          </div>
          
          <main className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-[1fr] gap-4 p-4 overflow-hidden">
            <div className="flex flex-col h-full min-h-0">
              <AiControls
                prompt={prompt}
                setPrompt={setPrompt}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating || isCompiling}
                chatHistory={chatHistory}
              />
            </div>
            <div className="flex flex-col h-full min-h-0">
              <CodeEditorPanel
                code={code}
                onCodeChange={handleCodeChange}
                onDownloadCode={() => handleDownloadCode(code, new Date())}
                boardInfo={boardInfo}
              />
            </div>
          </main>
        </div>
        
        <HistorySheet 
          isOpen={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          history={versionHistory}
          onRestore={handleRestoreFromHistory}
          onDownloadCode={handleDownloadCode}
          onDownloadBinary={handleDownloadBinary}
          isGenerating={isGenerating}
        />
        
        <IntelligencePanel
            isOpen={isIntelligencePanelOpen}
            onOpenChange={setIsIntelligencePanelOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            visualizerHtml={visualizerHtml}
            compilationLogs={compilationLogs}
        />

      </div>
    </TooltipProvider>
  );
}
