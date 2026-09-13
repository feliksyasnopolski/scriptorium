# Scriptorium

Scriptorium is a focused, text-first application for writing video scripts.

It gives long-form video writing enough structure to stay manageable without turning the work into project management, publishing, analytics, collaboration, or a creator dashboard. Open a project, organize the argument, and write.

**Scriptorium helps you write. It does not write instead of you.**

## What it does

A script is organized as a project containing ordered sections and subsections. Subsections are the main writing units: each can hold script text, an optional title, notes about what the viewer sees, explanation or intent notes, and an estimated duration.

The current application includes:

- project, section, and subsection editing and reordering;
- target duration and a calculated planned duration;
- an ephemeral stopwatch for timing a spoken subsection, with an explicit action to use the result as its estimate;
- quiet local saving and synchronization, with clear conflict choices when the online and local copies diverge;
- structured JSON import and export, plus human-readable Markdown export;
- System, Light, and Dark appearance modes;
- username-and-password accounts with optional authenticator-app recovery.

There is no intermediate productivity dashboard and no manual Save button for normal editing. The writing surface is the product.

## Free means usable

The core writing experience should remain free. A writer should always be able to do the basic work of creating, structuring, and writing a useful script without paying.

Future supporter features may cover services with real ongoing costs or optional convenience, such as hosted compute for proofreading or structural analysis. Those are directions, not current paid plans. The principle is simple: **pay for optional compute or convenience, not permission to write.**

## Local-first and portable

Once an account and project are available on a device, normal writing can continue when the network disappears. Changes are saved locally, and synchronization resumes when connectivity returns. If two versions conflict, Scriptorium asks which copy to keep rather than silently merging or discarding work.

Your scripts are not trapped in the application. JSON export preserves the meaningful project hierarchy for backup, migration, or external tooling, and Markdown export produces a readable document that remains useful without Scriptorium. JSON can also be imported as a new project or used to replace the contents of the project currently being edited.

## Human authorship

Scriptorium is not an AI writing app and does not generate script content. If a writer wants generated prose from an external tool, they can paste or import it like any other text.

Future assisted features may proofread, analyze pacing or structure, detect repetition or contradictions, or suggest ways to reorganize existing material. The boundary is deliberate:

```text
AI may analyze, classify, compare, reorder, and proofread.
AI may not author script content.
```

## Accounts and recovery

An account is required. Identity is a username and password; Scriptorium does not require an email address or phone number. Authenticator-app TOTP credentials can optionally be configured for password recovery and are not required for ordinary login. Local project data is kept separate for each authenticated account on the device.

## Running locally

Scriptorium is a Rails/PostgreSQL backend with a Vue 3, TypeScript, Pinia, and Vite frontend. Local development requires Ruby 4.0.1, PostgreSQL, Node.js, and npm.

Install the dependencies and prepare the development database:

```sh
cd backend
bundle install
bin/rails db:prepare

cd ../frontend
npm ci
```

Then start Rails and Vite together from the repository root:

```sh
bin/dev
```

The frontend runs at <http://localhost:5173> and proxies API requests to Rails at <http://localhost:3000>.

## Repository layout

```text
scriptorium/
├── backend/    Rails application and PostgreSQL persistence
├── frontend/   Vue application and browser acceptance tests
└── docs/       Product and security documentation
```

Rails owns accounts, device sessions, recovery credentials, authorization, and server-side project synchronization. Vue owns the writing interface, local project storage, synchronization state, import/export, and appearance.

## Tests

Run backend tests from `backend/`:

```sh
bundle exec rails test
```

Run the frontend typecheck and production build, then the Playwright acceptance suite, from `frontend/`:

```sh
npm run build
npm run test:e2e
```

The Playwright configuration starts both development servers and runs the real workflow in Chromium. PostgreSQL must be available, and the Playwright browser must have been installed (`npx playwright install chromium`).

## Project status

Scriptorium is under active development. The core product is sufficient for an initial public release; current work is focused on testing, deployment, backups, observability, and production smoke testing rather than speculative feature expansion.

For the product's scope and design constraints, see [`docs/PRODUCT.md`](docs/PRODUCT.md). For the account and recovery model, see [`docs/SECURITY.md`](docs/SECURITY.md).
