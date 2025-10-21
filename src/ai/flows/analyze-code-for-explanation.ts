'use server';

/**
 * @fileOverview Analyzes given code and provides a natural language explanation of its functionality.
 *
 * - analyzeCodeForExplanation - A function that analyzes code and returns an explanation.
 * - AnalyzeCodeForExplanationInput - The input type for the analyzeCodeForExplanation function.
 * - AnalyzeCodeForExplanationOutput - The return type for the analyzeCodeForExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCodeForExplanationInputSchema = z.object({
  code: z.string().describe('The code to be analyzed.'),
});
export type AnalyzeCodeForExplanationInput = z.infer<typeof AnalyzeCodeForExplanationInputSchema>;

const AnalyzeCodeForExplanationOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation of the code.'),
});
export type AnalyzeCodeForExplanationOutput = z.infer<typeof AnalyzeCodeForExplanationOutputSchema>;

export async function analyzeCodeForExplanation(input: AnalyzeCodeForExplanationInput): Promise<AnalyzeCodeForExplanationOutput> {
  return analyzeCodeForExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCodeForExplanationPrompt',
  input: {schema: AnalyzeCodeForExplanationInputSchema},
  output: {schema: AnalyzeCodeForExplanationOutputSchema},
  prompt: `You are an expert software engineer. Analyze the following code and provide a detailed, natural language explanation of its functionality, purpose, and how it works.\n\nCode:\n{{code}}`,
});

const analyzeCodeForExplanationFlow = ai.defineFlow(
  {
    name: 'analyzeCodeForExplanationFlow',
    inputSchema: AnalyzeCodeForExplanationInputSchema,
    outputSchema: AnalyzeCodeForExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
