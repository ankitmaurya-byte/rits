# Rits Project Context

## Overview

Rits is a startup-focused workspace app for capturing and organizing:

- ideas
- todos
- notes
- resources
- AI conversations

It supports both:

- private personal work
- shared workspace/team work

The product positioning in the UI is: `Research in tech startup`.

## Tech Stack

- Next.js `16.2.6` with App Router
- React `19.2.4`
- TypeScript
- Convex `1.38.0` for backend/database/functions
- Clerk for authentication
- Tailwind CSS v4
- `next-themes` for theme switching
- Zustand for client state
- TipTap for rich text editing
- dnd-kit for kanban drag/drop
- Radix UI via local `components/ui/*`
- Sonner for toasts
- date-fns for date formatting
- react-markdown + remark-gfm for AI chat rendering

## High-Level App Structure

### Public entry

- `app/page.tsx`
  - marketing/landing page
  - sign in / sign up via Clerk
  - redirects signed-in users to `/dashboard`

### Authenticated shell

- `app/(main)/layout.tsx`
  - main authenticated layout
  - sidebar
  - top header
  - search input
  - notifications button
  - custom profile menu
  - Rits AI entry points

### Providers

- `app/providers.tsx`
  - wraps app with `ClerkProvider`
  - wraps Convex with `ConvexProviderWithClerk`
  - wraps UI with `ThemeProvider`

## Current Main Routes

### Core

- `/dashboard`
- `/ideas`
- `/todos`
- `/notes`
- `/startups`

### Private scope

- `/private/ideas`
- `/private/todos`
- `/private/notes`
- `/private/resources`

### Workspace scope

- `/workspace/ideas`
- `/workspace/todos`
- `/workspace/notes`
- `/workspace/resources`
- `/workspace/members`
- `/workspace/join`

### Account/profile

- `/profile`
- `/settings`
- `/feedback`

### API routes

- `/api/ai/chat`
- `/api/ai/assist`

## Product Features

### Ideas

- private ideas
- workspace ideas
- rich text descriptions
- tags
- AI-assisted writing

### Todos

- private kanban board
- workspace kanban board
- drag/drop between columns
- statuses: `todo`, `in-progress`, `completed`
- priorities
- support for grouped lanes
- private groups and workspace groups

### Notes

- private notes
- workspace notes
- rich text editing with TipTap
- AI writing assistant inside editor

### Resources

- private resources
- workspace resources
- URL + description oriented storage

### AI

- full Rits AI chat sheet
- contextual writing assistant for notes/ideas
- AI chat can read app context from Convex data

### Profile and settings

- custom app-owned profile UI instead of Clerk profile popover
- editable profile fields in app settings
- dedicated profile page
- feedback page

## Authentication Architecture

### Client

- Clerk handles sign-in/sign-up/session
- Convex client auth is wired through `ConvexProviderWithClerk`

### Backend

- Convex auth config is in `convex/auth.config.ts`
- Convex expects Clerk JWTs with audience/application ID `convex`
- authenticated Convex access depends on Clerk token availability

### Important files

- `app/providers.tsx`
- `convex/auth.config.ts`
- `convex/authHelpers.ts`
- `convex/users.ts`
- `app/api/ai/chat/route.ts`

## AI Architecture

### 1. AI chat

- UI: `components/ai/chat-sheet.tsx`
- API route: `app/api/ai/chat/route.ts`
- backend logic: `convex/chat.ts`, `convex/chatActions.ts`, `convex/chatContext.ts`

Behavior:

- gets Clerk token
- uses `fetchQuery` and `fetchAction` with Convex auth token
- stores conversations and messages in Convex
- supports different agent modes and scope modes

Scope modes:

- `private`
- `current`
- `all`

### 2. Editor AI assist

- UI: `components/editor/ai-assist-modal.tsx`
- API route: `app/api/ai/assist/route.ts`

Behavior:

- authenticated via Clerk user session
- sends prompt plus note/idea context
- uses xAI/Grok compatible chat completion API
- returns generated text for append/replace in editor

### Branding

- shared logo component: `components/ai/rits-ai-logo.tsx`
- used instead of `BrainCircuit` in AI surfaces

## Database / Convex Data Model

Defined in `convex/schema.ts`.

### `users`

Fields:

- `clerkId`
- `tokenIdentifier`
- `name`
- `email`
- `image`
- `status`
- `bio`
- `description`
- `currentCompany`

Purpose:

- app-level user record mapped from Clerk identity
- stores profile information shown in custom profile/settings UI

