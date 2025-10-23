
'use server';

import type { BoardInfo, CompilationJob, OtaProgress, FirebaseStatusUpdate } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, get, set, child, remove } from 'firebase/database';


// A simple, session-specific client ID.
// In a real multi-user app, this would be a stable user or session ID.
const CLIENT_ID = 'aiot-studio-session'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function checkServerHealth() {
  const healthCheckId = `check_${CLIENT_ID}_${Date.now()}`;
  const healthCheckRef = ref(database, `health_check/${healthCheckId}`);
  
  try {
    // 1. Test WRITE permission by writing a temporary value.
    // The .validate rule in the database ensures this data has the correct shape.
    await set(healthCheckRef, { timestamp: Date.now(), client: CLIENT_ID });

    // 2. Test READ permission by checking for online desktops.
    const desktopsRef = ref(database, 'desktops');
    const desktopsSnapshot = await get(desktopsRef);
    const desktops = desktopsSnapshot.val();

    if (!desktops) {
      return { success: false, error: 'Connection to Firebase is OK, but no desktop clients are online. Please ensure the bridge is running.' };
    }

    const onlineDesktops = Object.entries(desktops).filter(([_, info]: [string, any]) => {
      if (info.status !== 'online') return false;
      const lastSeen = new Date(info.lastSeen).getTime();
      return (Date.now() - lastSeen) < 120000; // 2 minutes
    });

    if (onlineDesktops.length === 0) {
      return { success: false, error: 'Connection to Firebase is OK, but no active desktop clients were found. Check bridge.' };
    }

    // Return the ID of the first available desktop client
    return { success: true, desktopId: onlineDesktops[0][0] };

  } catch (error: any) {
    console.error('Firebase Health Check Error:', error);
    let errorMessage = `Failed to connect to Firebase or validate permissions. Check your connection, configuration, and database rules. Details: ${error.message}`;
    return { success: false, error: errorMessage };
  } finally {
    // 3. Clean up the temporary health check entry.
    await remove(healthCheckRef).catch(() => {}); // Try to clean up, but don't fail the whole operation if it fails.
  }
}

export async function startCompilation(payload: { code: string; board: BoardInfo; desktopId: string }) {
  const { code, board, desktopId } = payload;
  const requestId = generateRequestId();
  
  try {
    const requestRef = ref(database, `requests/${desktopId}/${requestId}`);
    // SIMPLE API: Payload should be simple.
    await set(requestRef, {
        code: code,
        board: board.fqbn,
        libraries: board.libraries || [],
        timestamp: Date.now()
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
            // SIMPLE API: If there's no data, it means the job hasn't been picked up.
            // Return undefined so the UI can show a "waiting" message.
            return { success: true, job: undefined };
        }
        
        // SIMPLE API: Adapt simple FirebaseStatusUpdate to the CompilationJob
        const job: CompilationJob = {
            id: jobId,
            status: data.status,
            progress: data.progress,
            message: data.message,
            createdAt: new Date(data.timestamp).toISOString(),
            completedAt: data.status === 'completed' ? new Date(data.timestamp).toISOString() : undefined,
            error: data.status === 'failed' ? data.message : undefined,
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
        
        return { success: true, binary: data.binary, filename: data.filename, size: data.size };
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
