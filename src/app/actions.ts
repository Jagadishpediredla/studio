'use server';

import type { BoardInfo, CompilationJob, OtaProgress, FirebaseCompilationJob, FirebaseStatusUpdate } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, get, set, child } from 'firebase/database';


// A simple, session-specific client ID.
// In a real multi-user app, this would be a stable user or session ID.
const CLIENT_ID = 'aiot-studio-session'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function checkServerHealth() {
  try {
    const desktopsRef = ref(database, 'desktops');
    const snapshot = await get(desktopsRef);
    const desktops = snapshot.val();

    if (!desktops) {
      return { success: false, error: 'No desktop clients are online. Please ensure the desktop bridge is running.' };
    }

    const onlineDesktops = Object.entries(desktops).filter(([_, info]: [string, any]) => {
      if (info.status !== 'online') return false;
      const lastSeen = new Date(info.lastSeen).getTime();
      // Desktop is online if seen in the last 2 minutes
      return (Date.now() - lastSeen) < 120000; 
    });

    if (onlineDesktops.length === 0) {
      return { success: false, error: 'No active desktop clients found. Please check the bridge connection.' };
    }
    
    // Return the ID of the first available desktop client
    return { success: true, desktopId: onlineDesktops[0][0] };

  } catch (error: any) {
    let errorMessage = `Failed to connect to Firebase. Check your connection and configuration.`;
    return { success: false, error: errorMessage };
  }
}

export async function startCompilation(payload: { code: string; board: BoardInfo; desktopId: string }) {
  const { code, board, desktopId } = payload;
  const requestId = generateRequestId();
  
  try {
    const requestRef = ref(database, `requests/${desktopId}/${requestId}`);
    await set(requestRef, {
        code: code,
        board: board.fqbn,
        libraries: board.libraries || [],
        timestamp: Date.now(),
        clientInfo: {
            id: CLIENT_ID,
            url: 'AIoT Studio Web App',
            timestamp: new Date().toISOString()
        }
    });

    return { success: true, jobId: requestId };

  } catch (error: any) {
    return { success: false, error: `Failed to submit compilation request to Firebase: ${error.message}` };
  }
}

export async function getCompilationJobStatus(jobId: string): Promise<{ success: boolean; job?: CompilationJob; error?: string }> {
    try {
        const statusRef = ref(database, `status/${jobId}`);
        const snapshot = await get(statusRef);
        const data: FirebaseStatusUpdate = snapshot.val();
        
        if (!data) {
            return { success: true, job: undefined }; // Job not started yet
        }
        
        // Adapt FirebaseStatusUpdate to CompilationJob
        const job: CompilationJob = {
            id: jobId,
            status: data.status,
            progress: data.progress,
            statusUpdates: data.history ? data.history.map(h => ({
                jobId: jobId,
                message: h.message,
                timestamp: new Date(h.timestamp).toISOString(),
                type: h.type,
            })) : [{
                jobId,
                message: data.message,
                timestamp: new Date(data.timestamp).toISOString(),
                type: data.status === 'failed' ? 'error' : 'info'
            }],
            createdAt: new Date(data.timestamp).toISOString(), // Approximate
            error: data.status === 'failed' ? data.message : undefined,
            result: data.status === 'completed' ? {
                binary: '', // This will be fetched separately
                filename: data.result?.filename || 'firmware.bin',
                size: data.result?.size || 0,
            } : undefined,
            completedAt: data.status === 'completed' ? new Date(data.timestamp).toISOString() : undefined,
        };

        return { success: true, job };

    } catch (error: any) {
        return { success: false, error: `Error fetching job status from Firebase: ${error.message}` };
    }
}

export async function getBinary(jobId: string) {
    try {
        const binaryRef = ref(database, `binaries/${jobId}`);
        const snapshot = await get(binaryRef);
        const data = snapshot.val();
        
        if (!data || !data.binary) {
            return { success: false, error: 'Binary not found in database.'};
        }
        
        return { success: true, binary: data.binary, filename: data.filename };
    } catch (error: any) {
        return { success: false, error: `Error fetching binary from Firebase: ${error.message}`};
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
