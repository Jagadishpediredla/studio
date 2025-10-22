'use server';

import type { BoardInfo, CompilationJob } from '@/lib/types';

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
        return { success: true, jobId: data.jobId };
    }
    
    // Handle non-ok responses from the server (e.g., 400, 500 errors)
    let errorText = `Server responded with status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
    } catch (e) {
        // Response was not JSON, use the raw text
        errorText = await response.text();
    }
    return { success: false, error: `Failed to start compilation: ${errorText}` };

  } catch (error: any) {
    console.error('Network or fetch error in startCompilation:', error);
    let errorMessage = `Failed to connect to the compilation server. Is it running?`;
    if (error.code === 'ECONNREFUSED') {
         errorMessage = `Connection refused. Please ensure the compilation server is running at ${API_URL}.`;
    } else if (error.message.includes('API key')) {
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
        let errorMessage = 'Server not available while fetching job status.';
        if (error.message.includes('API key')) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
