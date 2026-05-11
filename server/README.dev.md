# Server Dev Workflow

這份文件是 `server/` 的日常開發入口，目標是「快速迭代 + 可重播 smoke + 容器分流」。

## Prerequisites

- Node.js 20+
- Docker Desktop（可選，用於 `postgres/qdrant` 或 `npc-brain`）

```bash
cd server
npm install
```

## Local Dev (Fastest)

```bash
cd server
npm run dev
```

- API: `http://127.0.0.1:3000`
- Health: `GET /healthz`
- Sync: `POST /sync`

## Docker Compose (Infra First)

預設只啟動基礎設施，不會啟動 `game-server`：

```bash
docker compose -f docker-compose.dev.yml up -d
```

需要容器啟動 server 時，才開 profile：

```bash
docker compose -f docker-compose.dev.yml --profile app up -d game-server
```

## Port Conflict Override

如果本機常用連接埠會衝突，改用 override：

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.dev.override.yml up -d
```

override 預設映射：
- game-server: `13000 -> 3000`
- postgres: `15432 -> 5432`
- qdrant: `16333/16334 -> 6333/6334`

## NPC Brain (Separated Compose)

`npc-brain` 已獨立成第二份 compose：

```bash
docker compose -f docker-compose.npc-brain.yml --env-file server/npc-brain/.env up -d --build
```

## Smoke Commands

在 `server/` 目錄執行：

```bash
npm run smoke:health
npm run smoke:sync
npm run smoke:all
```

- `smoke:health`: 驗證 `/healthz` 基本契約
- `smoke:sync`: 用固定 fixture 重播 `/sync`
- `smoke:all`: `health + sync`

## Strict DB Smoke (CI)

`smoke:db` 會強制檢查：
- `postgres.configured === true`
- `postgres.ok === true`
- `migration.ok === true`
- `migration.version === POSTGRES_EXPECTED_MIGRATION_VERSION`

先設定期望版本再跑：

```bash
set POSTGRES_EXPECTED_MIGRATION_VERSION=2026051101
npm run smoke:db
npm run smoke:all:strict
```

`smoke:all:strict` = `smoke:db + smoke:sync`，適合 CI gate。

## Environment Files

- Root env template: `.env.example`
- Server env template: `server/.env.example`
- NPC brain env template: `server/npc-brain/.env.example`

`server` 會先讀 `server/.env`，找不到時再讀 root `.env`。
