'use server';

import type { BoardInfo } from '@/lib/types';

interface CompilePayload {
  code: string;
  board: BoardInfo;
}

const API_URL = process.env.COMPILATION_API_URL || 'http://localhost:3000';
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

export async function compileCode(payload: CompilePayload) {
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}/compile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: payload.code,
        board: payload.board.fqbn,
        libraries: payload.board.libraries,
      }),
    });

    if (response.ok) {
      const firmwareBlob = await response.blob();
      // Convert blob to a base64 string to send back to the client
      const buffer = await firmwareBlob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      return { 
        success: true, 
        firmware: base64, 
        contentType: firmwareBlob.type || 'application/octet-stream' 
      };
    } else {
      const errorData = await response.json();
      // Ensure a consistent error format
      const errorMessage = errorData.error || 'An unknown compilation error occurred.';
      return { success: false, error: errorMessage, statusUpdates: errorData.statusUpdates || [] };
    }
  } catch (error: any) {
    console.error('Network or fetch error:', error);
    let errorMessage = `Failed to connect to the compilation server. Is it running? Error: ${error.message}`;
    if (error.message.includes('API key')) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function getCompilationStatus() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/status`, { headers });
        if (response.ok) {
            const data = await response.json();
            return { success: true, ...data };
        }
        return { success: false, message: 'Could not fetch status.' };
    } catch (error: any) {
        let errorMessage = 'Server not available.';
        if (error.message.includes('API key')) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
}
