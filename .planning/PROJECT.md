# SQS Admin

## What This Is

A web-based admin UI for managing AWS SQS queues and messages — cloned from an existing open-source tool and being improved. It provides a React/TypeScript frontend backed by a Go proxy server, allowing users to list queues, view and send messages, and manage queue lifecycle (create/delete/purge). Targets both real AWS and LocalStack environments.

## Core Value

A reliable, readable SQS management tool that makes it easy to inspect queue state and debug messages without wrestling with the AWS console.

## Requirements

### Validated

- ✓ List all SQS queues in sidebar — existing
- ✓ Select a queue and view messages (polled every 3s) — existing
- ✓ Send messages to queues (standard and FIFO) — existing
- ✓ Create, delete, and purge queues — existing
- ✓ Display message attributes alongside message body — existing
- ✓ LocalStack support via configurable SQS endpoint — existing
- ✓ Dockerized production deployment — existing

### Active

- [ ] Fix message list flickering (blanks out during polling cycles)
- [ ] Show message count as badge on queue list sidebar entries
- [ ] Show message count in selected queue header
- [ ] Render message body as interactive JSON tree (react-json-tree — already installed)
- [ ] Render message attributes as interactive JSON tree
- [ ] Full UI reimagination — rethink layout, spacing, visual hierarchy from scratch
- [ ] Code quality pass — best practices, architecture improvements surfaced iteratively
- [ ] Increase test coverage (currently thin) — start with high-value unit tests

### Out of Scope

- WebSocket/real-time push updates — polling sufficient for this use case
- Authentication / authorization — relies on AWS credential chain
- Multi-region support — single region via env config
- Mobile layout — desktop tool

## Context

- Cloned from open-source project; primary goal is to make it production-worthy for internal use
- `react-json-tree` is already a dependency but not yet used for message body/attributes rendering
- Polling uses 1-second SQS visibility timeout, which likely causes the flickering (messages temporarily in-flight → list appears empty)
- No global state management — all state is local to the `Overview` component via React hooks
- Backend is a thin Go proxy; almost all logic lives in the frontend
- Test coverage is sparse — frontend has Jest/Testing Library setup, backend has Go testing

## Constraints

- **Tech Stack**: Keep React/TypeScript frontend + Go backend — no framework swaps
- **Dependencies**: Prefer using already-installed libraries (react-json-tree, MUI) before adding new ones
- **Compatibility**: Must continue to work with LocalStack and real AWS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix flickering via optimistic/stable state | Don't clear messages on each poll — merge/replace without blank flash | — Pending |
| Use react-json-tree for body + attributes | Already installed, purpose-built for this | — Pending |
| Full UI redesign via MUI | MUI already in use — rethink layout, not swap libraries | — Pending |
| Surface code quality improvements per phase | Avoid big-bang refactor; fold improvements into each feature phase | — Pending |

---
*Last updated: 2026-04-08 after initialization*
