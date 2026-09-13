# Scriptorium

Scriptorium is a place to write video scripts.

That is deliberately a narrow definition.

The product exists because writing software has a tendency to accumulate everything around writing: project management, publishing, analytics, collaboration, AI generation, notifications, dashboards, and eventually enough machinery that writing becomes only one feature among many.

Scriptorium should resist that.

## Premise

If you want to write your script, come here and write it.

No bullshit.
No perdoling.

The application should provide enough structure to make long-form video scripts easier to organize, while staying out of the way of the author.

It should work when the network does not.

The user's data belongs to the user.

It will not write the script for them.

## Writing, not generation

Scriptorium has no built-in AI writing features.

No:

- "write this section";
- "continue";
- "make this funnier";
- "rewrite";
- "generate ideas";
- "summarize";
- "AI assistant";
- sparkle button next to every text field.

This is not an anti-AI position.

A user may use ChatGPT, Claude, a local model, another person, a notebook, or anything else as part of their writing process. They can paste text into Scriptorium if they want.

Scriptorium simply does not pretend that authorship is one of its jobs.

The application is a writing surface and structure, not a substitute for participation in writing.

## Why offline matters

Writing is often useful precisely when connectivity is poor or intentionally absent.

Examples include:

- working on a train with intermittent mobile coverage;
- travelling;
- working somewhere without reliable internet;
- intentionally switching off Wi-Fi to remove distractions;
- using a laptop as a deliberately "dumb" writing machine for a while.

Losing network connectivity should therefore be uninteresting.

If a project has already been available on the device, the user should be able to open it, write, restructure it, and continue working normally.

When connectivity returns, synchronization should happen quietly.

The desired mental model is:

```text
online:
write normally

offline:
write normally

online again:
continue writing normally
````

The synchronization machinery exists to support writing. The writer should not have to work for the synchronization machinery.

## Data ownership

All meaningful project data must be portable.

The application should provide a documented structured JSON export that preserves the complete script hierarchy.

A human-readable export such as Markdown should also be available.

The user should never need Scriptorium in order to recover or understand their own writing.

If the service disappears tomorrow, exported scripts should remain useful.

If import is implemented, a project should be able to survive an export/import round trip without losing meaningful content.

## Script structure

A script has three structural levels:

```text
Video project
└── Section
    └── Subsection
