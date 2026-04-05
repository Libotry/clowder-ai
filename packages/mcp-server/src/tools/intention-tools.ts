/**
 * MCP Intention Tools — report cat's current intention
 * 鉴权: process.env CAT_CAFE_INVOCATION_ID + CAT_CAFE_CALLBACK_TOKEN
 *
 * L1 MVP: 猫猫上报当前意图，前端实时渲染意图气泡
 * 触发时机：开始处理新任务 OR 被阻塞时
 * 解除时机：任务完成 OR 阻塞解除时自动清除
 */

import { z } from 'zod';
import { callbackPost } from './callback-tools.js';
import type { ToolResult } from './file-tools.js';
import { errorResult, successResult } from './file-tools.js';

export const reportIntentionInputSchema = {
  intent: z.string().min(1).max(500).describe('What the cat is currently doing (e.g. "分析 F151 认证模块")'),
  type: z
    .enum(['analyzing', 'implementing', 'waiting', 'blocked'])
    .describe('Intention type: analyzing (blue) = thinking, implementing (green) = doing, waiting (purple) = waiting for result, blocked (amber) = stuck'),
  taskId: z.string().min(1).optional().describe('Optional task ID this intention relates to'),
  blockers: z.string().max(500).optional().describe('What is blocking progress (only for type=blocked)'),
  urgency: z.number().min(0).max(1).optional().describe('Urgency level 0-1 (0=normal, 1=critical). High urgency shows pulse animation in UI.'),
};

export async function handleReportIntention(input: {
  intent: string;
  type: 'analyzing' | 'implementing' | 'waiting' | 'blocked';
  taskId?: string;
  blockers?: string;
  urgency?: number;
}): Promise<ToolResult> {
  const result = await callbackPost('/api/callbacks/report-intention', {
    intent: input.intent,
    type: input.type,
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.blockers ? { blockers: input.blockers } : {}),
    ...(input.urgency !== undefined ? { urgency: input.urgency } : {}),
  });

  if (result.isError) return result;
  return successResult(JSON.stringify({ status: 'ok', intent: input.intent, type: input.type }));
}

export const clearIntentionInputSchema = {
  taskId: z.string().min(1).optional().describe('Optional task ID to clear intention for. If omitted, clears all intentions for this cat.'),
};

export async function handleClearIntention(input: { taskId?: string }): Promise<ToolResult> {
  const result = await callbackPost('/api/callbacks/clear-intention', {
    ...(input.taskId ? { taskId: input.taskId } : {}),
  });

  if (result.isError) return result;
  return successResult(JSON.stringify({ status: 'ok' }));
}

export const intentionTools = [
  {
    name: 'cat_cafe_report_intention',
    description:
      "Report your current intention to the clowder-ai sidebar so users can see what you're working on in real time. " +
      'Use this when you START a new task or when you get BLOCKED. ' +
      'Do NOT use this while you are in the middle of normal execution (no continuous broadcasting). ' +
      'Colors: analyzing=blue, implementing=green, waiting=purple, blocked=amber (not red). ' +
      'Blocked intentions should include a blockers= field describing what is preventing progress.',
    inputSchema: reportIntentionInputSchema,
    handler: handleReportIntention,
  },
  {
    name: 'cat_cafe_clear_intention',
    description:
      "Clear your reported intention — call this when a task is COMPLETED or when a blocked state is RESOLVED. " +
      'This removes your intention bubble from the sidebar. ' +
      'If taskId is provided, only clears the intention for that specific task.',
    inputSchema: clearIntentionInputSchema,
    handler: handleClearIntention,
  },
] as const;
