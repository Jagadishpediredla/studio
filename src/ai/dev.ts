'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-code-for-explanation.ts';
import '@/ai/flows/generate-code-from-prompt.ts';
import '@/ai/flows/generate-technical-analysis-report.ts';
import '@/ai/flows/generate-visual-explanation.ts';
