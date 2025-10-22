'use server';

import type { BoardInfo } from '@/lib/types';

interface CompilePayload {
  code: string;
  board: BoardInfo;
}

const API_URL = process.env.COMPILATION_API_URL || 'http://localhost:3001';
const API_KEY = process.env.COMPILATION_API_KEY;

const getAuthHeaders = () => {
    if (!API_KEY) {
        throw new Error('Compilation API key is not configured.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
    };
};

export async function startCompilation(payload: CompilePayload) {
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}/compile/async`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: payload.code,
        board: payload.board.fqbn,
        libraries: payload.board.libraries,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true, jobId: data.jobId };
      }
    }
    
    let errorData;
    let errorMessage;
    try {
      errorData = await response.json();
      errorMessage = errorData.error || 'Failed to start compilation job.';
    } catch (e) {
      errorMessage = await response.text();
    }
    return { success: false, error: errorMessage };

  } catch (error: any) {
    console.error('Network or fetch error:', error);
    let errorMessage = `Failed to connect to the compilation server. Is it running? Error: ${error.message}`;
    if (error.message.includes('API key')) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function getCompilationJobStatus(jobId: string) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/compile/status/${jobId}`, { headers });
        if (response.ok) {
            const data = await response.json();
            return { success: true, ...data };
        }
        return { success: false, error: 'Could not fetch job status.' };
    } catch (error: any) {
        let errorMessage = 'Server not available.';
        if (error.message.includes('API key')) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
