# Contributing to Clowder AI

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## How Contributing Works Here

Most open source projects say: "write code, open a PR." Clowder works differently.

In the age of AI-assisted development, **code is cheap. Alignment is expensive.** Your AI team can generate thousands of lines in minutes — but if the intent is wrong, all that code is waste.

So the unit of contribution in Clowder isn't a pull request. It's a **Feature Doc**.

### What's a Feature Doc?

A Feature Doc (`docs/features/Fxxx-slug.md`) is a structured document that captures:

- **Why** — the problem, the motivation, who it's for
- **What** — the design, broken into phases
- **Acceptance Criteria** — how we know it's done (checkboxes, not vibes)
- **Refs** — research, prior art, design mockups, user feedback that led here

The Feature Doc is the **single source of truth** for what gets built. Code is a byproduct.

### The Contribution Flow

```
1. Intent          You have an idea or found a problem
      ↓
2. Feature Doc     Write a Fxxx-slug.md following the template
      ↓
3. Discussion      Open a PR with just the doc — get alignment on intent
      ↓
4. Execution       AI agents implement against the doc's Acceptance Criteria
      ↓
5. Verification    Does the result match the doc? Evidence, not confidence.
```

**Step 3 is the most important.** A merged Feature Doc means the community agrees on the *what* and *why*. Implementation follows naturally.

### Writing a Feature Doc

Use the template at `docs/features/TEMPLATE.md`. Required sections:

```yaml
---
feature_ids: [F{NNN}]
related_features: []
topics: []
doc_kind: spec
created: YYYY-MM-DD
---
```

```markdown
# F{NNN} — Feature Name

> **Status**: spec | **Owner**: your-name | **Priority**: P0/P1/P2

## Why

What problem does this solve? Who feels the pain? Include quotes if you have them.

## What

### Phase A: {name}

Design details. Be specific enough that someone (human or AI) can implement
without guessing your intent.

## Acceptance Criteria

- [ ] AC-A1: {testable statement}
- [ ] AC-A2: {testable statement}

## Refs

Links to research, mockups, related issues, prior art, user feedback.
```

**Refs matter more than you think.** A Feature Doc with good refs — competitive analysis, user quotes, design explorations — gives the implementing team (human or AI) the context to make good micro-decisions without asking you every 5 minutes.

### What Counts as a Contribution

| Type | What It Looks Like |
|------|--------------------|
| **Feature proposal** | A new `Fxxx-slug.md` with Why/What/AC |
| **Design feedback** | Comment on an existing Feature Doc PR — challenge assumptions, suggest alternatives |
| **Research / Refs** | Add context to an existing feature — competitive analysis, user research, technical spikes |
| **Bug report** | Issue with reproduction steps — becomes a Feature Doc if non-trivial |
| **Code implementation** | PR that implements against a merged Feature Doc's AC |
| **Vision alignment** | "This feature doesn't match the Five Principles because..." |

Notice that 4 out of 6 contribution types involve **no code at all**.

### Review: Intent First, Code Second

When reviewing PRs:

1. **Does this match a Feature Doc?** Code without a Feature Doc is unanchored.
2. **Are the Acceptance Criteria met?** Check the boxes with evidence.
3. **Does it align with the Five Principles?** Especially P1 (face the final state) and P5 (verified = done).
4. **Then** look at code quality.

### The Five Principles

Every contribution should respect these:

| # | Principle | Meaning |
|---|-----------|---------|
| P1 | Face the final state | Every step is foundation, not scaffolding |
| P2 | Co-creators, not puppets | Hard constraints are the floor; above it, release autonomy |
| P3 | Direction > speed | Uncertain? Stop, search, ask, confirm, then execute |
| P4 | Single source of truth | Every concept defined in exactly one place |
| P5 | Verified = done | Evidence talks, not confidence |

### Getting Started

1. Read the [README](README.md) to understand what Clowder is
2. Browse `docs/features/` to see existing Feature Docs
3. Check `docs/BACKLOG.md` for the active feature list
4. Look at `docs/decisions/` for past architectural decisions
5. Open an issue or draft a Feature Doc PR

### Code Style (When You Do Write Code)

- **TypeScript** with strict mode
- **Biome** for formatting and linting (`pnpm check` / `pnpm check:fix`)
- **pnpm** for package management
- Files under 350 lines (warning at 200)
- No `any` types
- Run `pnpm lint` before submitting

---

<a id="中文"></a>

## 如何为 Clowder 贡献

大多数开源项目说："写代码，提 PR。" Clowder 不一样。

在 AI 辅助开发的时代，**代码不值钱，对齐才值钱。** AI 团队几分钟能生成上千行代码 — 但如果意图错了，这些代码就全是废品。

