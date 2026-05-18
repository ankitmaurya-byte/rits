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

## Admin App Context

This section exists specifically so a separate admin application can be built
without relying on chat history.

### Intended admin product

The admin application should be a separate Next.js app such as:

- `admin.rits.com`

It should:

- use the same Convex deployment and schema as the main app
- read and control product data across users, workspaces, content, explore data,
  startup data, and moderation state
- follow the same design language from `DESIGN.md`
- not share the same end-user UI shell or routing structure as the main app

### Admin app scope

The admin app should be able to inspect and manage:

- users
- workspaces
- workspace memberships
- invites
- ideas
- todos
- todo groups
- notes
- resources
- roadmaps
- AI reports
- MVP pages / public share pages
- social / chat data
- newsletters
- startup hunt data
- YC explorer data
- Shark Tank data
- GitHub tools data
- integrations metadata
- moderation / strike systems
- admin members / roles / permissions
- audit logs

### Existing product areas relevant to admin

Current high-value surfaces already built in the main app:

- `Roadmap` builder
- `Startup Hunt` product-hunt-style startup list and detail views
- `Tech Feed`
- `Competitor Market Map`
- `Newsletter Research Hub`
- `Resources` column explorer with sharing
- `Integrations` directory and detail routes

An admin app should assume these features may require operational visibility,
data editing, moderation, and imports.

## Current Route Inventory

### Public / marketing

- `/`

### Main authenticated product

- `/dashboard`
- `/feed`
- `/chats`
- `/ideas`
- `/todos`
- `/notes`
- `/roadmap`
- `/startups`
- `/startups/[slug]`
- `/integrations`
- `/integrations/[slug]`
- `/profile`
- `/settings`
- `/feedback`

### Explore

- `/explore`
- `/explore/yc`
- `/explore/sharktank`
- `/explore/github-tools`
- `/explore/ai-startups`
- `/explore/open-source` (currently used for Tech Feed shell / legacy path)

### Research

- `/research`
- `/research/analysis`
- `/research/reports`
- `/research/competitors`
- `/research/newsletters`
- `/research/mvp-lab`
- `/research/link-analysis`
- `/research/files`

### Private scope

- `/private/chats`
- `/private/ideas`
- `/private/todos`
- `/private/notes`
- `/private/resources`
- `/private/vaults`
- `/private/vaults/[vaultId]`

### Workspace scope

- `/workspace/chats`
- `/workspace/ideas`
- `/workspace/todos`
- `/workspace/notes`
- `/workspace/resources`
- `/workspace/vaults`
- `/workspace/vaults/[vaultId]`
- `/workspace/settings`
- `/workspace/settings/members`
- `/workspace/members` (redirect route)
- `/workspace/join`

### Public share routes

- `/share/mvp/[shareToken]`
- `/share/resources/[shareToken]`

## Data Model Context For Admin

### Tables clearly present in schema

Based on the current codebase and schema usage, the admin app should expect at
least these tables:

- `users`
- `workspaces`
- `workspaceMembers`
- `workspaceInvites`
- `ideas`
- `todos`
- `todoGroups`
- `notes`
- `resources`
- `resourceFolderShares`
- `aiReports`
- `mvpPages`
- `roadmaps`
- `friendRequests`
- `friendships`
- `socialChatRooms`
- `socialChatParticipants`
- `socialChatMessages`
- `chatConversations`
- `chatMessages`
- `githubTools`

The admin app should inspect `convex/schema.ts` directly before adding new
tables, because the product is evolving and more tables may already exist.

### Special product-side localStorage data not yet fully backend-backed

Some newer features are currently backed partly or fully by local mock data /
browser storage. The admin app should not assume all data is already stored in
Convex.

Examples:

- startup hunt submissions / votes / comments
- some resource explorer folder organization metadata
- dismissed banners
- newsletter signup local mock state
- some feed-like product shells

If the admin app needs operational control over these features, it may need to:

- migrate them into real Convex tables, or
- provide admin tooling only after persistence is moved server-side

## Explore / Dataset Context

### YC data

- YC explorer UI exists in `components/startups/yc-explorer-page.tsx`
- mock/source data currently comes from `lib/yc-startups`
- users can analyze YC startups and push outputs into notes / ideas / todos

Admin implication:

- an admin app should support importing, editing, validating, and deleting YC
  startup data

### Shark Tank data

- Shark Tank explorer UI exists in `components/startups/sharktank-explorer-page.tsx`
- source data comes from `lib/shark-tank-india`

Admin implication:

- an admin app should support pitch/season import, correction, enrichment, and
  deletion tools

### GitHub tools data

- managed via `convex/githubTools.ts`
- UI exists in `components/explore/github-tools-explorer-page.tsx`
- has AI summaries, use cases, opportunities, README content, and analysis

