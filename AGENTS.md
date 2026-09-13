# AGENTS.md

# Scriptorium

Scriptorium is a focused, text-first application for writing video scripts.

The repository is a monorepo:

```text
scriptorium/
├── backend/    Rails application
├── frontend/   Vue 3 + TypeScript application
└── docs/
```

Read `docs/PRODUCT.md` before making product or architectural decisions.

## Core engineering rule

Do not build things merely because they are technically possible.

Prefer the smallest implementation that solves a demonstrated problem.

No bullshit. No perdoling.

"Perdoling" means prolonged technically competent-looking effort spent forcing,
debugging, or polishing a path whose expected value no longer justifies the
work.

When a task starts requiring:

- increasingly complicated workarounds;
- repeated failed attempts;
- infrastructure disproportionate to the feature;
- custom machinery duplicating a mature existing component;
- layers whose only purpose is to rescue earlier layers;

stop and reconsider the route.

Existing mature components are preferred over bespoke infrastructure unless
there is a concrete reason not to use them.

"Can this be made to work?" is not enough.

Ask whether this is still the simplest sensible route.

## Product premise

Scriptorium is an application for writers to write their own video scripts.

Opening the application should lead quickly to writing, not to dashboards,
analytics, project-management machinery, or content-generation tools.

The basic writing experience should remain free.

Scriptorium is deliberately narrow.

It is not:

- a video editor;
- a publishing platform;
- a creator dashboard;
- a project-management system;
- a collaboration suite;
- an analytics product;
- a social product;
- a general note-taking application;
- an AI ghostwriter.

Do not introduce functionality from those categories merely because another
product has it or because it would be easy to implement.

A new feature should solve a concrete recurring writing problem.

"Someone might want it", competitor parity, implementation ease, or agent
convenience are not sufficient reasons to add a feature.

## Human authorship and future AI

Scriptorium does not author scripts for the user.

Do not add:

- script generation;
- prompt-to-script flows;
- continuation;
- replacement paragraphs;
- invented jokes, examples, arguments, facts, transitions, or narration;
- "magic write";
- silent AI rewrites.

If users want generated prose, they can use external tools and paste or import
the result.

Future AI functionality may be acceptable when it remains subordinate to
human authorship.

Allowed future directions include:

- spelling, grammar, and punctuation correction;
- conservative stylistic cleanup;
- repetition detection;
- contradiction detection;
- pacing and timing analysis;
- structural analysis;
- suggestions to reorder sections/subsections;
- suggestions to split or merge existing material.

The rule is:

```text
AI may analyze, classify, compare, reorder, and proofread.
AI may not author script content.
```

Any future AI edit must preserve meaning, voice, and factual claims, and should
be reviewable through explicit accept/reject or diff-based interaction.

Do not implement AI functionality unless explicitly requested.

## Text-first invariant

Scriptorium is text-first.

User-authored content is stored as plain text or, if richer formatting is added
later, a constrained text representation such as Markdown.

Do not store or render arbitrary user-supplied HTML.

Do not use `v-html` for project/user content.

If Markdown rendering is introduced later:

- raw HTML must remain disabled;
- rendered constructs must be constrained and sanitized;
- canonical storage remains text/Markdown rather than editor-specific DOM or
  rich-document structures.

Do not turn Scriptorium into a WYSIWYG document system without an explicit
product-direction change.

## Backend architecture

`backend/` is a regular Rails application using PostgreSQL.

It is deliberately not generated with `--api`.

The public writing UI belongs to Vue, but retaining the normal Rails stack
leaves room for small operator/admin interfaces if they are ever genuinely
needed.

Rails owns:

- users and authentication;
- device sessions;
- recovery credentials;
- persistent server-side project data;
- authorization/ownership;
- document synchronization endpoints;
- revision/conflict semantics;
- production-side account/security behavior.

Do not build a second public application frontend inside Rails.

Prefer conventional Rails code.

Do not introduce repositories, service layers, authorization frameworks, or
other architectural layers unless the existing code has a concrete problem
that they solve.

Small focused service objects are fine where they materially clarify business
logic.

## Frontend architecture

`frontend/` is a Vue 3 + TypeScript application built with Vite.

Use Pinia for shared application state.

The frontend owns:

- authentication UI/state;
- script-writing UI;
- project/section/subsection editing;
- local durable project storage;
- synchronization state;
- conflict UI;
- import/export;
- ephemeral writing tools such as the subsection stopwatch;
- local appearance preferences;
- eventual PWA behavior.

Do not recreate Pinia using ad-hoc globals, generic event buses, or overlapping
state layers.

Do not introduce another frontend framework.

### Frontend component rule

