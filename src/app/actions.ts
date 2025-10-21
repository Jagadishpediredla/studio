'use server';

import type { BoardInfo } from '@/lib/types';

interface CompilePayload {
  code: string;
  board: BoardInfo;
}

export async function compileCode(payload: CompilePayload) {
  try {
    const response = await fetch('http://localhost:3000/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    return { success: false, error: `Failed to connect to the compilation server. Is it running? Error: ${error.message}` };
  }
}
