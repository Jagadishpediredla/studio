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

export async function checkServerHealth() {
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
        return { success: true };
    }
    return { success: false, error: `Server health check failed with status: ${response.status}` };
  } catch (error: any) {
    let errorMessage = `Failed to connect to the compilation server. Is it running?`;
    if (error.cause?.code === 'ECONNREFUSED') {
         errorMessage = `Connection refused at ${API_URL}. Please ensure the compilation server is running.`;
    }
    return { success: false, error: errorMessage };
  }
}

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
    
    let errorText = `Server responded with status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorText = errorData.error || errorText;
    } catch (e) {
        try {
          errorText = await response.text();
        } catch (e) {
            // ignore
        }
    }
    return { success: false, error: `Failed to start compilation: ${errorText}` };

  } catch (error: any)
  {
    let errorMessage = `Failed to connect to the compilation server. Is it running?`;
    if (error.cause?.code === 'ECONNREFUSED') {
         errorMessage = `Connection refused at ${API_URL}. Please ensure the compilation server is running.`;
    } else if (error.message?.includes('API key')) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function getCompilationJobStatus(jobId: string) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/compile/status/${jobId}`, { headers, cache: 'no-store' });
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
