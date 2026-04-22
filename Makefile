.PHONY: dev server frontend test down

dev: server frontend

server: up
	cd server && go run main.go & cd ..

frontend:
	yarn start

up:
	docker compose -f server/docker-compose.yml up -d

down:
	docker compose -f server/docker-compose.yml down

test: up
	@echo "Waiting for LocalStack..."
	@until curl -sf http://localhost:4566/_localstack/health > /dev/null 2>&1; do sleep 1; done
	cd server && SQS_ENDPOINT_URL=http://localhost:4566 go test ./... -v && cd ..
