export type TalentResult =
  | { type: "html"; html: string; title?: string; summary: string }
  | { type: "text"; summary: string }
  | { type: "audio"; audioUri: string; summary: string }
  | { type: "error"; summary: string; errorMessage: string };

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface TalentEngine {
  readonly name: string;
  readonly recommendedContextTokens?: number;
  execute(args: Record<string, any>): Promise<TalentResult>;
  toToolDefinition(): ToolDefinition;
}
