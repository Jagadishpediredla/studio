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

export type CompilationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface CompilationJob {
  id: string;
  status: CompilationJobStatus;
  statusUpdates: string[];
  createdAt: string;
  completedAt?: string;
  result?: {
    binary: string;
    filename: string;
  };
  error?: string | null;
}
