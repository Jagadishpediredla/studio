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

export type CompilationJobStatus = 'created' | 'preparing' | 'installing' | 'compiling' | 'completed' | 'failed' | 'canceled';

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
