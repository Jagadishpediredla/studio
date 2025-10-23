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

export type CompilationJobStatus = 'created' | 'preparing' | 'compiling' | 'completed' | 'failed' | 'canceled' | 'submitted';

// Represents one log entry from the server's status updates
export interface StatusUpdate {
  timestamp: string;
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
  createdAt: string;
  completedAt?: string;
  result?: {
    binary: string;
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

// Data structures from Firebase Bridge
export interface FirebaseStatusUpdate {
  status: CompilationJobStatus;
  message: string;
  progress?: number;
  elapsed?: number;
  timestamp: number;
  history?: {
    message: string;
    timestamp: number;
    type: 'info' | 'success' | 'error';
  }[];
  result?: {
    filename: string;
    size: number;
  };
}

export interface FirebaseCompilationJob {
    id: string;
    status: CompilationJobStatus;
    progress?: number;
    statusUpdates: FirebaseStatusUpdate[];
    createdAt: string;
    completedAt?: string;
    result?: {
      binary: string;
      filename: string;
      size: number;
    };
    error?: string | null;
}
