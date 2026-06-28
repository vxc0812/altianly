import type { TalentEngine, TalentResult, ToolDefinition } from "./types";

/**
 * HealthDataTalent - A PocketPal-style talent for accessing health data
 * 
 * This talent integrates with Apple Health (iOS) and Google Health Connect (Android)
 * to provide health metrics to the AI trainer agent.
 */

export type HealthDataType = 
  | "weight" 
  | "heart_rate" 
  | "steps" 
  | "sleep" 
  | "workouts"
  | "body_fat"
  | "blood_pressure"
  | "oxygen_saturation";

export interface HealthQueryResult {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
  samples: HealthSample[];
  summary?: HealthSummary;
}

export interface HealthSample {
  identifier: string;
  value: number | string;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface HealthSummary {
  average?: number;
  minimum?: number;
  maximum?: number;
  trend?: "increasing" | "decreasing" | "stable";
  changePercent?: number;
}

interface HealthDataManagerInterface {
  requestPermissions(): Promise<boolean>;
  queryData(dataType: HealthDataType, startDate: string, endDate: string): Promise<HealthQueryResult>;
  getAvailableTypes(): Promise<HealthDataType[]>;
}

let healthDataManager: HealthDataManagerInterface = {
  async requestPermissions() { return true; },
  async queryData(dataType, startDate, endDate) {
    const samples = [] as HealthSample[];
    return { dataType, startDate, endDate, samples, summary: undefined };
  },
  async getAvailableTypes() { return ["weight", "heart_rate", "steps", "sleep", "workouts"] as HealthDataType[]; },
};

export function setHealthDataManager(manager: HealthDataManagerInterface) {
  healthDataManager = manager;
}

export class HealthDataTalent implements TalentEngine {
  readonly name = "health_data";
  readonly recommendedContextTokens = 512;
  
  async execute(args: Record<string, any>): Promise<TalentResult> {
    const dataType = args.dataType as HealthDataType;
    const startDate = args.startDate as string;
    const endDate = args.endDate as string;
    
    if (!dataType) {
      return {
        type: "error",
        summary: "health_data: missing dataType argument",
        errorMessage: "dataType is required",
      };
    }
    
    try {
      const result = await healthDataManager.queryData(dataType, startDate, endDate);
      return {
        type: "text",
        summary: JSON.stringify({
          dataType,
          startDate,
          endDate,
          sampleCount: result.samples.length,
          samples: result.samples,
          summary: result.summary,
        }, null, 2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: "error",
        summary: `health_data: failed to query ${dataType}`,
        errorMessage,
      };
    }
  }
  
  toToolDefinition(): ToolDefinition {
    return {
      type: "function",
      function: {
        name: "health_data",
        description: "Query health metrics from Apple Health or Google Health Connect",
        parameters: {
          type: "object",
          properties: {
            dataType: {
              type: "string",
              enum: ["weight", "heart_rate", "steps", "sleep", "workouts"],
            },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
          required: ["dataType", "startDate", "endDate"],
        },
      },
    };
  }
}

export const healthDataTalent = new HealthDataTalent();
