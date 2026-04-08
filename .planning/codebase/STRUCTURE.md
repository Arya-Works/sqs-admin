# Codebase Structure

**Analysis Date:** 2026-04-08

## Directory Layout

```
sqs-admin/
├── frontend/                   # React TypeScript frontend application
│   ├── api/                    # HTTP communication layer
│   ├── components/             # Reusable React components
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   ├── views/                  # Page-level components
│   ├── index.tsx               # React app entry point
│   ├── App.tsx                 # Root component
│   ├── setupTests.ts           # Jest configuration
│   └── jestTransformer.cjs     # Jest TypeScript transformer
├── server/                     # Go backend application
│   ├── aws/                    # AWS SQS integration
│   │   ├── types/              # Go struct definitions
│   │   ├── sqsClient.go        # SQS operations
│   │   └── clientConfig.go     # AWS SDK initialization
│   ├── handler/                # HTTP request handlers
│   │   ├── handler.go          # Handler abstraction and utilities
│   │   └── sqsHandler.go       # SQS HTTP endpoint logic
│   ├── utils/                  # Utility functions
│   │   └── config.go           # Environment variable helper
│   ├── main.go                 # Backend entry point
│   └── go.mod                  # Go module manifest
├── public/                     # Static assets served by backend
│   ├── favicon.ico
│   ├── manifest.json
│   └── [other assets]
├── localstack/                 # LocalStack SQS simulator configuration
├── example/                    # Example usage/documentation
├── .github/                    # GitHub workflows and configuration
├── index.html                  # HTML entry point for frontend
├── package.json                # Node.js dependencies and scripts
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest test runner configuration
├── Dockerfile                  # Multi-stage container build
├── Makefile                    # Build automation
└── README.md                   # Project documentation
```

## Directory Purposes

