
'use server';

/**
 * @fileOverview This file defines the main orchestrator flow for the AIDE chat.
 *   This flow can engage in conversation and use tools to generate or analyze code, and to compile it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateCode } from './generate-code-from-prompt';
import { generateVisualExplanation } from './generate-visual-explanation';
import { analyzeCodeForExplanation } from './analyze-code-for-explanation';
import { generateTechnicalAnalysisReport } from './generate-technical-analysis-report';
import {
    AideChatInputSchema,
    AideChatOutputSchema,
    GenerateCodeInputSchema,
    GenerateCodeOutputSchema,
    AnalyzeCodeForExplanationInputSchema,
    AnalyzeCodeForExplanationOutputSchema,
    GenerateVisualExplanationInputSchema,
    GenerateVisualExplanationOutputSchema,
    GenerateTechnicalAnalysisReportInputSchema,
    GenerateTechnicalAnalysisReportOutputSchema,
    type AideChatInput,
} from '@/ai/schemas';

// --- Tool Definitions ---

const compileCodeTool = ai.defineTool(
  {
    name: 'compileCode',
    description: 'Compiles the provided Arduino code. This should be called when the user explicitly asks to compile, build, or run the code, or after fixing a compilation error.',
    inputSchema: z.object({
        code: z.string().describe('The complete Arduino code to compile.'),
        board: z.string().describe('The FQBN of the target board (e.g., esp32:esp32:esp32).'),
        libraries: z.array(z.string()).describe('An array of required library names.'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),
  },
  async (input) => {
    // This is a placeholder. The actual compilation is triggered by the frontend
    // when it receives this tool call. We just return a confirmation here.
    return {
      success: true,
      message: 'Compilation process initiated. The user interface will now handle the compilation and display the logs.',
    };
  }
);

const generateCodeTool = ai.defineTool(
    {
        name: 'generateCode',
        description: 'Generates or modifies Arduino code based on a user prompt and the existing code. Use this when the user asks to change, update, create, or modify the code.',
        inputSchema: GenerateCodeInputSchema,
        outputSchema: GenerateCodeOutputSchema,
    },
    async (input) => {
        return await generateCode(input);
    }
);

const analyzeCodeTool = ai.defineTool(
    {
        name: 'analyzeCode',
        description: 'Analyzes the current code and provides a detailed, natural language explanation of its functionality, purpose, and how it works. Use this when the user asks to "explain the code", "what does this do?", or similar questions.',
        inputSchema: AnalyzeCodeForExplanationInputSchema,
        outputSchema: AnalyzeCodeForExplanationOutputSchema,
    },
    async (input) => {
        return await analyzeCodeForExplanation(input);
    }
);

const visualizeCodeTool = ai.defineTool(
    {
        name: 'visualizeCode',
        description: 'Generates a self-contained HTML document that visually explains the code with flowcharts and diagrams. Use this when the user asks for a "visual explanation", "diagram", or "flowchart" of the code.',
        inputSchema: GenerateVisualExplanationInputSchema,
        outputSchema: GenerateVisualExplanationOutputSchema,
    },
    async (input) => {
        return await generateVisualExplanation(input);
    }
);

const runTechnicalAnalysisTool = ai.defineTool(
    {
        name: 'runTechnicalAnalysis',
        description: 'Generates a technical analysis report for ESP32 code based on the code itself and provided sensor data. Use this to identify potential issues, failure modes, and areas for improvement.',
        inputSchema: GenerateTechnicalAnalysisReportInputSchema,
        outputSchema: GenerateTechnicalAnalysisReportOutputSchema,
    },
    async (input) => {
        return await generateTechnicalAnalysisReport(input);
    }
);


// --- Main Chat Flow ---

const aideChatFlow = ai.defineFlow(
  {
    name: 'aideChatFlow',
    inputSchema: AideChatInputSchema,
    outputSchema: AideChatOutputSchema,
  },
  async (input) => {
    const { history, code, prompt } = input;

    const llmResponse = await ai.generate({
      prompt: `You are an expert AI pair programmer for Arduino and ESP32. Your name is AIDE.
        - Engage in a helpful conversation with the user.
        - Your primary goal is to assist the user with their IoT project.
        - Use the tools provided to fulfill user requests. For example:
          - If the user asks you to modify or write code, use the \`generateCode\` tool. You must pass the user's prompt and the full existing code to this tool.
          - If the user asks to "explain this code" or "what does this do?", use the \`analyzeCode\` tool.
          - If the user asks for a "flowchart" or "visual explanation", use the \`visualizeCode\` tool.
          - If the user asks you to compile, build, deploy, or run the code, use the \`compileCode\` tool.
        - If the prompt contains a compilation error message, your primary goal is to fix the code. Use the \`generateCode\` tool to provide the corrected code, and then immediately call the \`compileCode\` tool to try building it again.
        - For general chat, just respond with a helpful message.

        This is the current code in the editor:
        \`\`\`cpp
        ${code}
        \`\`\`
      `,
      history: [...(history || []), { role: 'user', content: prompt }],
      tools: [generateCodeTool, compileCodeTool, analyzeCodeTool, visualizeCodeTool, runTechnicalAnalysisTool],
      model: 'googleai/gemini-2.5-flash',
      config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      },
    });

    return llmResponse;
  }
);

export async function aideChat(input: AideChatInput) {
    const response = await aideChatFlow(input);
    // The 'output()' method on the response is where the structured tool calls and text are.
    return response.output();
}
