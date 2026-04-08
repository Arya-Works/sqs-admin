# Technology Stack

**Analysis Date:** 2026-04-08

## Languages

**Primary:**
- Go 1.26 - Backend server, API routes, AWS SQS integration
- TypeScript 5.9 - Frontend application, React components
- JavaScript - Build tooling, Jest configuration

**Secondary:**
- JSON - Configuration and data structures

## Runtime

**Environment:**
- Node.js (via Corepack) - Frontend build and test execution
- Go runtime - Backend server execution

**Package Manager:**
- Yarn 4.13.0 - Node.js dependencies
  - Lockfile: yarn.lock (frozen-lockfile mode in CI)
- Go modules (go.mod/go.sum) - Backend dependencies

## Frameworks

**Core:**
- React 19.2.4 - Frontend UI framework
- Vite 8.0.7 - Frontend build tool and dev server
- Gorilla Mux 1.8.1 - Go HTTP router and handler
- Gorilla Handlers 1.5.2 - Go HTTP middleware (CORS support)

**UI Components:**
- Material-UI (MUI) 7.3.9 - React component library
- MUI Icons Material 7.3.9 - Icon set
- Emotion React 11.14.0 - CSS-in-JS styling
- Emotion Styled 11.14.1 - Styled component utilities
- React JSON Tree 0.20.0 - JSON data visualization

**Testing:**
- Jest 30.3.0 - JavaScript test runner and assertion library
- Go testing (built-in) - Go test framework
- Testing Library React 16.3.2 - React component testing utilities
- Testing Library DOM 10.4.1 - DOM testing utilities
- Testing Library User Event 14.6.1 - User interaction simulation
- Jest Environment JSDOM 30.3.0 - DOM simulation for tests

**Build/Dev:**
- Vite React Plugin 6.0.1 - React plugin for Vite
- ts-jest 29.4.6 - TypeScript support in Jest
- TypeScript 5.9.3 - TypeScript compiler
- Prettier 3.8.1 - Code formatter
- Jest DOM 6.9.1 - Custom Jest matchers for DOM

## Key Dependencies

**Critical:**
- aws-sdk-go-v2 (v1.41.5) - AWS SDK, core client library
- aws-sdk-go-v2/service/sqs (v1.42.25) - SQS service client
- aws-sdk-go-v2/config (v1.32.14) - AWS configuration loading
- aws-sdk-go-v2/credentials (v1.19.14) - AWS credential providers
- google/uuid (v1.6.0) - UUID generation for Go

**Infrastructure:**
- aws-sdk-go-v2/feature/ec2/imds (v1.18.21) - EC2 IMDS support
- aws-sdk-go-v2/service/sts (v1.41.10) - STS for credentials
- aws-sdk-go-v2/service/sso (v1.30.15) - SSO credential support

## Configuration

**Environment:**
- Environment variables for runtime configuration:
  - `SQS_ENDPOINT_URL` - SQS endpoint (default: http://localhost:4566)
  - `SQS_AWS_REGION` - AWS region (default: eu-central-1)
  - `HTTP_PORT` - Backend server port (default: 3999)
  - `SQS_ADMIN_STATIC_DIR` - Path to static frontend assets (default: ../public)
  - `API_PREFIX` - Optional API route prefix for extensions
  - `BASE_PATH` - Optional base path for static file serving
  - `LOCALSTACK_AUTH_TOKEN` - LocalStack authentication token

**Build:**
- `vite.config.ts` - Vite build configuration with React plugin, asset hashing, code splitting
- `tsconfig.json` - TypeScript compiler options (ES2020 target, strict mode)
- `tsconfig.node.json` - TypeScript config for Vite config itself
- `jest.config.js` - Jest test configuration with ts-jest transformer
- `prettier.rc.json` - Prettier formatter config (empty default)
- `Dockerfile` - Multi-stage Docker build for production deployment

## Platform Requirements

**Development:**
- Node.js 18+ (via Yarn Corepack)
- Go 1.24+ (1.26 currently used)
- Docker (for LocalStack testing)
- Make (for development commands)

**Production:**
- Docker deployment target
- Docker image built from multi-stage Dockerfile:
  - Stage 1: Node/React build (node:24-alpine)
  - Stage 2: Go compilation (golang:1.26-alpine)
  - Stage 3: Scratch image (minimal ~8MB final size)
- Runs on port 3999 by default
- Non-root user (uid 65534) for security

---

*Stack analysis: 2026-04-08*
