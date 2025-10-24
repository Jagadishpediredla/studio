
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Home, Bot, Cog, BrainCircuit, FileCode, Search, Wrench } from "lucide-react";

const tools = [
  {
    name: "generateCode",
    description: "Generates or modifies Arduino code based on a user prompt. Handles creation, updates, and modifications.",
    icon: FileCode,
  },
  {
    name: "compileCode",
    description: "Compiles the current code for the specified board and libraries, initiating the build process.",
    icon: Cog,
  },
  {
    name: "analyzeCode",
    description: "Provides a detailed, natural language explanation of the code's functionality, purpose, and logic.",
    icon: Search,
  },
  {
    name: "visualizeCode",
    description: "Generates a visual HTML flowchart/diagram to explain the code's structure and execution flow.",
    icon: BrainCircuit,
  },
  {
    name: "runTechnicalAnalysis",
    description: "Generates a technical report by analyzing code and sensor data to find potential issues and failure modes.",
    icon: Wrench,
  },
];


export default function SettingsPage() {
  return (
    <div className="h-screen w-screen bg-muted/40 text-foreground flex flex-col items-center p-4 sm:p-8 font-body">
      <header className="w-full max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Bot className="h-10 w-10 text-primary" />
            <div>
                <h1 className="text-4xl font-headline font-bold tracking-tighter">
                    AI Agent Settings
                </h1>
                <p className="text-lg text-muted-foreground">
                    An overview of the tools and capabilities available to the AIDE assistant.
                </p>
            </div>
        </div>
         <Button asChild variant="outline">
          <Link href="/"><Home className="mr-2"/> Home</Link>
        </Button>
      </header>
      
      <main className="w-full max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Available AI Tools</CardTitle>
            <CardDescription>
              The AIDE chat assistant can use the following tools to help you with your project. You can invoke them by asking the AI to perform the described action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map(tool => (
                <div key={tool.name} className="p-4 border rounded-lg bg-background flex items-start gap-4">
                    <tool.icon className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold font-mono text-base">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