**frontend/**
- Purpose: React-based user interface for SQS queue management
- Contains: Components, views, hooks, type definitions, styling via Material-UI
- Key files: `App.tsx`, `index.tsx`, `views/Overview.tsx`

**frontend/api/**
- Purpose: Abstraction layer for HTTP communication with backend
- Contains: `Http.tsx` with `callApi()` function for standardized fetch requests
- Key files: `Http.tsx`

**frontend/components/**
- Purpose: Reusable UI components (dialogs, alerts, items)
- Contains: CreateQueueDialog, SendMessageDialog, Alert, TabPanel, MessageItem
- Key files: `CreateQueueDialog.tsx`, `SendMessageDialog.tsx`, `MessageItem.tsx`

**frontend/hooks/**
- Purpose: Custom React hooks for shared logic
- Contains: `useInterval` for polling-like behavior
- Key files: `useInterval.tsx`

**frontend/types/**
- Purpose: TypeScript type/interface definitions for type safety
- Contains: Queue, SqsMessage, ApiCall, AlertProps, AwsRegion, and other interfaces
- Key files: `index.tsx`

**frontend/views/**
- Purpose: Page-level components that compose lower-level components
- Contains: `Overview` - main dashboard view with queue list and message display
- Key files: `Overview.tsx`

**server/**
- Purpose: Go backend HTTP server and SQS proxy
- Contains: HTTP handlers, AWS integration, utilities
- Key files: `main.go`, `go.mod`

**server/aws/**
- Purpose: AWS SQS SDK integration and queue/message operations
- Contains: Client initialization, operation functions, type definitions
- Key files: `sqsClient.go`, `clientConfig.go`, `types/types.go`

**server/aws/types/**
- Purpose: Go struct definitions mirroring frontend types
- Contains: SqsQueue, SqsMessage, Request, AwsRegion
- Key files: `types.go`

**server/handler/**
- Purpose: HTTP request handling and routing
- Contains: Generic handler abstraction, SQS endpoint handler, response formatting
- Key files: `handler.go`, `sqsHandler.go`

**server/utils/**
- Purpose: Utility functions for configuration and common operations
- Contains: `GetEnv()` for environment variable lookup with fallbacks
- Key files: `config.go`

**public/**
- Purpose: Static assets served by backend via `/` route
- Contains: Built frontend assets, favicon, manifest
- Generated: Yes (via `vite build`)
- Committed: No (in .gitignore)

**localstack/**
- Purpose: Docker-based SQS simulator for local development
- Contains: Python configuration, Docker setup
- Key files: `docker-compose.yml`, `pyproject.toml`

## Key File Locations

**Entry Points:**
- `index.html` - HTML document that loads React app via script tag pointing to `frontend/index.tsx`
- `frontend/index.tsx` - React root creation and mounting
- `server/main.go` - Go binary entry point, HTTP server initialization

**Configuration:**
- `vite.config.ts` - Frontend build configuration (port 3000, asset hashing, vendor splitting)
- `tsconfig.json` - TypeScript compiler options (ES2020 target, strict mode)
- `jest.config.js` - Jest test runner configuration (roots, test match patterns)
- `server/go.mod` - Go module dependencies

**Core Logic:**
- `frontend/views/Overview.tsx` - Main UI orchestrator (queue list, message polling, operations)
- `frontend/api/Http.tsx` - HTTP communication abstraction
- `server/handler/sqsHandler.go` - HTTP endpoint that dispatches to SQS operations
- `server/aws/sqsClient.go` - SQS API calls and data transformation

**Testing:**
- `frontend/components/*.test.tsx` - Component unit tests
- `frontend/views/*.test.tsx` - View unit tests
- `server/handler/sqsHandler_test.go` - Backend handler tests
- `server/utils/config_test.go` - Backend config tests
- `frontend/setupTests.ts` - Jest environment setup

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `CreateQueueDialog.tsx`, `MessageItem.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useInterval.tsx`)
- Go files: snake_case (e.g., `sqsHandler.go`, `clientConfig.go`)
- Test files: `[name].test.tsx` or `[name]_test.go`
- Type definition files: `index.tsx` (frontend), `types.go` (backend)

**Directories:**

- Frontend feature areas: lowercase plural (e.g., `components/`, `hooks/`, `types/`, `views/`)
- Backend feature areas: lowercase (e.g., `aws/`, `handler/`, `utils/`)
- Asset directories: lowercase (e.g., `public/`)

**Functions:**

- Frontend: camelCase (e.g., `callApi()`, `receiveMessageFromCurrentQueue()`)
- Backend: camelCase exported, lowercase private (e.g., `ListQueues()`, `getQueues()`)
- React components: PascalCase (e.g., `CreateQueueDialog`, `Overview`)
- Hooks: camelCase starting with `use` (e.g., `useInterval`)

**Variables:**

- Frontend: camelCase (e.g., `messageBody`, `queueName`, `messageAttributes`)
- Backend: camelCase exported, lowercase private (e.g., `QueueUrl`, `queueUrl`)
- Constants: UPPER_SNAKE_CASE (e.g., `SQS_ENDPOINT_URL` env var)

**Types:**

- Frontend interfaces: PascalCase (e.g., `Queue`, `SqsMessage`, `ApiCall`)
- Backend structs: PascalCase (e.g., `SqsQueue`, `Handler`, `Response`)
- JSON tags: Match field names (e.g., `json:"messageId"`)

## Where to Add New Code

**New Feature (e.g., delete message):**
- Primary code: `server/handler/sqsHandler.go` - add case to action switch
- Backend logic: `server/aws/sqsClient.go` - add `DeleteMessage()` function
- Frontend action: Add case in `frontend/api/Http.tsx` or update `ApiCall` type with new action
- UI trigger: Update relevant dialog component (e.g., `frontend/components/MessageItem.tsx`)
- Types: Update `frontend/types/index.tsx` ApiCall action union and `server/aws/types/types.go` if needed

**New Component/Module:**
- Implementation: `frontend/components/[NewComponent].tsx`
- Types: Add interface to `frontend/types/index.tsx`
- Tests: `frontend/components/[NewComponent].test.tsx` with Jest/React Testing Library
- Usage: Import and render in `frontend/views/Overview.tsx` or parent component

**New Backend Handler:**
- Implementation: Create new function in `server/handler/handler.go` or `sqsHandler.go`
- Route registration: Call `AddRoute()` in `main.go` Initialize method
- Tests: `server/handler/[handler]_test.go`

**Backend Utilities:**
- Shared helpers: `server/utils/` with corresponding test files
- AWS operations: `server/aws/sqsClient.go` for new SQS API calls

**Hooks:**
- Implementation: `frontend/hooks/[useHookName].tsx`
- Usage: Import in components/views that need the behavior

**Type Definitions:**
- Shared interfaces: `frontend/types/index.tsx`
- Backend structs: `server/aws/types/types.go`

## Special Directories

**public/:**
- Purpose: Static assets served as `/` fallback route
- Generated: Yes (populated by `vite build` from `dist/`)
- Committed: No (listed in .gitignore)
- Build process: `yarn build` outputs to `dist/`, Docker copies to `public/`

**dist/:**
- Purpose: Vite build output directory
- Generated: Yes (by `vite build`)
- Committed: No (listed in .gitignore)
- Contents: Minified JavaScript, CSS, assets with hash filenames

**node_modules/:**
- Purpose: Node.js dependency packages
- Generated: Yes (by `yarn install`)
- Committed: No (listed in .gitignore)

**.git/:**
- Purpose: Git version control
- Generated: Yes (git repository)
- Committed: N/A (git internal)

**.github/workflows/:**
- Purpose: CI/CD pipeline definitions
- Committed: Yes (GitHub Actions workflows)

**example/:**
- Purpose: Example configurations or usage patterns
- Committed: Yes
- Usage: Reference for users

---

*Structure analysis: 2026-04-08*
