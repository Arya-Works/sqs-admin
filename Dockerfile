# Build frontend assets (run natively — output is platform-agnostic)
FROM --platform=$BUILDPLATFORM node:24-alpine AS react_builder
WORKDIR /app
COPY . .
RUN corepack enable && yarn install --frozen-lockfile
RUN yarn build

# Build Go binary with minimal dependencies (cross-compile natively, no QEMU)
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS golang_builder
ARG TARGETOS
ARG TARGETARCH
WORKDIR /app
COPY server/ ./
# Install build dependencies and build with CGO disabled for static binary
RUN apk add --no-cache ca-certificates git && \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w" -o sqs-admin .

# Final minimal image
FROM scratch
WORKDIR /app

ENV SQS_ADMIN_STATIC_DIR=/app/public

# Copy CA certificates for HTTPS connections
COPY --from=golang_builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy compiled assets from previous stages
COPY --from=react_builder /app/dist /app/public
COPY --from=golang_builder /app/sqs-admin /app/

# Run as non-root (nobody)
USER 65534:65534

ENTRYPOINT ["/app/sqs-admin"]