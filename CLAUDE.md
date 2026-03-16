# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## Environment

Create a `.env` file at the root with:
```
ANTHROPIC_API_KEY=your-key   # Optional — app uses MockLanguageModel if absent
JWT_SECRET=your-secret        # Optional — falls back to "development-secret-key"
```

## Architecture Overview

**UIGen** is a Next.js 15 (App Router) app where users describe React components in a chat interface and see them rendered live in a sandboxed iframe.

### Data Flow

1. User types a prompt in `ChatInterface` → Vercel AI SDK's `useChat` POSTs to `/api/chat` with the current serialized VFS and `projectId`.
2. The API route streams tool calls from Claude (`claude-haiku-4-5` by default, or `MockLanguageModel` if no API key). Tools available: `str_replace_editor` and `file_manager`.
3. As tool calls stream in, `ChatContext` forwards them to `FileSystemContext.handleToolCall`, which mutates the `VirtualFileSystem` in memory and triggers a React re-render.
4. `PreviewFrame` reacts to `refreshTrigger`, calls `createImportMap` which Babel-transforms all `.jsx/.tsx` files into blob URLs, builds an import map, and writes a full HTML document into an `<iframe srcdoc>`. Tailwind CDN is injected into every preview.
5. On stream completion, the server saves `messages` and `fileSystem.serialize()` to the SQLite `Project` record (authenticated users only).

### Key Abstractions

- **`VirtualFileSystem`** (`src/lib/file-system.ts`): In-memory tree of files. Serializes to a flat `Record<string, FileNode>` (stored as JSON in the DB `data` column). No files are ever written to disk for user projects.
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): React context wrapping VFS; exposes CRUD helpers + `handleToolCall` which maps AI tool calls to VFS mutations.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): Thin wrapper around Vercel AI SDK `useChat`; sends serialized VFS with every request so the model sees current file state.
- **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Uses `@babel/standalone` in-browser to transpile JSX/TSX, builds an ES module import map (local files → blob URLs, third-party packages → `esm.sh`), and generates the full iframe HTML. Missing local imports get placeholder stub modules.
- **AI Tools** (`src/lib/tools/`): `str_replace_editor` (view/create/str_replace/insert on VFS) and `file_manager` (rename/delete). Both receive a `VirtualFileSystem` instance scoped to the request.
- **`getLanguageModel`** (`src/lib/provider.ts`): Returns Anthropic `claude-haiku-4-5` when `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel` that simulates multi-step tool use.

### Auth & Persistence

- JWT sessions via `jose`, stored in an `httpOnly` cookie (`auth-token`, 7-day expiry).
- `src/lib/auth.ts` is `server-only`. Session is read by server actions and the API route.
- `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes.
- Anonymous users can use the app; their work is tracked in `localStorage` via `src/lib/anon-work-tracker.ts` for optional migration on sign-up.
- Database: SQLite via Prisma. `prisma/schema.prisma` is the source of truth for all data structures stored in the database — reference it whenever you need to understand the DB structure.

### Project Routes

- `/` — redirects authenticated users to their latest project; shows anonymous landing for guests.
- `/[projectId]` — loads the project from DB and renders `MainContent` with initial VFS + messages.
- `/api/chat` — streaming AI endpoint; `maxDuration = 120s`.

### UI Layout (`MainContent`)

Split-panel layout: left panel = chat (35%), right panel = preview/code editor (65%). The right panel toggles between `PreviewFrame` and a code editor sub-layout (`FileTree` + `CodeEditor` with Monaco).
