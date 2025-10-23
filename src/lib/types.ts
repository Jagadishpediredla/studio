
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

// Simple status update from Firebase, as per the new "SIMPLE API USAGE GUIDE"
export interface StatusUpdate {
  timestamp: string; // ISO 8601 string
  message: string;
  type: 'info' | 'success' | 'error';
}

// Represents a job status object from Firebase
export interface FirebaseStatusUpdate {
  status: CompilationJobStatus;
  message: string;
  progress?: number;
  timestamp: number;
}
    
// Simplified CompilationJob for the frontend, based on the simple API
export interface CompilationJob {
  id: string;
  status: CompilationJobStatus;
  progress?: number;
  message: string;
  createdAt: string; // ISO 8601 string
  completedAt?: string; // ISO 8601 string
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
