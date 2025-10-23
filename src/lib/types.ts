

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

export type CompilationJobStatus = 'created' | 'preparing' | 'compiling' | 'completed' | 'failed' | 'canceled' | 'submitted' | 'received';

// Represents one log entry from the server's status updates, aligned with the new API
export interface StatusUpdate {
  timestamp: string; // ISO 8601 string
  message: string;
  type: 'info' | 'success' | 'error';
  details?: any;
  jobId: string;
}

export interface CompilationJob {
  id: string;
  status: CompilationJobStatus;
  progress?: number;
  statusUpdates: StatusUpdate[];
  createdAt: string; // ISO 8601 string
  completedAt?: string; // ISO 8601 string
  result?: {
    binary: string; // This is not the data itself, just a marker.
    filename: string;
    size: number;
  };
  error?: string | null;
}

export interface OtaProgress {
    message: string;
    progress: number;
    status: 'uploading' | 'success' | 'failed';
}

// Data structures from the Enhanced Firebase Bridge API
export interface FirebaseHistoryEntry {
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'error';
}

export interface FirebaseStatusUpdate {
  status: CompilationJobStatus;
  message: string;
  progress?: number;
  elapsed?: number;
  timestamp: number;
  history?: FirebaseHistoryEntry[];
  result?: {
    filename: string;
    size: number;
  };
  enhanced?: {
    phase: string;
    totalUpdates: number;
    totalTime?: number;
  };
}
    
