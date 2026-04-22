#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/arya-works/sqs-admin"
TAG="${1:-latest}"

echo "Building ${IMAGE}:${TAG} ..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag "${IMAGE}:${TAG}" \
  --push \
  .

echo "Pushed ${IMAGE}:${TAG}"
