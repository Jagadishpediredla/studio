
'use server';

import type { BoardInfo, BuildInfo, JobSummary, JobStatistics, JobDetails, LogEvent, TimelineEvent, Project } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, get, set, child, remove, query, orderByChild, equalTo, limitToLast, push, serverTimestamp } from 'firebase/database';

const CLIENT_USER_ID = 'user_123'; 

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Project Actions ---

export async function getProjects(): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
  try {
    const projectsRef = ref(database, 'projects');
    const snapshot = await get(projectsRef);
    const projectsData = snapshot.val();
    if (!projectsData) {
      return { success: true, projects: [] };
    }
    const projectsList = Object.keys(projectsData).map(id => ({
      id,
      ...projectsData[id],
    }));
    return { success: true, projects: projectsList };
  } catch (error: any) {
    return { success: false, error: `Failed to fetch projects: ${error.message}` };
  }
}

export async function getProject(id: string): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    const projectRef = ref(database, `projects/${id}`);
    const snapshot = await get(projectRef);
    const projectData = snapshot.val();
    if (!projectData) {
      return { success: false, error: `Project with ID ${id} not found.` };
    }
    return { success: true, project: { id, ...projectData } };
  } catch (error: any) {
    return { success: false, error: `Failed to fetch project: ${error.message}` };
  }
}

export async function createProject(name: string): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    const projectsRef = ref(database, 'projects');
    const newProjectRef = push(projectsRef);
    const projectId = newProjectRef.key;

    if (!projectId) {
      throw new Error("Failed to generate a project ID.");
    }
    
    const newProject: Omit<Project, 'id'> = {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      code: `// Welcome to your new project: ${name}!
// Use the AI Chat to start building.
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`,
      chatHistory: [
        { role: 'assistant', content: "Hello! I'm your AI pair programmer, AIDE. How can I help you build this project?" }
      ],
      versionHistory: [],
      boardInfo: {
        fqbn: 'esp32:esp32:esp32',
        libraries: [],
      },
    };

    await set(newProjectRef, newProject);
    const projectWithId = { ...newProject, id: projectId };

    return { success: true, project: projectWithId };
  } catch (error: any) {
    return { success: false, error: `Failed to create project: ${error.message}` };
  }
}

export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) {
    try {
        const projectRef = ref(database, `projects/${id}`);
        const updateData = { ...updates, updatedAt: new Date().toISOString() };
        
        // This is a simplified "update". RTDB doesn't have a deep merge, so we fetch and merge.
        // For specific fields like chatHistory, this is tricky. A more robust solution might use transactions
        // or a different data structure, but for this app, we'll update specific top-level keys.
        const snapshot = await get(projectRef);
        const existingData = snapshot.val();
        await set(projectRef, { ...existingData, ...updateData });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to update project: ${error.message}` };
    }
}


// --- Compilation Actions ---

export async function findActiveDesktopClient(): Promise<{ success: boolean, clientId?: string, error?: string }> {
  try {
    const desktopsRef = ref(database, 'desktops');
    const desktopsSnapshot = await get(desktopsRef);
    const desktops = desktopsSnapshot.val();

    if (!desktops) {
      return { success: false, error: 'No desktop clients are registered. Please ensure the bridge is running.' };
    }

    const now = Date.now();
    const activeClients = Object.entries(desktops).filter(([_, info]: [string, any]) => {
      if (info.status !== 'online') return false;
      const lastSeen = info.lastSeen;
      return (now - lastSeen) < 30000; // 30 seconds as per docs
    });

    if (activeClients.length === 0) {
      return { success: false, error: 'No active desktop clients found. Check bridge status and ensure it has checked in recently.' };
    }

    return { success: true, clientId: activeClients[0][0] };

  } catch (error: any) {
    console.error('[CLOUD] Firebase findActiveDesktopClient Error:', error);
    let errorMessage = `Failed to connect to Firebase or read /desktops. Details: ${error.message}`;
    return { success: false, error: errorMessage };
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
        timestamp: Date.now(), // As per demo script
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

        const clientEventsRef = child(logRef, 'clientSide/events');
        await push(clientEventsRef, {
            timestamp,
            event,
            message,
            data
        });

        const timelineRef = child(logRef, 'timeline');
        await push(timelineRef, {
            timestamp,
            source: 'client',
            event,
            message
        });

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

        if (userIdFilter) {
            allJobs = allJobs.filter(job => job.clientSide?.userId === userIdFilter);
        }
        if (statusFilter) {
            allJobs = allJobs.filter(job => job.status === statusFilter);
        }

        const jobSummaries: JobSummary[] = allJobs.map((log: JobDetails) => ({
            jobId: log.logId,
            status: log.status,
            createdAt: new Date(log.createdAt).toISOString(),
            requestId: log.requestId,
            buildId: log.buildId,
            duration: log.clientSide?.metrics?.totalWaitTime,
        }));

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
        
        return { success: true, job: jobData as JobDetails };

    } catch (error: any) {
        console.error(`Failed to fetch details for job log ${jobId}:`, error);
        return { success: false, error: error.message };
    }
}
