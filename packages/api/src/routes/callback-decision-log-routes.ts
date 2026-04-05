/**
 * Callback Decision Log Routes — 决策日志 MVP
 *
 * Decision Log 既是：
 * - 共享记忆的载体（谁做了什么决策、为什么）
 * - 零信任授权的前置条件（关键行动前检查猫猫是否看过相关决策）
 *
 * MVP 策略：复用现有的 task 表 + evidence 表，不需要新建表
 * - task 表增加 `decision_log` JSON 字段（嵌入式）
 * - 或者独立的 evidence 表记录决策（更灵活）
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { InvocationRegistry } from '../domains/cats/services/agents/invocation/InvocationRegistry.js';
import { callbackAuthSchema } from './callback-auth-schema.js';
import { EXPIRED_CREDENTIALS_ERROR } from './callback-errors.js';

// ============ Types ============

export interface DecisionLogEntry {
  /** 唯一决策 ID */
  id: string;
  /** 决策内容摘要 */
  decision: string;
  /** 为什么这样决定 */
  rationale: string;
  /** 参考了什么（文档/代码/对话 URL） */
  evidence: string[];
  /** 关联的其他决策 ID（形成决策图谱） */
  relatedDecisions: string[];
  /** 被哪个决策更新了（如果有） */
  supersededBy?: string;
  /** 做出决策的猫 */
  catId: string;
  /** 关联的任务 */
  taskId?: string;
  /** 其他已知晓此决策的猫 */
  acknowledgedBy: string[];
  /** 时间戳 */
  timestamp: number;
  /** 哈希链（不可篡改） */
  hash: string;
}

// ============ In-memory store (MVP) ============

import { createHash } from 'node:crypto';

const decisionLog = new Map<string, DecisionLogEntry>();
const decisionsByCat = new Map<string, Set<string>>();
const decisionsByTask = new Map<string, Set<string>>();

// Simple hash for chain integrity (MVP — not Merkle Tree yet)
function computeHash(prevHash: string | null, entry: Omit<DecisionLogEntry, 'hash'>): string {
  const data = JSON.stringify({ prevHash, ...entry });
  return createHash('sha256').update(data).digest('hex');
}

function addDecision(entry: Omit<DecisionLogEntry, 'hash'>): DecisionLogEntry {
  const prevHash = decisionLog.size > 0 ? Array.from(decisionLog.values()).at(-1)!.hash : null;
  const hash = computeHash(prevHash, entry);
  const fullEntry: DecisionLogEntry = { ...entry, hash };

  decisionLog.set(entry.id, fullEntry);

  // Index by cat
  if (!decisionsByCat.has(entry.catId)) decisionsByCat.set(entry.catId, new Set());
  decisionsByCat.get(entry.catId)!.add(entry.id);

  // Index by task
  if (entry.taskId) {
    if (!decisionsByTask.has(entry.taskId)) decisionsByTask.set(entry.taskId, new Set());
    decisionsByTask.get(entry.taskId)!.add(entry.id);
  }

  return fullEntry;
}

// ============ Input schemas ============

const createDecisionSchema = callbackAuthSchema.extend({
  decision: z.string().min(1).max(1000),
  rationale: z.string().min(1).max(2000),
  evidence: z.array(z.string()).default([]),
  relatedDecisions: z.array(z.string()).default([]),
  taskId: z.string().optional(),
  supersededBy: z.string().optional(),
});

const acknowledgeDecisionSchema = callbackAuthSchema.extend({
  decisionId: z.string().min(1),
});

const getDecisionsSchema = callbackAuthSchema.extend({
  catId: z.string().optional(),
  taskId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const checkContextSchema = callbackAuthSchema.extend({
  targetAction: z.string().min(1),
  catId: z.string().optional(), // defaults to invoking cat
});

// ============ Registration ============

export function registerCallbackDecisionLogRoutes(
  app: FastifyInstance,
  deps: {
    registry: InvocationRegistry;
  },
): void {
  const { registry } = deps;

  /** POST /api/callbacks/create-decision */
  app.post('/api/callbacks/create-decision', async (request, reply) => {
    const parsed = createDecisionSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, decision, rationale, evidence, relatedDecisions, taskId, supersededBy } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    const id = crypto.randomUUID();
    const entry = addDecision({
      id,
      decision,
      rationale,
      evidence,
      relatedDecisions,
      taskId,
      supersededBy,
      catId: record.catId as string,
      acknowledgedBy: [],
      timestamp: Date.now(),
    });

    console.info(`[decision-log][${record.catId}] created decision ${id}: "${decision.slice(0, 50)}..."`);

    return { status: 'ok', decision: entry };
  });

  /** POST /api/callbacks/acknowledge-decision */
  app.post('/api/callbacks/acknowledge-decision', async (request, reply) => {
    const parsed = acknowledgeDecisionSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, decisionId } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    const entry = decisionLog.get(decisionId);
    if (!entry) {
      reply.status(404);
      return { error: 'Decision not found' };
    }

    if (!entry.acknowledgedBy.includes(record.catId as string)) {
      entry.acknowledgedBy.push(record.catId as string);
    }

    return { status: 'ok' };
  });

  /** GET /api/callbacks/list-decisions */
  app.get('/api/callbacks/list-decisions', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const parsed = getDecisionsSchema.safeParse({
      invocationId: q['invocationId'],
      callbackToken: q['callbackToken'],
      catId: q['catId'],
      taskId: q['taskId'],
      limit: q['limit'] ? Number(q['limit']) : undefined,
    });
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, catId, taskId, limit } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    let ids: string[];
    if (taskId) {
      ids = Array.from(decisionsByTask.get(taskId) ?? []);
    } else if (catId) {
      ids = Array.from(decisionsByCat.get(catId) ?? []);
    } else {
      ids = Array.from(decisionLog.keys());
    }

    const decisions = ids
      .map((id) => decisionLog.get(id))
      .filter(Boolean)
      .slice(-limit)
      .reverse(); // newest first

    return { status: 'ok', decisions };
  });

  /** GET /api/callbacks/check-context — 第四授权维度：猫猫是否有足够的上下文做这个行动 */
  app.get('/api/callbacks/check-context', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const parsed = checkContextSchema.safeParse({
      invocationId: q['invocationId'],
      callbackToken: q['callbackToken'],
      targetAction: q['targetAction'],
      catId: q['catId'],
    });
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, targetAction, catId } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    const cat = catId ?? (record.catId as string);

    // Find decisions relevant to this action (MVP: simple keyword match)
    const relevantDecisions = Array.from(decisionLog.values())
      .filter((d) => d.acknowledgedBy.includes(cat))
      .filter((d) => d.decision.toLowerCase().includes(targetAction.toLowerCase()) ||
                      d.rationale.toLowerCase().includes(targetAction.toLowerCase()))
      .slice(-5);

    const hasContext = relevantDecisions.length > 0;

    return {
      status: 'ok',
      hasContext,
      relevantDecisions: hasContext ? relevantDecisions.map((d) => d.id) : [],
      suggestion: hasContext
        ? null
        : `建议先阅读相关决策记录，或使用 cat_cafe_create_decision 记录你的决策过程`,
    };
  });
}
