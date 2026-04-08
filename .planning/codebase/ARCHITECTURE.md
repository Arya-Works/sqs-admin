# Architecture

**Analysis Date:** 2026-04-08

## Pattern Overview

**Overall:** Two-tier full-stack application with clear separation between frontend (React/TypeScript) and backend (Go). The architecture follows a client-server model with the backend exposing a single HTTP API endpoint that dispatches to SQS operations based on action payloads.

**Key Characteristics:**
- Frontend and backend are independently deployable
- Backend acts as a proxy to AWS SQS with standardized request/response handling
- Environment-configurable endpoints and regions
- CORS-enabled for local development and cross-origin requests
- Static file serving from the same binary

## Layers

**Frontend (React/TypeScript):**
- Purpose: User interface for managing SQS queues and messages
- Location: `frontend/`
- Contains: React components, hooks, API client, type definitions, views
- Depends on: Material-UI, react-json-tree, Vite (build tooling)
- Used by: End users in a web browser

**Backend (Go):**
- Purpose: HTTP server that proxies requests to AWS SQS and serves static assets
- Location: `server/`
- Contains: HTTP handlers, AWS SQS client configuration, utilities, type definitions
- Depends on: AWS SDK v2, gorilla/mux, gorilla/handlers
- Used by: Frontend via HTTP requests

**AWS Integration Layer:**
- Purpose: Direct SQS operations via AWS SDK
- Location: `server/aws/`
- Contains: SQS client initialization, queue operations, message handling, type definitions
- Depends on: AWS SDK Go v2, standard library
- Used by: Backend handlers

**API Client Layer (Frontend):**
- Purpose: HTTP communication abstraction
- Location: `frontend/api/Http.tsx`
- Contains: Fetch-based API call wrapper with success/error callbacks
- Depends on: Browser Fetch API
- Used by: Views and components for server communication

## Data Flow

**Queue Listing Flow:**

1. User loads application → `frontend/index.tsx` mounts React app
2. `Overview` component (mounted in `App.tsx`) calls `useEffect` hook
3. `Overview` executes `callApi()` with GET method to `/sqs` endpoint
4. Backend `main.go` initializes routes, `SQSHandler` matches GET request
5. `sqsHandler.go` calls `aws.ListQueues()` 
6. `sqsClient.go` iterates queues, fetches attributes for each via `GetQueueAttributes()`
7. Response marshaled to JSON and returned to frontend
8. Frontend `setQueues()` updates state, `Overview` renders queue list

**Message Receiving Flow:**

1. `useInterval` hook in `Overview` triggers every 3000ms
2. Calls `receiveMessageFromCurrentQueue()` with selected queue URL
3. `callApi()` POST to `/sqs` with action "GetMessages"
4. Backend dispatches to `aws.GetMessages()`
5. `sqsClient.go` calls `receiveMessages()` with visibility timeout of 1 second
6. Messages fetched with all attributes, custom attributes JSON-parsed
7. `SqsMessage` array returned, frontend updates `messages` state
8. `Overview` renders messages in tab panels

**Message Sending Flow:**

1. User clicks "Send message" dialog, fills form
2. Custom attributes collected as `Map<string, string>` and JSON stringified
3. For FIFO queues, MessageGroupId extracted and validated
4. `callApi()` POST with action "SendMessage"
5. Backend routes to `aws.SendMessage()`
6. `sqsClient.go` builds message attributes from JSON string
7. Sets MessageDeduplicationId UUID for FIFO queues
8. AWS SDK sends to SQS

**Queue Creation/Deletion/Purge Flow:**

1. Similar to message flow: dialog → `callApi()` POST with action → backend dispatch → AWS operation
2. Completion triggers reload (for creation/deletion) or state clear (for purge)

**State Management:**

- Frontend state is local to React components (hooks-based)
- No global state container (Redux, Zustand, etc.)
- Component-level state in `Overview` is source of truth for queues/messages
- Polling via `useInterval` hook keeps messages fresh
- Manual reload triggers after queue create/delete operations

## Key Abstractions

**Handler (Backend):**
- Purpose: Standardized HTTP route definition and execution
- Examples: `server/handler/handler.go` - `Handler` struct with Route function and Func handler
- Pattern: Function-based route builder with closure capturing logic

**ApiCall (Frontend):**
- Purpose: Standardized HTTP request specification
- Examples: `frontend/types/index.tsx` - `ApiCall` interface
- Pattern: Object with method, action, queue, message, and callback functions

**SqsQueue/SqsMessage Types:**
- Purpose: Shared domain models across frontend/backend
- Examples: `frontend/types/index.tsx` (Queue, SqsMessage), `server/aws/types/types.go` (SqsQueue, SqsMessage)
- Pattern: TypeScript interfaces on frontend, Go structs on backend with matching JSON tags

**Environment Configuration:**
- Purpose: Runtime customization without code changes
- Pattern: `utils.GetEnv()` function with fallback defaults
- Used for: API prefix, base path, AWS region, SQS endpoint URL, HTTP port, static directory

## Entry Points

**Frontend Entry Point:**
- Location: `frontend/index.tsx`
- Triggers: Browser loads `index.html` which includes script tag
- Responsibilities: Creates React root and mounts `App` component

**Backend Entry Point:**
- Location: `server/main.go` - `main()` function
- Triggers: Binary execution
- Responsibilities: Initializes `App` struct, sets up routes via `Initialize()`, starts HTTP server with CORS headers

**HTTP Entry Points:**
- GET `/sqs` → Backend lists all queues via `ListQueues()`
- POST `/sqs` with action payload → Backend dispatches to queue/message operations
- GET `/*` → Static file serving from `public/` directory

## Error Handling

**Strategy:** Errors are caught at boundaries (HTTP layer, API call layer) and returned as JSON responses or promise rejections. No global error boundary on frontend.

**Patterns:**

Frontend:
- `callApi()` catches fetch errors and calls `onError` callback with error message string
- Components handle errors by updating local error state
- Alert component displays errors to user

Backend:
- `checkForErrorAndRespondJSON()` converts Go errors to HTTP 400 responses
- Errors logged to stdout via `log.Printf()`
- nil checks used for Optional types
- Fatal errors in `unpackRequestPayload()` cause process exit

## Cross-Cutting Concerns

**Logging:** 
- Frontend: None (no logging infrastructure)
- Backend: `log` package with `Printf()` for informational and error logging

**Validation:**
- Frontend: Dialog component validation (queue name required, message body required, attributes key/value non-empty)
- Backend: Minimal validation (relies on AWS SDK for queue/message validation)

**Authentication:**
- Frontend: None (no auth guard)
- Backend: None (relies on AWS SDK credentials via environment variables and static credentials for Localstack)

**CORS:**
- Backend: `gorilla/handlers` CORS middleware allows all origins, specific headers (X-Requested-With, Content-Type), specific methods (GET, HEAD, POST, PUT, OPTIONS)

---

*Architecture analysis: 2026-04-08*