Admin implication:

- admin app should support reviewing and editing imported repos and AI fields

### Startup Hunt data

- product route: `/startups`
- detail route: `/startups/[slug]`
- shared mock/local state layer in `lib/ai-startup-hunt.ts`

Admin implication:

- if Startup Hunt becomes core data, move it to Convex and give admin tools for:
  - startup CRUD
  - vote auditing
  - comment moderation
  - thread moderation

## Resource System Context

There are now two distinct concepts in resources:

1. backend resource link records in `resources`
2. frontend/local folder organization metadata layered over those links

Also present:

- public folder share snapshots via `resourceFolderShares`

Admin implication:

- admin should be able to inspect and revoke public resource share links
- if folder structure becomes product-critical, migrate local folder metadata to
  server-side persistence

## Social / Messaging Context

Private/workspace chat infrastructure exists already.

Important Convex modules:

- `convex/social.ts`
- `convex/socialChats.ts`

Known capabilities:

- private friend/direct chat flows
- workspace room chats
- shared content messages
- AI analysis messages
- friend requests / friendships

Admin implication:

- admin tooling may need:
  - room inspection
  - message moderation
  - abuse / spam review
  - user relationship debugging

## Auth Context For Admin Build

Current main product auth:

- Clerk on frontend
- Convex auth via Clerk tokens
- app-level `users` table mapped from Clerk identities

Admin app options:

1. use Clerk and map admin identity to same `users` table
2. use a dedicated admin auth layer stored in Convex
3. bootstrap with app-controlled admin credentials and later migrate to Clerk

Strong recommendation:

- perform authorization server-side in Convex
- never trust client-only role checks
- use helper functions such as:
  - `requireAdmin()`
  - `requirePermission(permission)`
  - `logAdminAction(...)`

## Suggested New Admin Tables

If building the admin app now, likely new tables include:

- `adminUsers`
- `adminRoles`
- `adminAuditLogs`
- `adminFeatureFlags`
- `moderationReports`
- `moderationActions`
- `importJobs`

Suggested fields:

### `adminUsers`

- `userId` or auth identifier
- `email`
- `role`
- `permissions`
- `status`
- `createdBy`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### `adminAuditLogs`

- `adminUserId`
- `action`
- `entityType`
- `entityId`
- `summary`
- `before`
- `after`
- `createdAt`

### `importJobs`

- `sourceType`
- `status`
- `fileName`
- `stats`
- `errors`
- `createdBy`
- `createdAt`

## Bootstrap Admin Requirement

The requested admin bootstrap user is:

- email: `ankit@rits.fun`
- password: `ankitisme`

Important note for implementers:

- treat this as a bootstrap / seed requirement, not long-term production auth
- if building production-safe auth, create a secure migration path away from a
  raw stored password

## Design Requirements For Admin

The admin app should follow `DESIGN.md`.

That means:

- same dark canvas / surface layering
- same thin border language
- same muted typography hierarchy
- same restrained glow treatment
- no generic bright SaaS admin theme
- should feel like RITS internal tooling

Useful visual patterns to keep:

- left sidebar navigation
- structured cards
- compact but premium controls
- clean table/list/detail layouts
- sticky top bars where helpful

## Useful Existing UI Pieces To Reuse

These existing UI primitives or patterns may help when building admin:

- `components/ui/dialog.tsx`
- `components/ui/avatar.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/themed-select.tsx`
- `components/ui/confirm-provider.tsx`
- `components/ui/theme-toggle.tsx`
- layout conventions from `app/(main)/layout.tsx`

Potential admin page patterns can also borrow from existing screens:

- resources explorer
- startup hunt list/detail
- roadmap builder overlays
- feed cards
- newsletter hub side panels

## Convex Modules Worth Reading Before Admin Build

If building admin, read these first:

- `convex/schema.ts`
- `convex/authHelpers.ts`
- `convex/users.ts`
- `convex/workspaces.ts`
- `convex/ideas.ts`
- `convex/todos.ts`
- `convex/todoGroups.ts`
- `convex/notes.ts`
- `convex/resources.ts`
- `convex/researchOutputs.ts`
- `convex/roadmaps.ts`
- `convex/social.ts`
- `convex/socialChats.ts`
- `convex/githubTools.ts`

Also read:

- `convex/_generated/ai/guidelines.md`

## Admin App Success Criteria

An external agent building `admin.rits.com` should be able to use this file to
understand:

- what the main product is
- what routes and surfaces already exist
- what data tables already exist
- what data is still local/mock
- what admin-specific tables likely need to be added
- what auth and permissions concerns matter
- what styling language should be preserved

If more product areas are added later, this file should be extended rather than
replaced.
