
'use server';

import type { BoardInfo, BuildInfo, JobSummary, JobStatistics, JobDetails, LogEvent, TimelineEvent } from '@/lib/types';
import { database, serverTimestamp } from '@/lib/firebase';
import { ref, get, set, child, remove, query, orderByChild, equalTo, limitToLast, push } from 'firebase/database';

const CLIENT_USER_ID = 'user_123'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function findActiveDesktopClient(): Promise<{ success: boolean, clientId?: string, error?: string }> {
  const healthCheckRef = ref(database, `health_check/cloud-client_${Date.now()}`);
  
  try {
    // A quick write & remove to verify DB permissions and connection.
    await set(healthCheckRef, { timestamp: serverTimestamp(), client: 'cloud-client' });
    await remove(healthCheckRef);

    const desktopsRef = ref(database, 'desktops');
    const desktopsSnapshot = await get(desktopsRef);
    const desktops = desktopsSnapshot.val();

    if (!desktops) {
      return { success: false, error: 'Connection to Firebase is OK, but no desktop clients are online. Please ensure the bridge is running.' };
    }

    const activeClients = Object.entries(desktops).filter(([_, info]: [string, any]) => {
      if (info.status !== 'online') return false;
      const lastSeen = info.lastSeen; // lastSeen is a server timestamp
      return (Date.now() - lastSeen) < 30000; // 30 seconds as per docs
    });

    if (activeClients.length === 0) {
      return { success: false, error: 'Connection to Firebase is OK, but no active desktop clients were found. Check bridge status.' };
    }

    return { success: true, clientId: activeClients[0][0] };

  } catch (error: any) {
    console.error('[CLOUD] Firebase Health Check Error:', error);
    let errorMessage = `Failed to connect to Firebase or validate permissions. Check your connection, configuration, and database rules. Details: ${error.message}`;
    return { success: false, error: errorMessage };
  } finally {
    // Ensure cleanup even if other parts fail
    await remove(healthCheckRef).catch(() => {});
  }
}

export async function submitCompilationRequest(payload: { code: string; board: string; libraries: string[]; desktopId: string }) {
  const { code, board, libraries, desktopId } = payload;
  const requestId = generateRequestId();
  
  try {
    const requestRef = ref(database, `requests/${desktopId}/${requestId}`);
    await set(requestRef, {
        code,
        board,
        libraries,
        timestamp: serverTimestamp(),
        clientMetadata: {
          userId: CLIENT_USER_ID,
          source: 'web-app',
        }
    });

    return { success: true, requestId };

  } catch (error: any) {
    return { success: false, error: `[CLOUD] Failed to submit compilation request to Firebase: ${error.message}` };
  }
}

export async function writeClientLog(logId: string, event: string, message: string, data: object = {}) {
    if (!logId) {
        console.warn(`[CLOUD] Attempted to write log but logId is missing. Event: ${event}`);
        return { success: false, error: "logId is missing" };
    }
    const timestamp = Date.now();
    try {
        const logRef = ref(database, `logs/${logId}`);

        // Write to clientSide/events
        const clientEventsRef = child(logRef, 'clientSide/events');
        await push(clientEventsRef, {
            timestamp,
            event,
            message,
            data
        });

        // Write to shared timeline
        const timelineRef = child(logRef, 'timeline');
        await push(timelineRef, {
            timestamp,
            source: 'client',
            event,
            message
        });

        // Update main log timestamp
        const updatedAtRef = child(logRef, 'updatedAt');
        await set(updatedAtRef, timestamp);
        
        return { success: true };
    } catch (error: any) {
        console.error(`[CLOUD] Failed to write client log to Firebase: ${error.message}`);
        return { success: false, error: error.message };
    }
}

export async function getBuildInfo(buildId: string): Promise<{ success: boolean; build?: BuildInfo; error?: string }> {
    try {
        const buildRef = ref(database, `builds/${buildId}`);
        const snapshot = await get(buildRef);
        const buildData = snapshot.val();

        if (!buildData) {
            return { success: false, error: `Build metadata not found in Firebase for buildId: ${buildId}` };
        }
        return { success: true, build: buildData as BuildInfo };
    } catch (error: any) {
        return { success: false, error: `Error fetching build info from Firebase: ${error.message}` };
    }
}

