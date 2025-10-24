

export type PipelineStep = 'pending' | 'processing' | 'completed' | 'failed';

export type PipelineStatus = {
  serverCheck: PipelineStep;
  codeGen: PipelineStep;
  compile: PipelineStep;
  upload: PipelineStep;
  verify: PipelineStep;
};

export type BoardInfo = {
  fqbn: string;
  libraries: string[];
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
}

export type HistoryItem = {
  id: string;
  code: string;
  board: BoardInfo;
  prompt: string;
  visualizerHtml: string;
  timestamp: Date;
  explanation: string; // AI-generated summary of the code
  buildId?: string; // Link to the build artifact
  binary?: {
    filename: string;
    fileType: string;
  };
};

export interface StatusUpdate {
  timestamp: string; // ISO 8601 string
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface FirebaseStatusUpdate {
  status: 'acknowledged' | 'preparing' | 'installing_libraries' | 'compiling' | 'uploading' | 'completed' | 'failed';
  message: string;
  progress: number;
  timestamp: number;
  serverTimestamp: number;
  phase: string;
  elapsedTime: number;
  iteration: number;
  logId: string;
  buildId: string;
  clientId: string;
  errorDetails?: object;
}

export interface BuildInfo {
    buildId: string;
    requestId: string;
    board: string;
    status: 'completed' | 'failed';
    storage?: 'github' | 'firebase';
    github?: {
        repo: string;
        releaseId: number;
        releaseUrl: string;
        releaseTag: string;
    };
    files: Record<string, {
        filename: string;
        size: number;
        checksum: string;
        downloadUrl?: string;
    }>;
}

export interface OtaProgress {
    message: string;
    progress: number;
    status: 'uploading' | 'success' | 'failed';
}

export interface JobStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number; // in milliseconds
}

export interface JobSummary {
  jobId: string; // logId from the log object
  status: string;
  createdAt: string; // ISO string
  requestId: string;
  buildId: string;
  duration?: number; // Calculated from client-side metrics if available
}

export interface JobDetails {
    logId: string;
    requestId: string;
    buildId: string;
    createdAt: number;
    updatedAt: number;
    status: string;
    phase: string;
    serverSide?: {
        clientId: string;
        hostname: string;
        events: LogEvent[];
        metrics: Record<string, any>;
    };
    clientSide?: {
        userId?: string;
        source?: string;
        events: LogEvent[];
        metrics: Record<string, any>;
    };
    timeline: { [key: string]: TimelineEvent };
}

export interface LogEvent {
    timestamp: number;
    event: string;
    message: string;
    data?: Record<string, any>;
}

export interface TimelineEvent {
    timestamp: number;
    source: 'client' | 'server';
    event: string;
    message: string;
}

export interface CompilationJob {
  id: string;
  status: 'acknowledged' | 'preparing' | 'compiling' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  message: string;
  timestamp: string; // ISO 8601 string
}

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  code: string;
  chatHistory: ChatMessage[];
  versionHistory: HistoryItem[];
  boardInfo: BoardInfo;
}
