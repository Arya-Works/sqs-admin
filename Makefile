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
	cd server && SQS_ENDPOINT_URL=http://localhost:4566 go test ./... -v && cd ..
