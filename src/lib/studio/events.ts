// Types d'événements SSE émis par Studio API
// Source : @studio/api/src/event-bus.ts (copie locale, pas d'import)

export type SseEventType =
  | 'pipeline_start'
  | 'stage_start'
  | 'stage_complete'
  | 'stage_retry'
  | 'group_start'
  | 'group_iteration'
  | 'group_feedback'
  | 'group_complete'
  | 'pipeline_complete'
  | 'pipeline_cancelled'
  | 'done';

export interface StageStartData {
  stage_name: string;
  stage_index: number;
  total_stages: number;
  max_attempts: number;
}

export interface StageCompleteData {
  stage_name: string;
  stage_index: number;
  total_stages: number;
  status: string; // 'success' | 'failed' | 'rejected'
  attempts: number;
  duration_ms: number;
  output_summary?: string;
  output?: unknown;
}

export interface PipelineCompleteData {
  pipeline_name: string;
  run_id: string;
  status: string; // 'success' | 'failed' | 'cancelled'
  duration_ms: number;
  total_tokens: number;
}
