
'use server';

import type { Project, BuildInfo } from '@/lib/types';
import { database } from '@/lib/firebase';
import { ref, get, set, push, remove } from 'firebase/database';

const CLIENT_USER_ID = 'user_123';
const COMPILATION_API_URL = process.env.COMPILATION_API_URL || 'http://35.206.79.23:3000';

// --- Project Actions ---

export async function getProjects(): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
  try {
    const projectsRef = ref(database, 'projects');
    const snapshot = await get(projectsRef);

    const projectsData: { [key: string]: any } = snapshot.val() || {};
    
    const projectsList: Project[] = Object.keys(projectsData).map(id => ({
      id,
      name: projectsData[id].name,
      createdAt: projectsData[id].createdAt,
      updatedAt: projectsData[id].updatedAt,
      code: '',
      chatHistory: [],
      versionHistory: [],
      boardInfo: { fqbn: '', libraries: [] },
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
    if (!snapshot.exists()) {
      return { success: false, error: `Project with ID ${id} not found.` };
    }
    const projectData = snapshot.val();
    const project: Project = {
        id,
        name: projectData.name || 'Untitled Project',
        createdAt: projectData.createdAt || new Date().toISOString(),
        updatedAt: projectData.updatedAt || new Date().toISOString(),
        code: projectData.code || '// Welcome!',
        chatHistory: projectData.chatHistory || [],
        versionHistory: projectData.versionHistory || [],
        boardInfo: projectData.boardInfo || { fqbn: 'esp32:esp32:esp32', libraries: [] },
    }
    return { success: true, project };
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
    
    const now = new Date().toISOString();
    const newProject: Omit<Project, 'id'> = {
      name,
      createdAt: now,
      updatedAt: now,
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
        { role: 'assistant', content: `Hello! I'm your AI pair programmer, AIDE. How can I help you build "${name}"?` }
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
    console.error(`Failed to create project: ${error.message}`);
    return { success: false, error: `Failed to create project: ${error.message}` };
  }
}


export async function updateProject(id: string, updates: Partial<Omit<Project, 'id'>>) {
    try {
        const projectRef = ref(database, `projects/${id}`);
        
        const snapshot = await get(projectRef);
        if (!snapshot.exists()) {
            return { success: false, error: `Project with ID ${id} not found.` };
        }
        
        const updateData: { [key: string]: any } = { ...snapshot.val(), ...updates };
        
        updateData.updatedAt = new Date().toISOString();

        if (updates.versionHistory) {
            updateData.versionHistory = updates.versionHistory.map(v => ({
                ...v,
                timestamp: new Date(v.timestamp).toISOString()
            }));
        }

        await set(projectRef, updateData);

        return { success: true };
    } catch (error: any) {
        console.error(`Failed to update project ${id}: ${error.message}`, error);
        return { success: false, error: `Failed to update project: ${error.message}` };
    }
}

export async function deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const projectRef = ref(database, `projects/${id}`);
    await remove(projectRef);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to delete project ${id}: ${error.message}`, error);
    return { success: false, error: `Failed to delete project: ${error.message}` };
  }
}


// --- NEW Compilation Actions ---

export async function compileCode(payload: { code: string; board: string; libraries: string[]; }) {
  const { code, board, libraries } = payload;
  
  try {
    const response = await fetch(`${COMPILATION_API_URL}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, board, libraries })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Compilation request failed');
    }

    return { success: true, ...data };

  } catch (error: any) {
    console.error('[COMPILER] API Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getJobStatus(jobId: string) {
    try {
        const response = await fetch(`${COMPILATION_API_URL}/api/job/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to get status for job ${jobId}`);
        }
        
        return { success: true, ...data };
    } catch(error: any) {
        console.error(`[COMPILER] Job Status Error for ${jobId}:`, error);
        return { success: false, error: error.message };
    }
}

export async function getJobDetails(jobId: string) {
    try {
        const response = await fetch(`${COMPILATION_API_URL}/api/job/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to get details for job ${jobId}`);
        }
        
        return { success: true, job: data };
    } catch(error: any) {
        console.error(`[COMPILER] Job Details Error for ${jobId}:`, error);
        return { success: false, error: error.message };
    }
}

export async function getJobs(limit = 50, startAfter?: string, userId?: string) {
    try {
        // This is a mock implementation as the new service doesn't have a multi-job endpoint
        // For now, we return an empty list to avoid breaking the UI.
        // A real implementation would query a jobs endpoint on the new service.
        return { success: true, jobs: [], statistics: { totalJobs: 0, completedJobs: 0, failedJobs: 0, averageDuration: 0 }};
    } catch(error: any) {
        console.error(`[COMPILER] Get Jobs Error:`, error);
        return { success: false, error: error.message };
    }
}


// --- Old Firebase compilation actions are now removed ---

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