export async function getBinary(buildId: string, fileType: 'hex' | 'bin' | 'elf' = 'bin') {
    try {
        const binaryRef = ref(database, `binaries/${buildId}/${fileType}`);
        const snapshot = await get(binaryRef);
        const data = snapshot.val();
        
        if (!data || !data.binary) {
            return { success: false, error: `Binary for file type '${fileType}' not found in database for buildId: ${buildId}.`};
        }
        
        return { success: true, binary: data.binary, filename: data.filename, size: data.size };
    } catch (error: any) {
        return { success: false, error: `Error fetching binary from Firebase: ${error.message}`};
    }
}

export async function performOtaUpdate(
  firmwareFile: string,
  deviceId: string,
  onProgress: (update: { progress: number; message: string; status: string }) => void
) {
  // This is a simulated OTA update process for demonstration purposes.
  const steps = [
    { progress: 10, message: `Connecting to device ${deviceId}...` },
    { progress: 25, message: 'Device connected. Authenticating...' },
    { progress: 40, message: 'Authenticated. Preparing to send firmware...' },
    { progress: 60, message: `Sending ${firmwareFile}... (Chunk 1/2)` },
    { progress: 85, message: `Sending ${firmwareFile}... (Chunk 2/2)` },
    { progress: 95, message: 'Firmware sent. Verifying checksum...' },
    { progress: 100, message: 'Verification complete. Rebooting device.' },
  ];

  for (const step of steps) {
    onProgress({ ...step, status: 'uploading' });
    await new Promise(resolve => setTimeout(resolve, 750));
  }

  onProgress({ progress: 100, message: 'Update successful!', status: 'success' });
}


// Actions for the Job Dashboard (rewritten for new schema)
export async function getJobs(
  limit: number = 50, 
  statusFilter?: string, 
  userIdFilter?: string
): Promise<{ success: boolean; jobs?: JobSummary[], statistics?: JobStatistics, error?: string }> {
    try {
        const logsRef = ref(database, 'logs');
        const jobsQuery = query(logsRef, orderByChild('createdAt'), limitToLast(limit));
        
        const snapshot = await get(jobsQuery);
        const allLogsData = snapshot.val() || {};
        
        let allJobs: JobDetails[] = Object.values(allLogsData);

        // Filter locally
        if (statusFilter) {
            allJobs = allJobs.filter(job => job.status === statusFilter);
        }
        if (userIdFilter) {
            allJobs = allJobs.filter(job => job.clientSide?.userId === userIdFilter);
        }

        const jobSummaries: JobSummary[] = allJobs.map((log: JobDetails) => ({
            jobId: log.logId,
            status: log.status,
            createdAt: new Date(log.createdAt).toISOString(),
            requestId: log.requestId,
            buildId: log.buildId,
            // Duration can be complex. Let's take client-side total time if available.
            duration: log.clientSide?.metrics?.totalWaitTime,
        }));

        // Sort descending by creation date
        jobSummaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const completedJobs = allJobs.filter(j => j.status === 'completed');
        const totalDuration = completedJobs.reduce((sum, job) => sum + (job.clientSide?.metrics?.totalWaitTime || 0), 0);

        const statistics: JobStatistics = {
            totalJobs: allJobs.length,
            completedJobs: completedJobs.length,
            failedJobs: allJobs.filter(j => j.status === 'failed').length,
            averageDuration: completedJobs.length > 0 ? totalDuration / completedJobs.length : 0,
        };

        return { success: true, jobs: jobSummaries, statistics };

    } catch (error: any) {
        console.error("Failed to fetch jobs from /logs:", error);
        return { success: false, error: error.message };
    }
}

export async function getJobDetails(jobId: string): Promise<{ success: boolean; job?: JobDetails; error?: string }> {
    try {
        const jobRef = ref(database, `logs/${jobId}`);
        const snapshot = await get(jobRef);
        const jobData = snapshot.val();

        if (!jobData) {
            return { success: false, error: `Job log with ID ${jobId} not found.` };
        }
        
        // The data from firebase is the JobDetails object
        return { success: true, job: jobData as JobDetails };

    } catch (error: any) {
        console.error(`Failed to fetch details for job log ${jobId}:`, error);
        return { success: false, error: error.message };
    }
}
