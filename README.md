<p align="center">
  <img src="https://github.com/user-attachments/assets/11fe5716-16c6-46e5-b64f-a992c2ba0773" />
</p>

> Fork of [PacoVK/sqs-admin](https://github.com/PacoVK/sqs-admin).

A minimal and lightweight UI for managing SQS queues — LocalStack for local development, or real AWS.

## What's New

This fork significantly redesigns the UI for multi-queue monitoring workflows.

**Real AWS support**
- Connect to real AWS SQS — not just LocalStack
- Mode is determined entirely by `SQS_ENDPOINT_URL`: set it for LocalStack, leave it unset for AWS
- Uses the default AWS credential chain when in AWS mode (profiles, env vars, instance roles, SSO)
- Create Queue and Delete Queue are hidden in AWS mode to prevent accidental mutations
- Frontend auto-detects backend mode changes and reloads to clear stale state

**Polling**
- Recursive polling: waits for the response before scheduling the next request — prevents pile-up on slow or high-latency backends
- SQS long polling (`WaitTimeSeconds: 5`) on real AWS — reduces empty-queue API calls significantly
- LocalStack uses short polling (`WaitTimeSeconds: 0`) for fast local feedback
- Per-column pause/resume toggle — freeze the message list to inspect messages, then resume live polling
- Manual refresh button works while paused (one-shot fetch)

**Multi-column layout**
- Open up to N columns side-by-side (capped at `floor(viewport width / 320px)`)
- Add columns with the `+` button in the toolbar; close any column with `×`
- Column count and queue selections persist in the URL (`?c=2&q1=abc123&q2=def456`) — shareable and refresh-safe
- Queue names are hashed (djb2, 6 base-36 chars) to keep URLs compact

**Per-column message monitoring**
- Messages display as expandable accordions within each column — no separate detail panel
- Expand a message inline to see its full body (Tree or Raw view), custom attributes, metadata, and delete action
- Tree/Raw toggle is per-column and always visible in the column header
- Live message count badge uses `ApproximateNumberOfMessages` from queue attributes, falling back to the polled count

**Queue search**
- Filter queues by name with wildcard support: `*orders*prod*` matches any queue containing both substrings in order
- Linear-time matching via sequential `indexOf` — no regex, no backtracking

**Design**
- Animated three-dot loading indicator (accent purple) replaces the generic spinner
- Brutalist white/black aesthetic with indigo/violet accent palette
- Content width capped at `max(columns × 480px, 1440px)` with smooth CSS transition as columns are added

---

## Usage

### Docker Compose

```yaml
services:
  sqs-admin:
    image: ghcr.io/arya-works/sqs-admin:latest
    ports:
      - "3999:3999"
    environment:
      SQS_AWS_REGION: us-east-1
      # LocalStack:
      # SQS_ENDPOINT_URL: http://localstack:4566
      # Real AWS — pass credentials from host:
      # AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      # AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
```

A working LocalStack + sqs-admin example is in the `example` directory.

### Docker Run

```bash
# LocalStack
docker run --rm -p 3999:3999 -e SQS_ENDPOINT_URL=http://localhost:4566 ghcr.io/arya-works/sqs-admin:latest

# Real AWS
docker run --rm -p 3999:3999 \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e SQS_AWS_REGION=us-east-1 \
  ghcr.io/arya-works/sqs-admin:latest
```

## Configuration

| ENV              | Description                                                                                     | Default      |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| SQS_ENDPOINT_URL | SQS endpoint. **Set for LocalStack; leave unset to connect to real AWS.**                       | *(unset)*    |
| SQS_AWS_REGION   | AWS region                                                                                      | eu-central-1 |
| HTTP_PORT        | Port the backend binds to                                                                       | 3999         |

When `SQS_ENDPOINT_URL` is unset the server uses the standard AWS credential chain (environment variables, `~/.aws/credentials` profiles, instance roles, SSO, etc.).

## Development

### Prerequisites

This project uses Yarn 4 (Berry) via Corepack. Enable it once:

```bash
corepack enable
```

### Run local environment

**Against LocalStack:**
```bash
make dev
```

**Against real AWS** (uses your default AWS credential profile):
```bash
make dev-aws
```

Both commands start the backend on `http://localhost:3999` and the frontend on `http://localhost:3000`. Switching between modes kills the previous server automatically. The frontend detects the mode change and reloads.

### Run tests

**Frontend:**
```bash
yarn test                  # run once
yarn test --watch          # watch mode
yarn test --coverage       # with coverage report
```

**Go:**
```bash
cd server && go test ./...
```

### Shutdown

```bash
make down
```