### `workspaces`

Fields:

- `name`
- `description`
- `ownerId`
- `inviteToken`

### `workspaceMembers`

- workspace/user membership join table
- roles: `owner` or `member`

### `workspaceInvites`

- email invite records
- token-based join flow
- statuses: `pending`, `accepted`, `expired`

### `ideas`

- supports `private` and `workspace` scope
- stores title, description, tags, owner, createdAt

### `todos`

- supports `private` and `workspace` scope
- stores title, priority, status, completed, owner, createdAt
- optional `groupId`
- optional source URL/description

### `notes`

- supports `private` and `workspace` scope
- stores title, rich text content, owner, updatedAt

### `todoGroups`

- now supports both:
  - workspace groups via `workspaceId`
  - private groups via `createdBy`

### `resources`

- supports `private` and `workspace` scope
- stores URL, description, owner, createdAt

### `chatConversations`

- owner-bound AI conversations
- stores agent/scope metadata and timestamps

### `chatMessages`

- messages for conversations
- roles: `user`, `assistant`, `system`
- optional citations metadata

## Key Convex Modules

- `convex/users.ts`
  - create/sync user records
  - fetch current user
  - update profile fields

- `convex/workspaces.ts`
  - workspace creation
  - membership
  - invite token join flows
  - workspace access checks

- `convex/ideas.ts`
  - CRUD-style operations for ideas

- `convex/todos.ts`
  - create/update/delete todos
  - private and workspace queries

- `convex/todoGroups.ts`
  - workspace groups
  - private groups

- `convex/notes.ts`
  - private and workspace note flows

- `convex/resources.ts`
  - resource storage/query flows

- `convex/chat.ts`
  - conversation/message querying

- `convex/chatActions.ts`
  - AI orchestration for chat

- `convex/chatContext.ts`
  - fetches app context for AI

- `convex/authHelpers.ts`
  - current identity and current user helpers

## UI / Component Conventions

### Styling

- dark, glossy, high-contrast aesthetic
- heavy use of CSS variables like:
  - `--canvas`
  - `--surface-card`
  - `--surface-elevated`
  - `--ink`
  - `--charcoal`
  - `--mute`
  - `--hairline-strong`

### Component directories

- `components/ai/*`
- `components/editor/*`
- `components/layout/*`
- `components/profile/*`
- `components/resources/*`
- `components/ui/*`
- `components/workspace/*`

### Profile UI

- custom profile button/menu in header
- menu options currently include:
  - Profile
  - Manage account
  - Settings
  - Feedback
  - Logout

### Editor

- shared rich editor in `components/editor/rich-editor.tsx`
- re-exported for notes via `components/notes/editor.tsx`
- supports headings, formatting, lists, links, alignment, tasks, code blocks, AI assist

## State Management

- Zustand store in `store/`
- workspace selection is driven through workspace store
- Convex hooks are used for server state and live data

## Important Environment Variables

These are referenced by the codebase:

- `NEXT_PUBLIC_CONVEX_URL`
- `CLERK_JWT_ISSUER_DOMAIN`
- `CLERK_FRONTEND_API_URL`
- `XAI_API_KEY`
- `GROK_API_KEY`
- `XAI_MODEL`
- `GROK_MODEL`
- `XAI_API_URL`
- `GROK_API_URL`

## Build / Run Commands

- dev: `npm run dev`
- turbo dev: `npm run dev:turbo`
- build: `npm run build`
- start: `npm run start`
- lint: `npm run lint`

For Convex work, codegen/deploy is also relevant:

- local sync/codegen: `npx convex dev`
- production backend deploy: `npx convex deploy`

## Notable Recent Project State

The current codebase already includes these newer changes:

- custom app-owned profile/settings flow
- private todo groups in addition to workspace todo groups
- Rits AI logo component replacing generic AI icons in key AI entry points
- build is currently passing locally with `npm run build`

## Common Dev Notes

- This repo uses Next.js App Router client-heavy pages for authenticated flows.
- Convex auth and Clerk token audience must stay aligned.
- Schema changes require Convex sync/deploy, not just Next.js deploy.
- AI chat depends on Convex-authenticated requests.
- AI editor assist depends on xAI/Grok API configuration.

## Suggested Mental Model

Think of Rits as:

- a personal + collaborative startup operating system
- built around structured capture of ideas, tasks, notes, and resources
- with an AI layer that can either:
  - help write inside a single artifact
  - reason across the whole stored workspace context
