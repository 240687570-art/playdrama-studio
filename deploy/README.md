# Cloud Server Deploy

This project can run frontend and API from one Node process after `npm run build`.

## Aliyun ECS

Netlify preview can be replaced by a single Aliyun ECS instance plus the existing Aliyun RDS PostgreSQL database.

See:

```text
deploy/aliyun/README.md
```

## Docker

```sh
docker build -t playdrama-studio .
docker run --env-file ./deploy/cloud-server.env -p 8787:8787 playdrama-studio
```

Set `APP_BASE_URL` to the public HTTPS URL that points to this service.

## Direct Node

```sh
npm ci
npm run build
set HOST=0.0.0.0
set PORT=8787
set FRONTEND_DIST_DIR=%cd%\dist
node server/index.mjs
```

Use Nginx or a cloud load balancer for HTTPS, then proxy traffic to `127.0.0.1:8787`.

## Checks

```sh
npm run db:verify
npm run readiness:api
npm run payment:provider:verify
npm run deploy:preflight
```

`deploy:preflight` requires:

```sh
APP_BASE_URL=https://your-domain.example
PLAYDRAMA_API_BASE=https://your-domain.example
```
