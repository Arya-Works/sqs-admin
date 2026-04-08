# External Integrations

**Analysis Date:** 2026-04-08

## APIs & External Services

**AWS SQS:**
- SQS (Simple Queue Service) - Queue management and message operations
  - SDK/Client: `aws-sdk-go-v2/service/sqs`
  - Auth: Static credentials (configurable via env vars)
  - Implementation: `server/aws/clientConfig.go` - AWS SDK v2 configuration
  - Supported operations:
    - List queues via GET /sqs
    - Create queue via POST with action "CreateQueue"
    - Send messages via POST with action "SendMessage"
    - Get/receive messages via POST with action "GetMessages"
    - Delete queue via POST with action "DeleteQueue"
    - Purge queue via POST with action "PurgeQueue"

## Data Storage

**Queues:**
- AWS SQS (primary) or LocalStack (local development)
  - Connection: Environment variable `SQS_ENDPOINT_URL` (default: http://localhost:4566)
  - Region: Environment variable `SQS_AWS_REGION` (default: eu-central-1)
  - Client: AWS SDK v2 SQS service client
  - File: `server/aws/sqsClient.go` contains queue operations (ListQueues, CreateQueue, SendMessage, DeleteQueue, PurgeQueue, GetMessages)

**File Storage:**
- Local filesystem only
  - Frontend static assets served from directory specified by `SQS_ADMIN_STATIC_DIR` env var
  - Default: `../public` relative to backend
  - Built frontend output goes to `dist/` directory

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Custom static credentials approach
  - Implementation: `server/aws/clientConfig.go`
  - Uses static credentials: "ACCESS_KEY", "SECRET_KEY", "TOKEN"
  - Intended for local development with LocalStack
  - No actual AWS credential validation in development mode

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Standard logging via Go `log` package
  - Backend logs to stdout/stderr
  - Log messages in handler: queue creation, deletion, purge operations
  - File: `server/handler/sqsHandler.go` - log.Printf calls

## CI/CD & Deployment

**Hosting:**
- Docker Hub - docker image `pacovk/sqs-admin`
- GitHub Container Registry (via workflow)

**CI Pipeline:**
- GitHub Actions
  - Build workflow: `.github/workflows/build.yml`
    - Triggered on: main branch push, tags (v*.*.*), daily schedule (5 AM UTC)
    - Multi-architecture build: linux/amd64, linux/arm64
    - Uses Docker Buildx for cross-platform compilation
    - Publishes to DockerHub on non-PR events
  - Frontend tests: `.github/workflows/frontend.test.yml`
    - Triggered on every push
    - Runs: yarn install, yarn test
  - Server tests: `.github/workflows/server.test.yml`
    - Triggered on every push
    - Runs: go test -v ./... with LocalStack service
    - LocalStack container configured with SQS service

## Environment Configuration

**Required env vars:**
- `SQS_ENDPOINT_URL` - SQS endpoint URL (for custom SQS/LocalStack)
- `LOCALSTACK_AUTH_TOKEN` - LocalStack authentication token (required as of March 2026)

**Optional env vars:**
- `SQS_AWS_REGION` - AWS region (default: eu-central-1)
- `HTTP_PORT` - Backend server port (default: 3999)
- `SQS_ADMIN_STATIC_DIR` - Frontend assets directory (default: ../public)
- `API_PREFIX` - API route prefix for extensions
- `BASE_PATH` - Base path for static file serving

**Secrets location:**
- Environment variables (development)
- `.env` file (local development, created from `.env.sample`)
- GitHub Secrets (CI/CD): `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `LOCALSTACK_AUTH_TOKEN`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Development Services

**LocalStack:**
- Local AWS service mock
  - Used in development and testing
  - Started via docker-compose: `server/docker-compose.yml`
  - Services: SQS only
  - Requires: `LOCALSTACK_AUTH_TOKEN` environment variable
  - Port: 4566 (standard LocalStack port)

## API Endpoints

**Backend Routes:**
- `GET /sqs` - List all queues
- `POST /sqs` - Queue operations (determined by request payload action field):
  - Action: "CreateQueue"
  - Action: "SendMessage"
  - Action: "DeleteQueue"
  - Action: "PurgeQueue"
  - Action: "GetMessages"
  - Action: "GetRegion"
- `GET /` (with optional BASE_PATH) - Serve frontend static assets
- Optional API_PREFIX routing support for LocalStack extensions

**Frontend API Integration:**
- File: `frontend/api/Http.tsx`
- Base URL: `http://localhost:3999` (dev) or relative to current host (production)
- Endpoint: `/sqs`
- Methods: GET (list queues), POST (operations)
- Content-Type: application/json
- Response format: Payload object from backend API

---

*Integration audit: 2026-04-08*
