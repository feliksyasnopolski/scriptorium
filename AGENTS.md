# AGENTS.md

# Scriptorium

Scriptorium is a focused application for writing video scripts.

The repository is a monorepo:

```text
scriptorium/
├── backend/    Rails application
├── frontend/   Vue 3 application
└── docs/
```

Read `docs/PRODUCT.md` before making product or architectural decisions.

## Core rule

Do not build things merely because they are technically possible.

Prefer the smallest implementation that solves the demonstrated problem.

No bullshit. No perdoling.

When a task starts requiring increasingly complicated workarounds, repeated failed attempts, or infrastructure disproportionate to the feature, stop and reconsider the route instead of blindly continuing.

Existing mature components are preferred over bespoke infrastructure unless there is a concrete reason not to use them.

## Product boundaries

Scriptorium is a writing tool.

It is not:

* an AI writing assistant;
* a video editor;
* a publishing platform;
* a creator dashboard;
* a project-management system;
* a collaboration suite;
* an analytics product;
* a social product.

Do not introduce functionality from those categories unless the user explicitly changes the product direction.

In particular, do not add AI generation, rewriting, completion, summarization, prompt fields, model integrations, or "magic" writing buttons.

Users are free to use external tools however they want. Scriptorium itself does not write for them.

## Architecture

The repository contains two separate applications in one monorepo.

### Backend

`backend/` is a regular Rails application using PostgreSQL.

It is deliberately not generated with `--api`.

The public application UI belongs to the Vue frontend, but keeping the normal Rails stack leaves room for simple Rails-rendered administrative/operator interfaces later.

Rails owns:

* persistent server-side data;
* HTTP API;
* eventual authentication and users;
* synchronization endpoints;
* import/export support where server participation is useful;
* uploaded assets such as project thumbnails;
* administrative functionality if it is ever needed.

Do not add a second public frontend inside Rails.

### Frontend

`frontend/` is a Vue 3 + TypeScript application built with Vite.

Use Pinia for shared application state.

The frontend owns:

* the script-writing UI;
* project/section/subsection editing;
* local application state;
* offline persistence;
* synchronization state;
* eventual PWA/service-worker functionality.

Do not recreate Pinia using ad-hoc globals, event buses, or a collection of unrelated composables.

Do not introduce another frontend framework.

## Data model

The core hierarchy is:

```text
VideoProject
└── Section[]
    └── Subsection[]
```

A `VideoProject` represents one video/script project.

A `Section` represents something roughly equivalent to a YouTube chapter.

A `Subsection` is the actual writing unit.

Sections are primarily organizational containers. Actual script content belongs in subsections.

Expected subsection fields include:

* optional title;
* viewer/visual notes;
* explanation/intent notes;
* script text;
* optional estimated duration;
* position.

Expected section fields include:

* title;
* position.

Expected project fields include:

* title;
* optional target duration;
* optional thumbnail.

Do not duplicate derived values unnecessarily. For example, planned project duration should normally be calculated from subsection duration estimates.

## Ordering

Sections and subsections are ordered.

Use a straightforward persisted position value unless real usage demonstrates that a more sophisticated ordering scheme is required.

Do not add complex ordering libraries or fractional-ranking systems without a demonstrated need.

## Offline-first direction

Offline operation is a core product requirement, not an optional enhancement.

The eventual editing path is:

```text
user edit
→ frontend state
→ local durable storage
→ synchronization queue
→ server
```

When offline support is implemented:

* editing must not depend on the server being reachable;
* local edits must survive browser reload/restart;
* reconnecting should synchronize automatically;
* connectivity loss must not interrupt the writing workflow;
* the UI may indicate states such as `Synced`, `Saved locally`, or `Sync error`, but should not constantly demand attention.

Use IndexedDB for durable browser-side project data unless there is a concrete reason to choose something else.

Do not introduce CRDTs, operational transformation, WebSocket collaboration, or distributed conflict-resolution machinery merely in anticipation of possible future multi-device or multi-user editing.

Start with simple version/conflict detection. Improve it only when real usage requires it.

## Data ownership and portability

The user's data belongs to the user.

Structured export is a core feature.

JSON is the canonical interchange format and must be versioned with a schema version.

A project export should preserve the complete meaningful hierarchy and content without relying on internal database IDs.

Human-readable Markdown export is also desirable.

JSON import should eventually support lossless semantic round trips.

Do not create a proprietary project format when ordinary documented JSON is sufficient.

## Authentication and multiple users

The first version does not need users or authentication.

The data model should remain easy to extend later with:

```text
User
└── VideoProject[]
```

Do not build speculative multi-tenancy infrastructure now.

If the application is eventually opened to multiple users, conventional Rails authentication plus external identity providers such as Google or Apple is an acceptable direction.

Do not distort current implementation merely to prepare for hypothetical scale.

## UI principles

The application should feel like a dedicated writing tool.

The normal flow is:

```text
open application
→ choose/create project
→ write
```

Avoid dashboards full of secondary information.

Avoid unnecessary modal workflows.

Avoid decorative complexity that competes with writing.

The project screen should expose the structure of the script clearly:

```text
Project
  Section
    Subsection
    Subsection
  Section
    Subsection
```

Autosaving should be quiet and reliable.

Do not require explicit Save buttons for routine text editing unless there is a technical reason.

## Scope discipline

Before adding a dependency, abstraction, service, background job, framework, or subsystem, ask what current requirement needs it.

Do not pre-build:

* collaboration;
* comments;
* permissions beyond what currently exists;
* version-history UI;
* analytics;
* tags;
* folders;
* publishing workflows;
* video hosting;
* audio handling;
* timelines;
* notifications;
* embedded AI;
* elaborate admin systems;
* generic plugin systems.

If actual use demonstrates a need, add the smallest feature that solves it.

## Implementation behavior

Inspect the existing code before changing architecture.

Preserve established project conventions once they exist.

Prefer boring Rails and boring Vue code.

Use framework-native features before adding dependencies.

Keep backend/frontend responsibilities clear.

Do not silently broaden the task.

Do not replace a small requested feature with a generic abstraction unless the generic abstraction is materially simpler.

When implementation reveals that the requested route is becoming disproportionately complicated, report the issue and reconsider the approach rather than accumulating hacks.

## Validation

Do not report implementation complete based only on static inspection.

Run the relevant application, tests, builds, migrations, or concrete acceptance path whenever the environment permits it.

For user-facing workflows, verify the workflow itself.

For offline functionality, acceptance must include actual offline operation rather than only mocked network state or unit tests.

## Current development priority

Build Scriptorium in small usable increments.

The current priority order is:

1. repository/application bootstrap;
2. core project/section/subsection writing flow;
3. durable offline-first frontend storage and synchronization;
4. JSON/Markdown interchange;
5. improvements driven by actual use;
6. multi-user functionality only if there is a real reason to publish the service.

Do not skip ahead because a later feature seems interesting.

