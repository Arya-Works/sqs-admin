<p align="center">
  <img src="https://github.com/user-attachments/assets/11fe5716-16c6-46e5-b64f-a992c2ba0773" />
</p>

<p>  
  <a href="https://github.com/PacoVK/sqs-admin?tab=readme-ov-file#contributors-">
    <img alt="Contributors" src="https://img.shields.io/github/all-contributors/pacovk/sqs-admin">
  </a>
  <a href="https://hub.docker.com/r/pacovk/sqs-admin">
    <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/pacovk/sqs-admin">
  </a>
  <a href="https://cdn.localstack.cloud/gh/extension-badge.svg">
    <img alt="Localstack extension" src="https://cdn.localstack.cloud/gh/extension-badge.svg">
  </a>
</p>

A minimal and lightweight UI for managing SQS queues for local development, e.g. with [Localstack](https://localstack.cloud/).

## What's New

This fork significantly redesigns the UI for multi-queue monitoring workflows.

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

**Independent polling per column**
- Each column polls its queue every 3 seconds independently
- Per-column pause/resume via the dot indicator in each column header
- Global pause/resume all columns at once from the toolbar
- Queue attributes refresh every 3s when messages are present, 10s when empty

**New backend action**
- `SetQueueAttributes` — set arbitrary SQS queue attributes via the API

**Design**
- Brutalist white/black aesthetic with indigo/violet accent palette
- Content width capped at `max(columns × 480px, 1440px)` with smooth CSS transition as columns are added

**Test coverage**
- Frontend: 97%+ statement coverage, 161 tests
- Go handler: 91%+ statement coverage, 18 tests

---

## Usage

### Standalone Mode

The most common way to use SQS-Admin is in conjunction with a `docker-compose.yml`. A working example can be found in the `example` directory.

> **Note:** As of March 2026, LocalStack requires an auth token. Sign up for a free account at [localstack.cloud](https://localstack.cloud/), then copy `.env.sample` to `.env` and fill in your token before running `docker compose up`.

```bash
docker run --rm -p 3999:3999 -e SQS_ENDPOINT_URL=<Endpoint-URL> -d pacovk/sqs-admin
```

### LocalStack Extension

SQS-Admin can also be used as a LocalStack extension. More details [here](./localstack/README.md).

## Compatibility

SQS-Admin >= 0.5.4 does not support Localstack < 2.x.
If you need to stick to Localstack 1.x, please use SQS-Admin <= 0.5.3 ([see #928](https://github.com/PacoVK/sqs-admin/issues/928)).

## Configuration

| ENV              | Description                                                    | Default               |
| ---------------- | -------------------------------------------------------------- | --------------------- |
| SQS_ENDPOINT_URL | **Endpoint where SQS is running — required in most cases**     | http://localhost:4566 |
| SQS_AWS_REGION   | AWS region the client uses internally                          | eu-central-1          |

## Development

### Prerequisites

This project uses Yarn 4 (Berry) via Corepack. Enable it once before running any `yarn` commands:

```bash
corepack enable
```

### Run local environment

```bash
make dev
```

Starts the backend on `http://localhost:3999` and the frontend on `http://localhost:3000`.

| ENV       | Description                               | Default |
| --------- | ----------------------------------------- | ------- |
| HTTP_PORT | Port the backend binds to and serves from | 3999    |

### Run tests

**Frontend:**
```bash
yarn test                  # run once
yarn test --watch          # watch mode
yarn test --coverage       # with coverage report
```

**Go (from the server directory):**
```bash
cd server && go test ./...           # run all
cd server && go test ./... -v        # verbose
cd server && go test ./... -cover    # with coverage
```

### Shutdown local environment

```bash
make down
```

### Release

To release a new version:
- Update `vite.config.ts`
- Update `package.json`
- Update `./localstack/pyproject.toml`
- Create a new release on GitHub

## Designed and tested with

![Localstack](https://raw.githubusercontent.com/localstack/.github/main/assets/localstack-readme-banner.svg)

## Contributors ✨

Thanks go to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://pascal.euhus.dev/"><img src="https://avatars.githubusercontent.com/u/27785614?v=4?s=100" width="100px;" alt="PacoVK"/><br /><sub><b>PacoVK</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=PacoVK" title="Code">💻</a> <a href="https://github.com/PacoVK/sqs-admin/pulls?q=is%3Apr+reviewed-by%3APacoVK" title="Reviewed Pull Requests">👀</a> <a href="#projectManagement-PacoVK" title="Project Management">📆</a> <a href="#maintenance-PacoVK" title="Maintenance">🚧</a> <a href="#example-PacoVK" title="Examples">💡</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://erico.dev.br"><img src="https://avatars.githubusercontent.com/u/10657645?v=4?s=100" width="100px;" alt="Érico Knapp Lutzer"/><br /><sub><b>Érico Knapp Lutzer</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=klutzer" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/stasadev"><img src="https://avatars.githubusercontent.com/u/24270994?v=4?s=100" width="100px;" alt="Stanislav Zhuk"/><br /><sub><b>Stanislav Zhuk</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=stasadev" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AlejandroPerez92"><img src="https://avatars.githubusercontent.com/u/112934187?v=4?s=100" width="100px;" alt="Alejandro Perez"/><br /><sub><b>Alejandro Perez</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=AlejandroPerez92" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/adambordas"><img src="https://avatars.githubusercontent.com/u/6266706?v=4?s=100" width="100px;" alt="Ádám Bordás"/><br /><sub><b>Ádám Bordás</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/issues?q=author%3Aadambordas" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/bhavishyachandra"><img src="https://avatars.githubusercontent.com/u/10553920?v=4?s=100" width="100px;" alt="Bhavishya Chandra Kamineni"/><br /><sub><b>Bhavishya Chandra Kamineni</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=bhavishyachandra" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.danielneto.pt"><img src="https://avatars.githubusercontent.com/u/10155766?v=4?s=100" width="100px;" alt="Daniel Neto"/><br /><sub><b>Daniel Neto</b></sub></a><br /><a href="https://github.com/PacoVK/sqs-admin/commits?author=danielnetop" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

#### Legal note

UI favicon by [John Sorrentino](https://favicon.io/emoji-favicons/cowboy-hat-face)
