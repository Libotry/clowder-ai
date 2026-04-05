/**
 * Decision Log Tools — 决策日志 MCP 接口
 *
 * 让猫猫能够：创建决策、确认决策、查询决策、检查上下文授权
 */

import { z } from 'zod';
import { callbackPost, callbackGet } from './callback-tools.js';
import type { ToolResult } from './file-tools.js';

// ============ Input schemas ============

export const createDecisionInputSchema = {
  intent: z.string().min(1).max(1000).describe('决策内容摘要'),
  rationale: z.string().min(1).max(2000).describe('为什么这样决定'),
  evidence: z.array(z.string()).default([]).describe('参考文档/代码/对话 URL'),
  relatedDecisions: z.array(z.string()).default([]).describe('关联的其他决策 ID'),
  taskId: z.string().optional().describe('关联的任务 ID'),
  supersededBy: z.string().optional().describe('被哪个决策更新了'),
};

export const acknowledgeDecisionInputSchema = {
  decisionId: z.string().min(1).describe('要确认的决策 ID'),
};

export const listDecisionsInputSchema = {
  catId: z.string().optional().describe('按猫猫过滤'),
  taskId: z.string().optional().describe('按任务过滤'),
  limit: z.number().int().min(1).max(100).optional().default(20).describe('返回数量'),
};

export const checkContextInputSchema = {
  targetAction: z.string().min(1).describe('目标行动（用于匹配相关决策）'),
  catId: z.string().optional().describe('要检查的猫（默认当前猫）'),
};

// ============ Handlers ============

export async function handleCreateDecision(input: {
  intent: string;
  rationale: string;
  evidence?: string[];
  relatedDecisions?: string[];
  taskId?: string;
  supersededBy?: string;
}): Promise<ToolResult> {
  return callbackPost('/api/callbacks/create-decision', {
    decision: input.intent,
    rationale: input.rationale,
    evidence: input.evidence ?? [],
    relatedDecisions: input.relatedDecisions ?? [],
    taskId: input.taskId,
    supersededBy: input.supersededBy,
  });
}

export async function handleAcknowledgeDecision(input: { decisionId: string }): Promise<ToolResult> {
  return callbackPost('/api/callbacks/acknowledge-decision', {
    decisionId: input.decisionId,
  });
}

export async function handleListDecisions(input: {
  catId?: string;
  taskId?: string;
  limit?: number;
}): Promise<ToolResult> {
  const params: Record<string, string> = {};
  if (input.catId) params['catId'] = input.catId;
  if (input.taskId) params['taskId'] = input.taskId;
  if (input.limit) params['limit'] = String(input.limit);
  return callbackGet('/api/callbacks/list-decisions', params);
}

export async function handleCheckContext(input: {
  targetAction: string;
  catId?: string;
}): Promise<ToolResult> {
  return callbackGet('/api/callbacks/check-context', {
    targetAction: input.targetAction,
    ...(input.catId ? { catId: input.catId } : {}),
  });
}

// ============ Tool definitions ============

export const decisionLogTools = [
  {
    name: 'cat_cafe_create_decision',
    description:
      '创建一条决策记录到决策日志。' +
      '用于记录重要技术决策、设计选择、架构变更等。' +
      '决策包含：摘要、理由、证据（文档/代码 URL）、关联决策 ID。' +
      '所有决策通过 SHA-256 哈希链保证不可篡改性。' +
      '适用于：开始新 feature、分支策略、技术选型、重构方向等关键时刻。',
    inputSchema: createDecisionInputSchema,
    handler: handleCreateDecision,
  },
  {
    name: 'cat_cafe_acknowledge_decision',
    description:
      '确认（acknowledge）一条决策记录，表示你已阅读并知晓该决策。' +
      '被确认的决策可用于第四授权维度的上下文检查。' +
      '建议在接手新任务或交接工作时确认相关决策。',
    inputSchema: acknowledgeDecisionInputSchema,
    handler: handleAcknowledgeDecision,
  },
  {
    name: 'cat_cafe_list_decisions',
    description:
      '查询决策日志。可按猫猫或任务过滤。' +
      '返回最近 N 条决策（默认 20 条），按时间倒序。' +
      '每个决策包含：摘要、理由、证据、哈希、确认者列表。',
    inputSchema: listDecisionsInputSchema,
    handler: handleListDecisions,
  },
  {
    name: 'cat_cafe_check_context',
    description:
      '第四授权维度检查：猫猫是否有足够的上下文来做某个行动。' +
      '通过匹配已确认的决策来验证上下文充分性。' +
      '返回 hasContext（布尔）和 relevantDecisions（相关决策 ID 列表）。' +
      '如果 hasContext=false，建议先阅读相关决策或记录决策过程。',
    inputSchema: checkContextInputSchema,
    handler: handleCheckContext,
  },
] as const;
