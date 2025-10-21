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
  explanation: string;
  visualizerCode: string;
  timestamp: Date;
};