所以在 Clowder，贡献的单位不是 Pull Request，是 **Feature Doc（功能文档）**。

### Feature Doc 是什么？

Feature Doc（`docs/features/Fxxx-slug.md`）是一个结构化文档，包含：

- **Why** — 问题是什么、动机是什么、为谁而做
- **What** — 设计方案，按阶段拆分
- **验收标准（AC）** — 怎么判断做完了（用 checkbox，不用感觉）
- **Refs** — 调研、竞品分析、设计稿、促成这个功能的用户反馈

Feature Doc 是**唯一真相源**。代码是它的产物。

### 贡献流程

```
1. 意图          你有一个想法，或发现了一个问题
      ↓
2. Feature Doc   按模板写一个 Fxxx-slug.md
      ↓
3. 讨论          开一个只包含文档的 PR — 在意图层面对齐
      ↓
4. 执行          AI 团队按文档的验收标准实现
      ↓
5. 验证          结果和文档一致吗？靠证据，不靠自信
```

**第 3 步最重要。** 一个被 merge 的 Feature Doc 意味着社区在 *做什么* 和 *为什么做* 上达成了共识。实现是自然而然的事。

### 如何写 Feature Doc

使用 `docs/features/TEMPLATE.md` 模板。必要的 frontmatter：

```yaml
---
feature_ids: [F{NNN}]
related_features: []
topics: []
doc_kind: spec
created: YYYY-MM-DD
---
```

```markdown
# F{NNN} — 功能名称

> **Status**: spec | **Owner**: 你的名字 | **Priority**: P0/P1/P2

## Why

解决什么问题？谁在痛？有用户原话就贴上。

## What

### Phase A: {阶段名}

设计细节。具体到让实现者（无论是人还是 AI）不用猜你的意图。

## 验收标准

- [ ] AC-A1: {可验证的陈述}
- [ ] AC-A2: {可验证的陈述}

## Refs

调研链接、设计稿、相关 issue、竞品分析、用户反馈。
```

**Refs 比你想象的重要。** 一份带着好 refs 的 Feature Doc — 竞品分析、用户原话、设计探索 — 让实现团队（人或 AI）能自主做出好的微决策，不用每 5 分钟来问你一次。

### 什么算贡献

| 类型 | 形式 |
|------|------|
| **功能提案** | 一个新的 `Fxxx-slug.md`，包含 Why/What/AC |
| **设计反馈** | 在已有 Feature Doc PR 上留言 — 质疑假设、提出替代方案 |
| **调研 / Refs** | 为已有功能补充上下文 — 竞品分析、用户研究、技术探针 |
| **Bug 报告** | 带复现步骤的 Issue — 非 trivial 的会变成 Feature Doc |
| **代码实现** | 对照已 merge 的 Feature Doc AC 的 PR |
| **愿景对齐** | "这个功能不符合五条原理，因为……" |

注意：6 种贡献类型里有 4 种**完全不涉及代码**。

### Review：先看意图，再看代码

Review PR 时的优先级：

1. **有对应的 Feature Doc 吗？** 没有 Feature Doc 的代码是没有锚的。
2. **验收标准达成了吗？** 用证据勾 checkbox。
3. **符合五条第一性原理吗？** 尤其是 P1（面向终态）和 P5（可验证才算完成）。
4. **然后**再看代码质量。

### 五条第一性原理

每个贡献都应该尊重这些原则：

| # | 原理 | 一句话 |
|---|------|-------|
| P1 | 面向终态，不绕路 | 每步是基座不是脚手架 |
| P2 | 共创伙伴，不是木头人 | 硬约束是底线，底线上释放主观能动性 |
| P3 | 方向正确 > 执行速度 | 不确定就停 → 搜 → 问 → 确认 → 再动手 |
| P4 | 单一真相源 | 每个概念只在一处定义 |
| P5 | 可验证才算完成 | 证据说话，不是信心说话 |

### 从哪开始

1. 读 [README](README.md) 了解 Clowder 是什么
2. 浏览 `docs/features/` 看看现有的 Feature Doc
3. 看 `docs/BACKLOG.md` 了解当前活跃的功能列表
4. 翻翻 `docs/decisions/` 看看过去的架构决策
5. 开一个 Issue 或直接提一个 Feature Doc 的 PR

### 代码规范（当你确实要写代码时）

- **TypeScript** 严格模式
- **Biome** 格式化和 lint（`pnpm check` / `pnpm check:fix`）
- **pnpm** 包管理
- 文件不超过 350 行（200 行开始警告）
- 禁止 `any` 类型
- 提交前跑 `pnpm lint`
