'use server';

import type { BoardInfo, CompilationJob, OtaProgress } from '@/lib/types';

interface CompilePayload {
  code: string;
  board: BoardInfo;
}

const API_URL = process.env.COMPILATION_API_URL || 'http://localhost:3002';
const API_KEY = process.env.COMPILATION_API_KEY;
// A simple, session-specific client ID.
// In a real multi-user app, this would be a stable user or session ID.
const CLIENT_ID = 'aiot-studio-session'; 


const getAuthHeaders = () => {
    if (!API_KEY) {
        throw new Error('Compilation API key is not configured.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Client-ID': CLIENT_ID,
    };
};

export async function checkServerHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal, // Pass the abort signal to fetch
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
        return { success: true };
    }
    return { success: false, error: `Server health check failed with status: ${response.status}` };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Health check timed out. The server might be slow or unreachable.' };
    }
    
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
    console.log("Sending compilation request with payload:", JSON.stringify(payload, null, 2));

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
        
        if (response.ok && data.success) {
            // The new API nests the job object.
            return { success: true, job: data.job };
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


export async function performOtaUpdate(
  fileName: string,
  deviceId: string,
  onProgress: (update: OtaProgress) => void
) {
  const steps = [
    { message: `Connecting to device ${deviceId}...`, duration: 1500, progress: 10 },
    { message: 'Authenticating...', duration: 1000, progress: 20 },
    { message: 'Device authenticated. Preparing for upload...', duration: 500, progress: 25 },
    { message: `Beginning firmware upload: ${fileName}`, duration: 100, progress: 30 },
    { message: 'Uploading chunk 1 of 4...', duration: 2000, progress: 50 },
    { message: 'Uploading chunk 2 of 4...', duration: 2000, progress: 70 },
    { message: 'Uploading chunk 3 of 4...', duration: 2000, progress: 90 },
    { message: 'Uploading chunk 4 of 4...', duration: 1500, progress: 99 },
    { message: 'Finalizing upload...', duration: 1000, progress: 100 },
    { message: 'Verifying checksum...', duration: 1500, progress: 100, status: 'verifying' },
    { message: 'Checksum valid. Device is rebooting.', duration: 2000, progress: 100, status: 'rebooting' },
  ];

  let accumulatedDelay = 0;
  for (const step of steps) {
    accumulatedDelay += step.duration;
    setTimeout(() => {
      onProgress({
        message: step.message,
        progress: step.progress,
        status: 'uploading',
      });
    }, accumulatedDelay);
  }

  // Simulate success or failure
  setTimeout(() => {
    const isSuccess = Math.random() > 0.1; // 90% success rate
    if (isSuccess) {
      onProgress({
        message: 'Update complete. Device is online.',
        progress: 100,
        status: 'success',
      });
    } else {
      onProgress({
        message: 'Error: Checksum mismatch. Please try again.',
        progress: 100,
        status: 'failed',
      });
    }
  }, accumulatedDelay + 1000);
}
