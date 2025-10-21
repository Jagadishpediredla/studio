'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Arduino code snippets from natural language prompts.
 *   The flow takes a natural language prompt as input and returns an Arduino code snippet.
 *   The file exports:
 *     - generateCode: The main function to trigger the code generation flow.
 *     - GenerateCodeInput: The input type for the generateCode function.
 *     - GenerateCodeOutput: The output type for the generateCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const GenerateCodeInputSchema = z.object({
  prompt: z.string().describe('A natural language prompt describing the desired Arduino code snippet.'),
});

export type GenerateCodeInput = z.infer<typeof GenerateCodeInputSchema>;

// Define the output schema
const GenerateCodeOutputSchema = z.object({
  code: z.string().describe('The generated Arduino code snippet.'),
  board: z.string().optional().describe('The detected board type (FQBN).'),
  libraries: z.array(z.string()).optional().describe('The required libraries.'),
});

export type GenerateCodeOutput = z.infer<typeof GenerateCodeOutputSchema>;

// Define the main function to trigger the code generation flow
export async function generateCode(input: GenerateCodeInput): Promise<GenerateCodeOutput> {
  return generateCodeFlow(input);
}

// Define the prompt
const generateCodePrompt = ai.definePrompt({
  name: 'generateCodePrompt',
  input: {schema: GenerateCodeInputSchema},
  output: {schema: GenerateCodeOutputSchema},
  prompt: `You are an expert Arduino code generator. You will generate Arduino code snippets based on the user's natural language prompt. 

Prompt: {{{prompt}}}

Respond with the code snippet, detected board type (if able to detect), and the required libraries (if any). Return the information as a valid JSON.`,
  config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
  },
});

// Define the flow
const generateCodeFlow = ai.defineFlow(
  {
    name: 'generateCodeFlow',
    inputSchema: GenerateCodeInputSchema,
    outputSchema: GenerateCodeOutputSchema,
  },
  async input => {
    const {output} = await generateCodePrompt(input);
    return output!;
  }
);
