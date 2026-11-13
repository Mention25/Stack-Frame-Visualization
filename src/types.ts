export type StackEntry = {
  address: number;
  value: string;
  label?: string;
  highlight?: boolean;
  owner?: string;
  freed?: boolean;
  bytes?: string;
};

export type RegisterState = {
  [key: string]: number | string | undefined;
  rsp: number | string;
  rbp: number | string;
  rip: string;
  rax?: string;
  rdi?: string;
};

export type CodeLine = {
  num: number;
  text: string;
  indent?: number;
};

export type AsmLine = {
  num: number;
  text: string;
  fn: string;
  type: "label" | "inst";
  comment?: string;
};

export type Phase = {
  name: string;
  startStep: number;
};

export type ExecutionStep = {
  title: string;
  description: string;
  currentFunction: string;
  highlightedAsmLine: number;
  cCodeLine?: number;
  registers: RegisterState;
  stack: StackEntry[];
};

export type ExecutionTrace = {
  id: string;
  title: string;
  description: string;
  cCode: CodeLine[];
  asmCode: AsmLine[];
  phases: Phase[];
  steps: ExecutionStep[];
};
