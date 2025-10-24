
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

// The output can be complex, containing tool requests or just text. 
// Defining a specific output schema for the flow itself is less critical 
// than for the tools and prompts, so 'any' is acceptable here for flexibility.
export const AideChatOutputSchema = z.any();
export type AideChatOutput = z.infer<typeof AideChatOutputSchema>;


// Schemas for analyze-code-for-explanation.ts
export const AnalyzeCodeForExplanationInputSchema = z.object({
  code: z.string().describe('The code to be analyzed.'),
});
export type AnalyzeCodeForExplanationInput = z.infer<typeof AnalyzeCodeForExplanationInputSchema>;

export const AnalyzeCodeForExplanationOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation of the code.'),
});
export type AnalyzeCodeForExplanationOutput = z.infer<typeof AnalyzeCodeForExplanationOutputSchema>;


// Schemas for generate-visual-explanation.ts
export const GenerateVisualExplanationInputSchema = z.object({
  code: z.string().describe('The Arduino code to be visually explained.'),
});
export type GenerateVisualExplanationInput = z.infer<typeof GenerateVisualExplanationInputSchema>;

export const GenerateVisualExplanationOutputSchema = z.object({
  html: z
    .string()
    .describe(
      'A self-contained HTML document with TailwindCSS that visually explains the code. The HTML should be a full document starting with <body> and should be styled for a dark theme. Use colors and diagrams to represent the logic flow, pin configurations, and components.'
    ),
});
export type GenerateVisualExplanationOutput = z.infer<typeof GenerateVisualExplanationOutputSchema>;


// Schemas for generate-technical-analysis-report.ts
export const GenerateTechnicalAnalysisReportInputSchema = z.object({
  code: z.string().describe('The ESP32 Arduino code to analyze.'),
  sensorData: z.string().describe('The sensor data from the ESP32, such as water sensor readings.'),
});
export type GenerateTechnicalAnalysisReportInput = z.infer<typeof GenerateTechnicalAnalysisReportInputSchema>;

export const GenerateTechnicalAnalysisReportOutputSchema = z.object({
  report: z.string().describe('The generated technical analysis report.'),
});
export type GenerateTechnicalAnalysisReportOutput = z.infer<typeof GenerateTechnicalAnalysisReportOutputSchema>;
