
import { z } from 'genkit';

// Schemas for generate-code-from-prompt.ts
export const GenerateCodeInputSchema = z.object({
  prompt: z.string().describe('A natural language prompt describing the desired Arduino code snippet.'),
  code: z.string().optional().describe('The existing code in the editor, if any.'),
});

export type GenerateCodeInput = z.infer<typeof GenerateCodeInputSchema>;

export const GenerateCodeOutputSchema = z.object({
  code: z.string().describe('The generated Arduino code snippet.'),
  board: z.string().optional().describe('The detected board type (FQBN).'),
  libraries: z.array(z.string()).optional().describe('The required libraries.'),
});

export type GenerateCodeOutput = z.infer<typeof GenerateCodeOutputSchema>;


// Schemas for aide-chat-flow.ts
export const AideChatInputSchema = z.object({
    history: z.array(z.any()).describe("The conversation history."),
    code: z.string().describe("The current code in the editor."),
    prompt: z.string().describe("The user's latest message."),
});
export type AideChatInput = z.infer<typeof AideChatInputSchema>;


export const AideChatOutputSchema = z.object({
    content: z.string().describe("The AI's text response to the user."),
});
export type AideChatOutput = z.infer<typeof AideChatOutputSchema>;