```

### Video project

A project represents one planned video.

It may contain:

* a title;
* a thumbnail;
* a target duration;
* ordered sections.

### Section

A section is approximately equivalent to a YouTube chapter.

It gives the overall script a visible structure but is not intended to carry most of the actual writing.

A section contains ordered subsections.

### Subsection

A subsection represents one meaningful narrative unit.

Its title is optional.

A subsection may contain:

* script text;
* notes describing what the viewer should see;
* notes describing the point/explanation of that part;
* an estimated duration.

This lets a chapter contain several distinct narrative beats without forcing every beat to become a public-facing chapter.

## Initial user experience

The main screen is a collection of video-project cards.

A project card shows enough information to identify the project, such as its title and optional thumbnail.

A visible `+` card creates a new project.

Opening a project leads directly to the writing interface.

There should not be an intermediate productivity dashboard.

The project editor presents sections and subsections in order and makes it easy to:

* write;
* add sections;
* add subsections;
* remove them;
* reorder them;
* see estimated timing;
* continue working without explicitly saving every edit.

The editor should make script structure obvious without making the structure more important than the text.

## Duration

A project can optionally have a target duration.

Subsections can optionally have estimated durations.

The application can sum those estimates and show something like:

```text
Target: 45:00
Planned: 31:20
```

This is a writing aid, not an analytics system.

No elaborate pacing analysis is required unless actual use later demonstrates value.

## Interchange

JSON is the structured interchange format.

The format should be simple, documented, and versioned.

An export should describe concepts, not database implementation details.

For example:

```json
{
  "schema_version": 1,
  "title": "Lenovo Tab M11",
  "target_duration_seconds": 2700,
  "sections": [
    {
      "position": 1,
      "title": "Opening",
      "subsections": [
        {
          "position": 1,
          "title": null,
          "viewer_sees": "Boot montage, KDE, camera, stylus",
          "explanation_notes": "Show the result before explaining why it exists.",
          "script": "I started using Linux a long time ago...",
          "estimated_seconds": 150
        }
      ]
    }
  ]
}
```

The JSON format is useful for backup, migration, external tooling, and handing a structured script to another person or an external AI system for review.

Scriptorium itself does not need to contain those external tools.

## Project document contract

The video project is the aggregate/document boundary. The canonical internal
document is versioned with `schema_version: 1` and contains the project,
ordered sections, and ordered subsections. Section and subsection array order
is authoritative; persisted positions are normalized from those arrays.

Projects have one aggregate `revision`, starting at `0` and incrementing after
each successful whole-document update. The frontend sends the expected
revision with the complete document. Rails rejects stale revisions with HTTP
409 and applies valid replacements transactionally, so invalid documents do not
partially change the project.

The frontend edits its local Pinia document first and quietly debounces one
project-document save. Known project
documents are stored durably in IndexedDB before remote synchronization. The
application shell's static assets are cached by a production service worker;
project data is not hidden in an HTTP cache. Dirty documents synchronize when
the server is reachable again, using the revision check above. A stale revision
shows an explicit choice to load the online copy or overwrite it with the
local copy; there is no automatic merge. Project deletion deliberately still
requires a connection in this phase.

## Possible future users

Scriptorium begins as a tool for its author.

There is no requirement to build authentication or multi-user support into the first version.

However, the product itself is not inherently single-user.

If it proves useful to other people, the natural extension is:

```text
User
└── Video projects
```

with conventional authentication and synchronization.

Opening it to other users should not change the basic premise.

## Account recovery

Accounts use a username and password. Scriptorium does not collect email
addresses or phone numbers. Authenticator apps are optional recovery
credentials, not mandatory login two-factor authentication. A confirmed TOTP
credential can reset the password; users may configure multiple authenticators.
Recovery revokes all previous device sessions and signs the recovered client in.
If no recovery credential exists and the password is lost, the account is
unrecoverable by design. Passkeys may be added later as another credential type.

## Accounts and authentication

An account is required to use Scriptorium; there is no anonymous editing mode
or anonymous-project adoption flow. Accounts use an opaque username and
password. Email addresses and phone numbers are neither required nor
collected, and a username that happens to look like an email address remains
an opaque username.

Frontend clients authenticate with opaque bearer device-session tokens. The
server stores only a cryptographic digest of each token, and logout revokes
the current device session. Devise supplies password hashing; email-oriented
modules and mailers are not enabled. Future recovery credentials will be
TOTP/passkey-based rather than email-based.

The bearer token and all locally cached project state are kept in IndexedDB.
Project state is namespaced by the authenticated user's stable ID, so a
different account cannot read, upload, or synchronize another account's local
documents. Authentication state is not part of canonical project documents or
JSON/Markdown exports.

Project API queries are scoped through the authenticated user. User-authored
project content remains text-first and is never interpreted as arbitrary HTML.

A hosted version must still be:

* focused on writing;
* usable offline;
* portable;
* respectful of user ownership;
* free of mandatory AI functionality;
* deliberately small in scope.

## What Scriptorium is not trying to become

Scriptorium is not trying to compete with:

* Final Cut Pro;
* DaVinci Resolve;
* Notion;
* Jira;
* Google Docs collaboration;
* YouTube Studio;
* generic note-taking applications;
* AI writing products.

If another mature tool already solves a neighbouring problem well, users should use that tool.

Scriptorium should not absorb adjacent categories merely to increase the number of features.

## Product decision rule

A new feature should answer a real problem encountered while writing scripts.

"Someone might want this someday" is not sufficient.

"Other products have this" is not sufficient.

"It would be easy to add" is not sufficient.

"An agent can implement it quickly" is definitely not sufficient.

When the existing workflow repeatedly produces a concrete problem, solve that problem in the smallest reasonable way.

Otherwise, leave it alone.

## Success

Success is not feature count.

Scriptorium succeeds if a user can:

1. open it;
2. write and organize a script without fighting the tool;
3. keep writing when the internet disappears;
4. return later and find their work intact;
5. take all of their data with them whenever they want.

Everything else is secondary.
