
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

// SIMPLE API: Represents a log entry or a status update message.
export interface StatusUpdate {
  timestamp: string; // ISO 8601 string
  message: string;
  type: 'info' | 'success' | 'error';
}

// SIMPLE API: Represents the direct status object from Firebase
export interface FirebaseStatusUpdate {
  status: CompilationJobStatus;
  message: string;
  progress?: number;
  timestamp: number;
}
    
// SIMPLE API: Simplified CompilationJob for the frontend
export interface CompilationJob {
  id: string;
  status: CompilationJobStatus;
  progress?: number;
  message: string;
  createdAt: string; // ISO 8601 string
  completedAt?: string; // ISO 8601 string
  error?: string | null;
}

export interface OtaProgress {
    message: string;
    progress: number;
    status: 'uploading' | 'success' | 'failed';
}