Split by visible product component first.

Extract composables only for stateful behavior that crosses components or
substantially clutters them.

Do not create abstractions merely to reduce line count.

Prefer files that a human can understand within a normal editor working set.

Avoid:

- giant root components;
- dense one-line Vue templates;
- very long inline handlers;
- generic component factories;
- design-system abstractions without a demonstrated repeated need.

Optimize code for human scanning, not token density.

Roughly 120–150 characters is a useful upper bound for normal human horizontal
reading.

## Core document model

The writing hierarchy is:

```text
Project
└── Section[]
    └── Subsection[]
```

A Project represents one video/script project.

A Section is roughly equivalent to a YouTube chapter and primarily organizes
subsections.

A Subsection is the main writing unit.

Subsection content includes:

- optional title;
- viewer/visual notes;
- explanation/intent notes;
- script text;
- optional estimated duration.

Project content includes:

- title;
- optional target duration;
- ordered sections.

Do not duplicate derived values unnecessarily.

For example, planned project duration is derived from subsection duration
estimates.

## Ordering and identity

Sections and subsections have stable public UUID identities.

Canonical document array order is authoritative.

Do not add fractional ranking, complex ordering libraries, CRDT ordering, or
other ranking machinery without a demonstrated need.

Subsection identity is project-wide, not scoped only to its current section.

Moving a subsection between sections preserves its identity.

This invariant matters to whole-document reconciliation.

## Canonical document API

Synchronization uses a canonical whole-document representation.

The canonical JSON document is versioned with a schema version and includes the
complete meaningful project hierarchy.

Project revisions provide optimistic concurrency/conflict detection.

The backend reconciles whole documents transactionally.

Do not reintroduce nested CRUD synchronization for individual
sections/subsections unless there is a concrete reason to change the established
architecture.

Do not expose database-internal IDs in the interchange format.

## Local-first behavior

Local-first behavior is a core requirement.

After an authenticated account has been established on a device, normal writing
must continue when the backend is unreachable.

The editing path is conceptually:

```text
user edit
→ Pinia/frontend state
→ user-scoped IndexedDB canonical document
→ synchronization
→ server
```

Requirements:

- local edits survive reload/restart;
- connectivity loss must not interrupt writing;
- reconnection should synchronize quietly;
- failed remote synchronization must not destroy valid local edits;
- stale asynchronous responses must not overwrite newer local state;
- conflicts are explicit;
- sync state should be quiet unless attention is needed.

Typical states include:

- Synced;
- Saved locally;
- Syncing;
- Conflict;
- Error.

Do not add CRDTs, operational transformation, collaborative cursors, or generic
distributed-conflict machinery merely in anticipation of future collaboration.

Current conflict handling is intentionally explicit rather than automatic:

```text
load online copy
or
overwrite online with local copy
```

No automatic merge is required.

## Authentication

An account is required to use Scriptorium.

There is no anonymous editing mode.

This deliberately avoids anonymous-project adoption/migration ambiguity.

Authentication uses:

```text
username + password
```

Username is the account identifier.

Scriptorium deliberately does not require or collect:

- email;
- phone number;
- real name.

If a user chooses an email-looking string as their username, treat it only as
an opaque username.

Do not infer contact information from it.

Do not add email-specific behavior.

## Device sessions

Frontend authentication uses opaque bearer device-session tokens.

Do not replace them with JWTs merely because JWTs are common.

Properties:

- tokens are cryptographically random;
- raw bearer tokens live client-side;
- the server stores only token digests;
- tokens are never placed in URLs;
- raw tokens must not be logged;
- sessions are individually revocable.

Frontend bearer tokens are persisted in IndexedDB.

Authenticated API requests send the token centrally through the API client.

Do not manually duplicate bearer-header logic throughout components.

## User isolation

Every project belongs to exactly one User.

All backend project queries must be scoped through the authenticated user.

A user must never be able to enumerate, fetch, modify, or delete another user's
projects.

Local IndexedDB project data is also scoped to the authenticated user's stable
identity.

Async account-scoped frontend operations must capture the expected user identity
when they start and must not commit state after authentication has switched to
another account.

A stale request from User A must never populate User B's frontend state.

This is a security invariant, not merely UI behavior.

## Recovery

TOTP authenticator credentials are optional recovery credentials.

TOTP is not mandatory login 2FA.

Normal login remains:

```text
username + password
```

A configured TOTP credential may be used to reset a forgotten password.

Users may configure multiple authenticator credentials.

TOTP secrets must be encrypted at rest.

Successful password recovery revokes previous device sessions and creates a new
session for the recovered client.

There is deliberately no email or phone recovery fallback.

