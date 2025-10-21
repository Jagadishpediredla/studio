'use server';

/**
 * @fileOverview Generates a technical analysis report for ESP32 code based on sensor inputs.
 *
 * - generateTechnicalAnalysisReport - A function that generates a technical analysis report.
 * - GenerateTechnicalAnalysisReportInput - The input type for the generateTechnicalAnalysisReport function.
 * - GenerateTechnicalAnalysisReportOutput - The return type for the generateTechnicalAnalysisReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTechnicalAnalysisReportInputSchema = z.object({
  code: z.string().describe('The ESP32 Arduino code to analyze.'),
  sensorData: z.string().describe('The sensor data from the ESP32, such as water sensor readings.'),
});
export type GenerateTechnicalAnalysisReportInput = z.infer<typeof GenerateTechnicalAnalysisReportInputSchema>;

const GenerateTechnicalAnalysisReportOutputSchema = z.object({
  report: z.string().describe('The generated technical analysis report.'),
});
export type GenerateTechnicalAnalysisReportOutput = z.infer<typeof GenerateTechnicalAnalysisReportOutputSchema>;

export async function generateTechnicalAnalysisReport(
  input: GenerateTechnicalAnalysisReportInput
): Promise<GenerateTechnicalAnalysisReportOutput> {
  return generateTechnicalAnalysisReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTechnicalAnalysisReportPrompt',
  input: {schema: GenerateTechnicalAnalysisReportInputSchema},
  output: {schema: GenerateTechnicalAnalysisReportOutputSchema},
  prompt: `You are an expert IoT and embedded systems analyst.

You will analyze the provided ESP32 Arduino code and sensor data to generate a technical analysis report.

The report should identify potential issues, failure modes, and areas for improvement.

Consider the following:

- Code structure and logic
- Sensor data patterns and anomalies
- Potential edge cases and error handling
- Security vulnerabilities

Code:
\`\`\`arduino
{{{code}}}
\`\`\`

Sensor Data:
\`\`\`text
{{{sensorData}}}
\`\`\`
`,
});

const generateTechnicalAnalysisReportFlow = ai.defineFlow(
  {
    name: 'generateTechnicalAnalysisReportFlow',
    inputSchema: GenerateTechnicalAnalysisReportInputSchema,
    outputSchema: GenerateTechnicalAnalysisReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
