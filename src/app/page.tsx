"use client";

import * as React from 'react';
import { useState } from 'react';
import { generateCode } from '@/ai/flows/generate-code-from-prompt';
import { analyzeCodeForExplanation } from '@/ai/flows/analyze-code-for-explanation';
import { generateTechnicalAnalysisReport } from '@/ai/flows/generate-technical-analysis-report';
import type { PipelineStatus, HistoryItem, BoardInfo, PipelineStep } from '@/lib/types';

import AppHeader from '@/components/app-header';
import AiControls from '@/components/ai-controls';
import Esp32Pinout from '@/components/esp32-pinout';
import CodeEditorPanel from '@/components/code-editor-panel';
import IntelligencePanel from '@/components/intelligence-panel';
import { useToast } from '@/hooks/use-toast';

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

const initialVisualizerCode = `graph TD
    A[Start] --> B{setup()};
    B --> C[Serial.begin(115200)];
    C --> D[Serial.println("Hello, ESP32!")];
    D --> E{loop()};
    E --> F[delay(1000)];
    F --> E;`;

export default function Home() {
  const [prompt, setPrompt] = useState<string>('Blink an LED on pin 13');
  const [code, setCode] = useState<string>(initialCode);
  const [boardInfo, setBoardInfo] = useState<BoardInfo>({ fqbn: 'esp32:esp32:esp32', libraries: [] });
  const [explanation, setExplanation] = useState<string>(initialExplanation);
  const [visualizerCode, setVisualizerCode] = useState<string>(initialVisualizerCode);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sensorData, setSensorData] = useState<string>('Water sensor reading: 850');
  const [technicalReport, setTechnicalReport] = useState<string>('');
  
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    codeGen: 'pending',
    compile: 'pending',
    upload: 'pending',
    verify: 'pending',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const updatePipeline = (step: keyof PipelineStatus, status: PipelineStep) => {
    setPipelineStatus(prev => ({ ...prev, [step]: status }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Prompt cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    updatePipeline('codeGen', 'processing');

    const currentHistoryItem: HistoryItem = { id: crypto.randomUUID(), code, board: boardInfo, explanation, visualizerCode, timestamp: new Date() };
    setHistory(prev => [currentHistoryItem, ...prev]);

    try {
      const { code: newCode, board: newBoard, libraries: newLibraries } = await generateCode({ prompt });
      
      setCode(newCode);
      const newBoardInfo = { fqbn: newBoard || 'esp32:esp32:esp32', libraries: newLibraries || [] };
      setBoardInfo(newBoardInfo);
      
      const { explanation: newExplanation } = await analyzeCodeForExplanation({ code: newCode });
      setExplanation(newExplanation);

      // Placeholder for visualizer generation
      const newVisualizerCode = `graph TD\nA[Start] --> B["${prompt.substring(0, 30)}..."];\nB --> C{Generated Logic};`;
      setVisualizerCode(newVisualizerCode);
      
      updatePipeline('codeGen', 'completed');
      toast({ title: 'Success', description: 'New code generated and analyzed.' });

    } catch (error) {
      console.error(error);
      toast({ title: 'AI Generation Failed', description: 'Could not generate code from the prompt.', variant: 'destructive' });
      updatePipeline('codeGen', 'failed');
      setHistory(prev => prev.slice(1)); // Revert history
    } finally {
      setIsGenerating(false);
      // Reset subsequent pipeline steps
      updatePipeline('compile', 'pending');
      updatePipeline('upload', 'pending');
      updatePipeline('verify', 'pending');
    }
  };

  const handleCompile = (step: keyof PipelineStatus) => {
    updatePipeline(step, 'processing');
    const duration = 2000 + Math.random() * 2000;
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        updatePipeline(step, 'completed');
        toast({ title: 'Success', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step completed.` });
      } else {
        updatePipeline(step, 'failed');
        toast({ title: 'Failed', description: `${step.charAt(0).toUpperCase() + step.slice(1)} step failed.`, variant: 'destructive' });
      }
    }, duration);
  };
  
  const handleRestoreFromHistory = (item: HistoryItem) => {
    setCode(item.code);
    setBoardInfo(item.board);
    setExplanation(item.explanation);
    setVisualizerCode(item.visualizerCode);
    toast({ title: 'Restored', description: `Restored code from ${item.timestamp.toLocaleTimeString()}` });
  };
  
  const handleGenerateReport = async () => {
    setIsAnalyzing(true);
    try {
      const { report } = await generateTechnicalAnalysisReport({ code, sensorData });
      setTechnicalReport(report);
      toast({ title: 'Analysis Complete', description: 'Technical analysis report generated.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Analysis Failed', description: 'Could not generate technical report.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="grid h-screen max-h-screen w-full grid-cols-[340px_1fr_380px] grid-rows-[auto_1fr] gap-4 overflow-hidden p-4 bg-background">
      <AppHeader 
        pipelineStatus={pipelineStatus} 
        onCompile={handleCompile}
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
        visualizerCode={visualizerCode}
        explanation={explanation}
        history={history}
        onRestore={handleRestoreFromHistory}
        sensorData={sensorData}
        setSensorData={setSensorData}
        technicalReport={technicalReport}
        onGenerateReport={handleGenerateReport}
        isAnalyzing={isAnalyzing}
      />
    </main>
  );
}
