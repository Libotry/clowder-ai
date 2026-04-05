/**
 * Callback Intention Routes — 意图气泡 L1 MVP
 *
 * 猫猫通过 MCP 工具上报/清除当前意图，前端实时渲染意图气泡。
 * 意图状态存储在内存中，通过 WebSocket 广播给前端。
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { InvocationRegistry } from '../domains/cats/services/agents/invocation/InvocationRegistry.js';
import type { SocketManager } from '../infrastructure/websocket/index.js';
import { callbackAuthSchema } from './callback-auth-schema.js';
import { EXPIRED_CREDENTIALS_ERROR } from './callback-errors.js';

// ============ Types ============

export type IntentionType = 'analyzing' | 'implementing' | 'waiting' | 'blocked';

export interface IntentionState {
  catId: string;
  intent: string;
  type: IntentionType;
  taskId?: string;
  blockers?: string;
  urgency: number; // 0-1
  reportedAt: number; // Unix ms
}

// ============ In-memory store ============

/** key = `${catId}:${taskId ?? '_global_'}` */
const intentionMap = new Map<string, IntentionState>();
const intentionTimers = new Map<string, NodeJS.Timeout>();

const INTENTION_TTL_MS = 5 * 60 * 1000; // 5 minutes — auto-expire if not refreshed

function intentionKey(catId: string, taskId?: string): string {
  return `${catId}:${taskId ?? '_global_'}`;
}

function setIntention(state: IntentionState): void {
  const key = intentionKey(state.catId, state.taskId);

  const existing = intentionTimers.get(key);
  if (existing) clearTimeout(existing);

  intentionMap.set(key, state);

  // Auto-expire after TTL
  intentionTimers.set(
    key,
    setTimeout(() => {
      intentionMap.delete(key);
      intentionTimers.delete(key);
    }, INTENTION_TTL_MS),
  );
}

function clearIntentionByCat(catId: string, taskId?: string): void {
  if (taskId) {
    const key = intentionKey(catId, taskId);
    intentionMap.delete(key);
    const t = intentionTimers.get(key);
    if (t) {
      clearTimeout(t);
      intentionTimers.delete(key);
    }
  } else {
    for (const [k, v] of intentionMap.entries()) {
      if (v.catId === catId) {
        intentionMap.delete(k);
        const t = intentionTimers.get(k);
        if (t) {
          clearTimeout(t);
          intentionTimers.delete(k);
        }
      }
    }
  }
}

export function getAllIntentions(): IntentionState[] {
  return Array.from(intentionMap.values());
}

// ============ Input schemas ============

const reportIntentionBodySchema = callbackAuthSchema.extend({
  intent: z.string().min(1).max(500),
  type: z.enum(['analyzing', 'implementing', 'waiting', 'blocked']),
  taskId: z.string().min(1).optional(),
  blockers: z.string().max(500).optional(),
  urgency: z.number().min(0).max(1).optional().default(0),
});

const clearIntentionBodySchema = callbackAuthSchema.extend({
  taskId: z.string().min(1).optional(),
});

// ============ Registration ============

export function registerCallbackIntentionRoutes(
  app: FastifyInstance,
  deps: {
    registry: InvocationRegistry;
    socketManager: SocketManager;
  },
): void {
  const { registry, socketManager } = deps;

  /** POST /api/callbacks/report-intention */
  app.post('/api/callbacks/report-intention', async (request, reply) => {
    const parsed = reportIntentionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, intent, type, taskId, blockers, urgency } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    const state: IntentionState = {
      catId: record.catId as string,
      intent,
      type,
      taskId,
      blockers,
      urgency: urgency ?? 0,
      reportedAt: Date.now(),
    };

    setIntention(state);

    console.info(`[intention-routes][${record.catId}] reported: ${type} — "${intent}"${taskId ? ` (task=${taskId})` : ''}`);

    // Broadcast to global room via WebSocket (frontend subscribes from any page)
    socketManager.broadcastToRoom('global', 'intention_update', {
      catId: state.catId,
      intent: state.intent,
      type: state.type,
      taskId: state.taskId,
      blockers: state.blockers,
      urgency: state.urgency,
      reportedAt: state.reportedAt,
    });

    return { status: 'ok' };
  });

  /** POST /api/callbacks/clear-intention */
  app.post('/api/callbacks/clear-intention', async (request, reply) => {
    const parsed = clearIntentionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { error: `Invalid request: ${parsed.error.message}` };
    }

    const { invocationId, callbackToken, taskId } = parsed.data;
    const record = registry.verify(invocationId, callbackToken);
    if (!record) {
      reply.status(401);
      return EXPIRED_CREDENTIALS_ERROR;
    }

    clearIntentionByCat(record.catId as string, taskId);

    console.info(`[intention-routes][${record.catId}] cleared${taskId ? ` (task=${taskId})` : ' (all)'}`);

    socketManager.broadcastToRoom('global', 'intention_cleared', {
      catId: record.catId as string,
      taskId: taskId ?? null,
    });

    return { status: 'ok' };
  });
}
