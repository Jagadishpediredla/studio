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
  html: z
    .string()
    .describe(
      'A self-contained HTML document with TailwindCSS that visually explains the code. The HTML should be a full document starting with <body> and should be styled for a dark theme. Use colors and diagrams to represent the logic flow, pin configurations, and components.'
    ),
});

export type GenerateVisualExplanationOutput = z.infer<typeof GenerateVisualExplanationOutputSchema>;

// Define the main function to trigger the code generation flow
export async function generateVisualExplanation(
  input: GenerateVisualExplanationInput
): Promise<GenerateVisualExplanationOutput> {
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
3.  **Visual First:** Prioritize visual elements over text. Use flowcharts, diagrams, and icons to represent logic. Keep text concise. Use SVG icons for clarity (e.g., for pins, LEDs, delays).
4.  **Content:**
    *   Create a clear flowchart for the \`setup()\` and \`loop()\` functions.
    *   Use cards with icons to represent hardware components (like LEDs or sensors) and key actions (like \`delay()\`).
    *   Highlight pin numbers and their modes (INPUT/OUTPUT) visually.
    *   Connect logical steps with arrows to show the flow of execution.
    *   The final output should look like a professional, high-quality technical infographic.

**Example of a good explanation for a simple blink sketch:**
A main container with a title. Two columns or sections, one for \`setup()\` and one for \`loop()\`.
- The \`setup()\` section would have a card with a gear icon: "Initialize Pin 13 as OUTPUT".
- The \`loop()\` section would show a flowchart sequence: A card with a lightbulb-on icon for "Turn LED ON (Pin 13 HIGH)", an arrow, a card with a clock icon for "Wait 1000ms", an arrow, a card with a lightbulb-off icon for "Turn LED OFF (Pin 13 LOW)", and an arrow pointing back to the start of the loop.

Code to explain:
\`\`\`arduino
{{{code}}}
\`\`\`

Generate the HTML body now.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
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
