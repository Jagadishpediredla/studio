
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Arduino code snippets from natural language prompts.
 *   The flow takes a natural language prompt as input and returns an Arduino code snippet.
 *   The file exports:
 *     - generateCode: The main function to trigger the code generation flow.
 */

import {ai} from '@/ai/genkit';
import { GenerateCodeInputSchema, GenerateCodeOutputSchema, type GenerateCodeInput, type GenerateCodeOutput } from '@/ai/schemas';

// Define the main function to trigger the code generation flow
export async function generateCode(input: GenerateCodeInput): Promise<GenerateCodeOutput> {
  return generateCodeFlow(input);
}

// Define the prompt
const generateCodePrompt = ai.definePrompt({
  name: 'generateCodePrompt',
  input: {schema: GenerateCodeInputSchema},
  output: {schema: GenerateCodeOutputSchema},
  prompt: `You are an expert Arduino code generator. You will generate or modify Arduino code based on the user's natural language prompt. If existing code is provided, modify it according to the prompt. Otherwise, generate new code.

Prompt: {{{prompt}}}

Existing Code:
\`\`\`cpp
{{{code}}}
\`\`\`

Instructions:
1. Generate or modify Arduino/ESP32 code based on the user's request
2. Ensure the code is complete, functional, and follows Arduino best practices
3. Include proper error handling and comments for complex sections
4. If modifying existing code, preserve existing functionality unless specifically requested to change it
5. Detect the appropriate board type (e.g., esp32:esp32:esp32, arduino:avr:uno) based on the code or request
6. List any required libraries that need to be installed
7. Return the information as a valid JSON object with the following structure:
   {
     "code": "complete Arduino code",
     "board": "board type (e.g., esp32:esp32:esp32)",
     "libraries": ["array of required library names"]
   }`,
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
