
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

// Represents the direct status object from Firebase
export interface FirebaseStatusUpdate {
  status: 'acknowledged' | 'preparing' | 'compiling' | 'uploading' | 'completed' | 'failed';
  message: string;
  progress?: number;
  timestamp: number;
}
    
// Simplified CompilationJob for the frontend
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