If a user has no recovery credential and loses the password, the account may be
unrecoverable.

Passkeys may be added later as another recovery/authentication credential type.

Do not add support-mediated identity recovery or security questions.

## Bot/abuse protection

General bot protection is not yet a reason to complicate ordinary login.

The intended near-term signup protection is a lightweight mechanism such as
Cloudflare Turnstile plus server-side rate limiting.

Do not require TOTP pairing merely as bot protection.

Do not add CAPTCHA/challenges to ordinary login unless observed abuse justifies
it.

Solve observed abuse rather than hypothetical sophisticated attackers.

## Data ownership and portability

User data belongs to the user.

Structured export is a core product feature.

JSON is the canonical interchange format.

It must preserve the complete meaningful project hierarchy and stable public
identities without exposing database internals.

Markdown export provides a human-readable representation.

JSON import supports semantic round trips.

Two import modes exist:

```text
Projects screen import
→ create a new project

Project editor import
→ replace the current project's content
→ preserve current project identity/revision/sync ownership
```

Do not create a proprietary opaque project format when documented JSON is
sufficient.

## Stopwatch

The subsection stopwatch is deliberately ephemeral.

Its purpose is to estimate actual spoken duration while reading a subsection.

It:

- uses whole-second display;
- supports start/stop/resume/reset;
- can explicitly copy measured duration into `estimated_seconds`;
- does not persist stopwatch state;
- does not synchronize stopwatch state.

Do not expand it into rehearsal history, analytics, lap timing, or recording
machinery without demonstrated need.

## Appearance

Appearance supports exactly:

```text
System
Light
Dark
```

Default is System.

The preference is local-only.

Do not synchronize it through the backend.

Do not expand this into custom palettes, theme marketplaces, per-project themes,
or a design-system project.

## UI principles

The application should feel like a dedicated writing surface.

The normal flow is:

```text
authenticate
→ choose/create project
→ write
```

Avoid dashboards full of secondary information.

Avoid unnecessary modal workflows.

Avoid decorative complexity that competes with writing.

Autosaving should be quiet and reliable.

Do not require explicit Save buttons for normal editing.

Account/security controls should remain subordinate to writing.

## Scope discipline

Before adding a dependency, abstraction, service, background job, framework, or
subsystem, ask what current requirement needs it.

Do not pre-build:

- collaboration;
- comments;
- generic permissions/RBAC;
- version-history UI;
- analytics;
- tags/folders;
- publishing workflows;
- video hosting;
- audio timelines;
- notification systems;
- general plugin systems;
- generic AI infrastructure;
- elaborate admin systems.

If actual use demonstrates a need, add the smallest feature that solves it.

Features such as the subsection stopwatch and dark mode are examples of the
preferred process:

```text
actual use
→ concrete friction
→ small bounded feature
```

## Implementation behavior

Inspect existing code before changing architecture.

Preserve established conventions.

Prefer boring Rails and boring Vue.

Use framework-native features before adding dependencies.

Keep backend/frontend responsibilities clear.

Do not silently broaden the task.

Do not replace a small requested feature with a generic abstraction unless the
generic abstraction is materially simpler.

When implementation reveals that the requested route is becoming
disproportionately complicated, stop and reconsider rather than accumulating
hacks.

Do not dismiss a failing acceptance test as "unrelated" without evidence.

A flaky test may expose a real race or state-machine bug.

Fix the underlying behavior when that is the case rather than adding arbitrary
test waits.

## Validation

Do not report implementation complete based only on static inspection.

Run the relevant:

- Rails tests;
- frontend build/typecheck;
- Playwright acceptance suite;
- migrations;
- concrete browser/runtime workflow;
- `git diff --check`.

For user-facing behavior, verify the workflow itself.

For local-first/offline behavior, acceptance must include actual browser
offline/network-failure behavior where relevant.

The full acceptance suite should be green before feature work is considered
complete unless a known failure has been explicitly investigated and accepted.

Generated test/build artifacts should not be committed.

The working tree should be clean after a completed committed task.

## Current development phase

The core product feature set is now sufficient for an initial public release.

Pause speculative feature development.

Current priorities are:

1. keep the test suite green;
2. add CI;
3. add lightweight signup abuse protection;
4. prepare production backend deployment;
5. use Kamal for backend deployment;
6. automate frontend deployment to Cloudflare Pages;
7. use version tags as production release boundaries;
8. configure backups and basic production observability;
9. smoke-test the real production signup/login/TOTP/sync/offline flows;
10. resume product feature work only from actual usage.

Inactivity cleanup and other operational refinements may wait until real usage
makes them relevant.

Do not skip back into feature brainstorming merely because implementation is
cheap.