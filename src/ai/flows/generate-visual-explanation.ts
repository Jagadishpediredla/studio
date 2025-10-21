'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a visual HTML explanation of Arduino code.
 *   - generateVisualExplanation: The main function to trigger the flow.
 *   - GenerateVisualExplanationInput: The input type for the function.
 *   - GenerateVisualExplanationOutput: The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const GenerateVisualExplanationInputSchema = z.object({
  code: z.string().describe('The Arduino code to be visually explained.'),
});

export type GenerateVisualExplanationInput = z.infer<typeof GenerateVisualExplanationInputSchema>;

// Define the output schema
const GenerateVisualExplanationOutputSchema = z.object({
  html: z.string().describe('A self-contained HTML document with TailwindCSS that visually explains the code. The HTML should be a full document starting with <body> and should be styled for a dark theme. Use colors and diagrams to represent the logic flow, pin configurations, and components.'),
});

export type GenerateVisualExplanationOutput = z.infer<typeof GenerateVisualExplanationOutputSchema>;

// Define the main function to trigger the code generation flow
export async function generateVisualExplanation(input: GenerateVisualExplanationInput): Promise<GenerateVisualExplanationOutput> {
  return generateVisualExplanationFlow(input);
}

// Define the prompt
const generateVisualExplanationPrompt = ai.definePrompt({
  name: 'generateVisualExplanationPrompt',
  input: {schema: GenerateVisualExplanationInputSchema},
  output: {schema: GenerateVisualExplanationOutputSchema},
  prompt: `You are an expert at creating beautiful, easy-to-understand visual explanations for code.

Generate a self-contained HTML document that visually explains the provided Arduino code.

**Requirements:**
1.  **HTML Structure:** The output MUST be a valid HTML snippet containing only the content for the <body> tag. Do not include <html>, <head>, or <style> tags.
2.  **Styling:** Use Tailwind CSS classes directly in the HTML for all styling. Assume Tailwind is available. The design should be modern, clean, and optimized for a dark theme (e.g., dark backgrounds like \`bg-gray-900\`, light text \`text-gray-100\`, and accent colors like \`text-blue-400\`).
3.  **Content:**
    *   Clearly identify the main parts of the code (\`setup()\` and \`loop()\`).
    *   Use cards, flowcharts, or diagrams to represent the logic.
    *   Highlight key functions, variables, and pin numbers.
    *   Provide concise explanations for each logical step.
    *   Make it look like a professional, high-quality technical diagram.

**Example of a good explanation for a simple blink sketch:**
A main container with a title. Two columns or sections, one for \`setup()\` and one for \`loop()\`.
- The \`setup()\` section would have a card saying "Pin 13 set to OUTPUT".
- The \`loop()\` section would show a sequence: a card for "Turn LED ON (Pin 13 HIGH)", an arrow, a card for "Wait 1000ms", an arrow, a card for "Turn LED OFF (Pin 13 LOW)", and so on.

Code to explain:
\`\`\`arduino
{{{code}}}
\`\`\`

Generate the HTML body now.`,
});

// Define the flow
const generateVisualExplanationFlow = ai.defineFlow(
  {
    name: 'generateVisualExplanationFlow',
    inputSchema: GenerateVisualExplanationInputSchema,
    outputSchema: GenerateVisualExplanationOutputSchema,
  },
  async input => {
    const {output} = await generateVisualExplanationPrompt(input);
    return output!;
  }
);
