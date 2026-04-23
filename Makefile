.PHONY: dev dev-aws server server-aws frontend kill-server test down

dev: server frontend

dev-aws: server-aws frontend

kill-server:
	@pkill -f "go run main.go" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@lsof -ti:3999 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@sleep 0.5

server: kill-server up
	cd server && SQS_ENDPOINT_URL=http://localhost:4566 go run main.go &

server-aws: kill-server
	cd server && go run main.go &

frontend:
	yarn start

up:
	@curl -sf http://localhost:4566/_localstack/health > /dev/null 2>&1 || docker compose -f server/docker-compose.yml up -d

down:
	docker compose -f server/docker-compose.yml down

test: up
	@echo "Waiting for LocalStack..."
	@until curl -sf http://localhost:4566/_localstack/health > /dev/null 2>&1; do sleep 1; done
	cd server && SQS_ENDPOINT_URL=http://localhost:4566 go test ./... -v && cd ..
