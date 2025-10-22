'use server';

import type { BoardInfo } from '@/lib/types';

interface CompilePayload {
  code: string;
  board: BoardInfo;
}

const API_URL = process.env.COMPILATION_API_URL || 'http://localhost:3001';
const API_KEY = process.env.COMPILATION_API_KEY;

// Note: EventSource on the client does not support custom headers.
// If your streaming endpoint requires auth, you might need to pass the token as a query parameter.
// For this app, we assume the stream endpoint is either unprotected or handles auth differently.
// The main compilation start endpoint WILL use the key.

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

    const data = await response.json();
    if (response.ok) {
        return { success: true, jobId: data.jobId };
    }
    
    return { success: false, error: data.error || 'Failed to start compilation job.' };

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
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, ...data };
        }
        return { success: false, error: data.error || 'Could not fetch job status.' };

    } catch (error: any) {
        let errorMessage = 'Server not available.';
        if (error.message.includes('API key')) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

    