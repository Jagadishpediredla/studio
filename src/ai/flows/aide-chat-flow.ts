
'use server';

/**
 * @fileOverview This file defines the main orchestrator flow for the AIDE chat.
 *   This flow can engage in conversation and use tools to generate code or compile it.
 *
 *   - aideChat: The main function to handle chat interactions.
 *   - AideChatInput: The input type for the aideChat function.
 *   - AideChatOutput: The output type for the aideChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateCode } from './generate-code-from-prompt';
import {
    AideChatInputSchema,
    AideChatOutputSchema,
    GenerateCodeInputSchema,
    GenerateCodeOutputSchema,
    type AideChatInput,
} from '@/ai/schemas';

// Define tools for the AI to use
const compileCodeTool = ai.defineTool(
  {
    name: 'compileCode',
    description: 'Compiles the provided Arduino code. This should be called when the user explicitly asks to compile, build, or run the code.',
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

// Define the main chat flow
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
        - If the user asks you to modify or write code, use the \`generateCode\` tool. You must pass the user's prompt and the full existing code to this tool.
        - If the user asks you to compile, build, deploy, or run the code, use the \`compileCode\` tool.
        - For general chat, just respond with a helpful message.

        This is the current code in the editor:
        \`\`\`cpp
        ${code}
        \`\`\`
      `,
      history: [...history, { role: 'user', content: prompt }],
      tools: [generateCodeTool, compileCodeTool],
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

// Define the exported function for the frontend to call
export async function aideChat(input: AideChatInput) {
    return await aideChatFlow(input);
}
