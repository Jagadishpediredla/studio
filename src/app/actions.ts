
'use server';

import type { BoardInfo, CompilationJob, OtaProgress, FirebaseStatusUpdate, BuildInfo, JobSummary, JobStatistics, JobDetails, LogEvent } from '@/lib/types';
import { database, serverTimestamp } from '@/lib/firebase';
import { ref, get, set, child, remove, query, orderByChild, equalTo, limitToLast, push } from 'firebase/database';

const CLIENT_USER_ID = 'aiot-studio-user'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function findActiveDesktopClient(): Promise<{ success: boolean, clientId?: string, error?: string }> {
  const healthCheckId = `check_cloud-client_${Date.now()}`;
  const healthCheckRef = ref(database, `health_check/${healthCheckId}`);
  
  try {
    await set(healthCheckRef, { timestamp: Date.now(), client: 'cloud-client' });
    const desktopsRef = ref(database, 'desktops');
    const desktopsSnapshot = await get(desktopsRef);
    const desktops = desktopsSnapshot.val();

    if (!desktops) {
      return { success: false, error: 'Connection to Firebase is OK, but no desktop clients are online. Please ensure the bridge is running.' };
    }

    const activeClients = Object.entries(desktops).filter(([_, info]: [string, any]) => {
      if (info.status !== 'online') return false;
      const lastSeen = new Date(info.lastSeen).getTime();
      return (Date.now() - lastSeen) < 30000; // 30 seconds as per docs
    });

    if (activeClients.length === 0) {
      return { success: false, error: 'Connection to Firebase is OK, but no active desktop clients were found. Check bridge status.' };
    }

    return { success: true, clientId: activeClients[0][0] };

  } catch (error: any)
{
    console.error('[CLOUD] Firebase Health Check Error:', error);
    let errorMessage = `Failed to connect to Firebase or validate permissions. Check your connection, configuration, and database rules. Details: ${error.message}`;
    return { success: false, error: errorMessage };
  } finally {
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
    const timestamp = Date.now();
    try {
        const clientEventsRef = ref(database, `logs/${logId}/clientSide/events`);
        await push(clientEventsRef, {
            timestamp,
            event,
            message,
            data
        });

        const timelineRef = ref(database, `logs/${logId}/timeline`);
        await push(timelineRef, {
            timestamp,
            source: 'client',
            event,
            message
        });

        const updatedAtRef = ref(database, `logs/${logId}/updatedAt`);
        await set(updatedAtRef, timestamp);
        return { success: true };
    } catch (error: any) {
        console.error(`[CLOUD] Failed to write client log to Firebase: ${error.message}`);
        return { success: false, error: error.message };
    }
}


// Functions below are for the dashboard and are not part of the main compilation workflow yet.
// They will be updated in a future step.

export async function getCompilationJobStatus(jobId: string): Promise<{ success: boolean; job?: CompilationJob; error?: string }> {
    try {
        const statusRef = ref(database, `status/${jobId}`);
        const snapshot = await get(statusRef);
        const data: FirebaseStatusUpdate = snapshot.val();
        
        if (!data) {
            return { success: true, job: undefined };
        }
        
        const job: CompilationJob = {
            id: jobId,
            status: data.status,
            progress: data.progress,
            message: data.message,
            phase: data.phase,
            timestamp: new Date(data.timestamp).toISOString(),
            logId: data.logId,
            buildId: data.buildId,
        };

        return { success: true, job };

    } catch (error: any) {
        return { success: false, error: `Error fetching job status from Firebase: ${error.message}` };
    }
}

export async function getBuildInfo(buildId: string): Promise<{ success: boolean; build?: BuildInfo; error?: string }> {
    try {
        const buildRef = ref(database, `builds/${buildId}`);
        const snapshot = await get(buildRef);
        const buildData = snapshot.val();

        if (!buildData) {
            return { success: false, error: `Build ${buildId} not found.` };
        }

        const buildInfo: BuildInfo = {
            buildId: buildId,
            requestId: buildData.requestId,
            board: buildData.board,
            status: buildData.status,
            files: buildData.files,
            totalFiles: buildData.totalFiles,
            logId: buildData.logId,
            clientId: buildData.clientId,
            timestamp: buildData.timestamp,
        };

        return { success: true, build: buildInfo };
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
            return { success: false, error: `Binary for file type '${fileType}' not found in database.`};
        }
        
        return { success: true, binary: data.binary, filename: data.filename, size: data.size };
    } catch (error: any) {
        return { success: false, error: `Error fetching binary from Firebase: ${error.message}`};
    }
}


// Actions for the Job Dashboard
export async function getJobs(
  limit: number = 50, 
  status?: string, 
  userId?: string
): Promise<{ success: boolean; jobs?: JobSummary[], statistics?: JobStatistics, error?: string }> {
    try {
        const jobsRef = query(ref(database, 'job_logs'), limitToLast(limit));
        const snapshot = await get(jobsRef);
        const allJobsData = snapshot.val() || {};
        
        let allJobs: JobDetails[] = Object.values(allJobsData);

        // Filter locally
        if (status) {
            allJobs = allJobs.filter(job => job.status === status);
        }
        if (userId) {
            allJobs = allJobs.filter(job => job.sender?.userId === userId);
        }

        const jobSummaries: JobSummary[] = allJobs.map(job => ({
            jobId: job.jobId,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            duration: job.build?.duration,
            board: job.hardware?.board,
            codeLength: job.code?.length,
            sender: job.sender,
            buildId: job.build?.buildId,
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Most recent first

        const completedJobs = allJobs.filter(j => j.status === 'completed');
        const totalDuration = completedJobs.reduce((sum, job) => sum + (job.build?.duration || 0), 0);

        const statistics: JobStatistics = {
            totalJobs: allJobs.length,
            completedJobs: completedJobs.length,
            failedJobs: allJobs.filter(j => j.status === 'failed').length,
            averageDuration: completedJobs.length > 0 ? totalDuration / completedJobs.length : 0,
        };

        return { success: true, jobs: jobSummaries, statistics };

    } catch (error: any) {
        console.error("Failed to fetch jobs:", error);
        return { success: false, error: error.message };
    }
}

export async function getJobDetails(jobId: string): Promise<JobDetails | { success: false, error: string }> {
    try {
        const jobRef = ref(database, `job_logs/${jobId}`);
        const snapshot = await get(jobRef);
        const jobData = snapshot.val();

        if (!jobData) {
            return { success: false, error: `Job with ID ${jobId} not found.` };
        }
        
        return { success: true, ...jobData };

    } catch (error: any) {
        console.error(`Failed to fetch details for job ${jobId}:`, error);
        return { success: false, error: error.message };
    }
}
