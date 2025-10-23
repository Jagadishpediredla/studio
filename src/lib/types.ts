
export type PipelineStep = 'pending' | 'processing' | 'completed' | 'failed';

export type PipelineStatus = {
  codeGen: PipelineStep;
  compile: PipelineStep;
  upload: PipelineStep;
  verify: PipelineStep;
};

export type BoardInfo = {
  fqbn: string;
  libraries: string[];
};

export type HistoryItem = {
  id: string;
  code: string;
  board: BoardInfo;
  prompt: string;
  visualizerHtml: string;
  timestamp: Date;
};

// Represents a log entry or a status update message.
export interface StatusUpdate {
  timestamp: string; // ISO 8601 string
  message: string;
  type: 'info' | 'success' | 'error';
}

// Represents the direct status object from Firebase (legacy)
export interface FirebaseStatusUpdate {
  status: 'acknowledged' | 'preparing' | 'compiling' | 'uploading' | 'completed' | 'failed';
  message: string;
  progress?: number;
  timestamp: number;
}
    
// Simplified CompilationJob for the frontend (legacy)
export interface CompilationJob {
  id: string;
  status: 'acknowledged' | 'preparing' | 'compiling' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  message: string;
  timestamp: string; // ISO 8601 string
}

export interface BuildInfo {
    buildId: string;
    requestId: string;
    board: string;
    status: 'completed' | 'failed';
    files: Record<string, {
        filename: string;
        size: number;
        checksum: string;
    }>;
}

export interface OtaProgress {
    message: string;
    progress: number;
    status: 'uploading' | 'success' | 'failed';
}


// New Enhanced Types from Final Documentation

export interface JobStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number;
}

export interface JobSummary {
  jobId: string;
  status: string;
  progress: number;
  createdAt: string;
  duration?: number;
  board?: string;
  codeLength?: number;
  sender?: { userId?: string; source?: string };
  buildId?: string;
}

export interface JobDetails {
  success: boolean;
  jobId: string;
  status: string;
  progress: number;
  createdAt: string;
  lastUpdated: string;
  code?: {
    length: number;
    lines: number;
    hash: string;
    includes: string[];
    functions: string[];
  };
  hardware?: {
    board: string;
    libraries: string[];
    requiredCores: string;
  };
  sender?: {
    source: string;
    userId: string;
    sessionId: string;
    userAgent: string;
    ip: string;
    platform: string;
  };
  cloudSync?: {
    firebaseConnected: boolean;
    lastSyncTime: string;
    syncAttempts: number;
    syncErrors: any[];
    realTimeUpdates: boolean;
  };
  build?: {
    buildId: string;
    startTime: string;
    endTime: string;
    duration: number;
    success: boolean;
    binaryFiles: {
      filename: string;
      type: string;
      size: number;
      generatedAt: string;
    }[];
    compilerOutput: {
      timestamp: string;
      output: string;
      type: string;
    }[];
    errors: any[];
    warnings: any[];
  };
  system?: {
    hostname: string;
    platform: string;
    nodeVersion: string;
    memoryUsage: object;
    cpuUsage: object;
  };
  performance?: {
    phases: {
      [key: string]: {
        duration: number;
        startTime: string;
        endTime: string;
      };
    };
    bottlenecks: any[];
  };
  timeline?: {
    timestamp: string;
    status: string;
    message: string;
    progress: number;
    phase: string;
    cloudSync: {
      attempted: boolean;
      success: boolean;
      latency: number;
    };
  }[];
  isRunning?: boolean;
  isCompleted?: boolean;
  isFailed?: boolean;
  downloads?: {
    [key: string]: string;
  };
  error?: string;
}

export interface JobLogData {
    metadata: any;
    timeline: any[];
    compilation: any;
    performance: any;
    system: any;
}
