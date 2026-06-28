export type ParameterType = "text" | "select" | "combobox" | "datetime_tag";

export interface TalentRef {
  name: string;
  necessity: "required" | "optional";
}

export interface ParameterDefinition {
  key: string;
  type: ParameterType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export interface PalCapabilities {
  video?: boolean;
  multimodal?: boolean;
  realtime?: boolean;
  audio?: boolean;
  web?: boolean;
  code?: boolean;
  memory?: boolean;
  tools?: boolean;
}

export interface Model {
  id: string;
  author: string;
  repo: string;
  name: string;
  type: string;
  capabilities: string[];
  size: number;
  params: number;
  isDownloaded: boolean;
  downloadUrl: string;
  progress: number;
  filename: string;
  isLocal: boolean;
  defaultCompletionSettings: Record<string, any>;
  completionSettings: Record<string, any>;
  defaultStopWords: string[];
  stopWords: string[];
}

export interface Pal {
  type: "local" | "palshub";
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  systemPrompt: string;
  isSystemPromptChanged: boolean;
  useAIPrompt: boolean;
  defaultModel?: Model;
  color?: [string, string];
  capabilities?: PalCapabilities;
  parameters: Record<string, any>;
  parameterSchema: ParameterDefinition[];
  completionSettings?: Record<string, any>;
  pact?: { talents: TalentRef[] };
  greeting?: { text: string; suggestedPrompts?: string[] };
  source: "local" | "palshub";
  created_at?: string;
  updated_at?: string;
}
