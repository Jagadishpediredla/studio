
'use server';

import type { BoardInfo, CompilationJob, OtaProgress, FirebaseStatusUpdate, BuildInfo, JobSummary, JobStatistics, JobDetails } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, get, set, child, remove, query, orderByChild, equalTo, limitToLast } from 'firebase/database';

// A simple, session-specific client ID.
// In a real multi-user app, this would be a stable user or session ID.
const CLIENT_ID = 'aiot-studio-session'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function checkServerHealth() {
  const healthCheckId = `check_${CLIENT_ID}_${Date.now()}`;
  const healthCheckRef = ref(database, `health_check/${healthCheckId}`);
  
  try {
    await set(healthCheckRef, { timestamp: Date.now(), client: CLIENT_ID });
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

    return { success: true, desktopId: onlineDesktops[0][0] };

  } catch (error: any)
{
    console.error('Firebase Health Check Error:', error);
    let errorMessage = `Failed to connect to Firebase or validate permissions. Check your connection, configuration, and database rules. Details: ${error.message}`;
    return { success: false, error: errorMessage };
  } finally {
    await remove(healthCheckRef).catch(() => {});
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
            return { success: true, job: undefined };
        }
        
        const job: CompilationJob = {
            id: jobId,
            status: data.status,
            progress: data.progress,
            message: data.message,
            timestamp: new Date(data.timestamp).toISOString(),
        };

        return { success: true, job };

    } catch (error: any) {
        return { success: false, error: `Error fetching job status from Firebase: ${error.message}` };
    }
}

export async function getBuildInfo(requestId: string): Promise<{ success: boolean; build?: BuildInfo; error?: string }> {
    try {
        const buildsRef = query(ref(database, 'builds'), orderByChild('requestId'), equalTo(requestId));
        const snapshot = await get(buildsRef);
        const builds = snapshot.val();

        if (!builds) {
            return { success: false, error: 'Build not found for the given request ID.' };
        }

        const buildId = Object.keys(builds)[0];
        const buildData = builds[buildId];

        const buildInfo: BuildInfo = {
            buildId: buildId,
            requestId: buildData.requestId,
            board: buildData.board,
            status: buildData.status,
            files: buildData.files,
        };

        return { success: true, build: buildInfo };
    } catch (error: any) {
        return { success: false, error: `Error fetching build info from Firebase: ${error.message}` };
    }
}

export async function getBinary(buildId: string, fileType: 'hex' | 'bin' = 'bin') {
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

// Placeholder function to fix OTA page
export async function performOtaUpdate(
  fileName: string,
  deviceId: string,
  onProgress: (progress: OtaProgress) => void
) {
  const steps = [
    { progress: 10, message: 'Connecting to device...' },
    { progress: 25, message: 'Authenticating...' },
    { progress: 50, message: `Sending firmware ${fileName}...` },
    { progress: 75, message: 'Flashing...' },
    { progress: 90, message: 'Rebooting device...' },
  ];

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, 800));
    onProgress({
      message: step.message,
      progress: step.progress,
      status: 'uploading',
    });
  }

  await new Promise(resolve => setTimeout(resolve, 800));
  onProgress({
    message: 'Update complete!',
    progress: 100,
    status: 'success',
  });
}


// Actions for the new Job Dashboard
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

    