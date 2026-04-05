'use client';

/**
 * IntentionSidebar — 意图气泡 L1 MVP
 *
 * 固定侧边栏，实时显示所有在线猫猫的当前意图。
 * gemini25 设计：猫猫头像 + 意图文字 + 类型色底
 * - 分析型：蓝色系
 * - 实现型：绿色系
 * - 等待型：淡紫色系
 * - 阻塞型：琥珀色系（非红色，避免恐慌）
 */

import React from 'react';
import { useCatData } from '@/hooks/useCatData';
import { useIntentionStore } from '@/stores/intentionStore';
import { type IntentionEntry, type IntentionType } from '@/stores/intentionStore';

const TYPE_COLORS: Record<IntentionType, { bg: string; text: string; border: string }> = {
  analyzing: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  implementing: {
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  waiting: {
    bg: 'bg-purple-400/15',
    text: 'text-purple-300',
    border: 'border-purple-400/30',
  },
  blocked: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
};

const TYPE_LABELS: Record<IntentionType, string> = {
  analyzing: '分析中',
  implementing: '实现中',
  waiting: '等待中',
  blocked: '被阻塞',
};

function IntentionBubble({ entry }: { entry: IntentionEntry }) {
  const { getCatById } = useCatData();
  const cat = getCatById(entry.catId);
  const colors = TYPE_COLORS[entry.type];
  const isBlocked = entry.type === 'blocked';
  const isHighUrgency = entry.urgency >= 0.8;

  return (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-lg border
        ${colors.bg} ${colors.border}
        ${isHighUrgency ? 'ring-1 ring-amber-400/40' : ''}
        ${isBlocked ? 'animate-pulse' : ''}
        transition-all duration-200
      `}
    >
      {/* Cat avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {cat ? (
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: cat.color.primary + '30', color: cat.color.primary }}
            title={cat.displayName}
          >
            {cat.displayName.slice(0, 1)}
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-cafe-surface-elevated flex items-center justify-center text-xs">
            ?
          </div>
        )}
      </div>

      {/* Intention content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-medium uppercase tracking-wide ${colors.text}`}>
            {TYPE_LABELS[entry.type]}
          </span>
          {entry.taskId && (
            <span className="text-[10px] text-cafe-secondary/60 font-mono">
              {entry.taskId.slice(0, 8)}
            </span>
          )}
        </div>
        <p className="text-xs text-cafe-text leading-relaxed line-clamp-2">{entry.intent}</p>
        {isBlocked && entry.blockers && (
          <p className="text-[10px] text-amber-400/80 mt-1 italic">
            阻塞: {entry.blockers}
          </p>
        )}
      </div>
    </div>
  );
}

export function IntentionSidebar() {
  const intentions = useIntentionStore((s) => s.intentions);
  const entries = Array.from(intentions.values());

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-cafe-secondary/60 mb-1">
        猫猫注意力
      </div>
      {entries.map((entry) => (
        <IntentionBubble key={`${entry.catId}:${entry.taskId ?? '_global_'}`} entry={entry} />
      ))}
    </div>
  );
}
