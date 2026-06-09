# Session takeover - 2026-05-23

## Current state

This workspace is not a Git checkout, so use filesystem timestamps and this handoff note instead of `git status`.

Local development is healthy:

- API: `http://127.0.0.1:8787`
- Frontend: `http://127.0.0.1:5177`
- Storage: Postgres
- Auth: `sms-code`
- SMS: Tencent SMS
- Email: Aliyun DirectMail
- AI: Qwen
- Payment: sandbox
- Content safety: local rules

## Verification run

- `npm run build`: PASS
- `npm run lint`: PASS
- `node --check server/index.mjs`: PASS
- `node --check netlify/functions/api.mjs`: PASS
- `node --check server/verify-online-smoke.mjs`: PASS
- `node --check server/verify-payment-provider.mjs`: PASS
- `npm run db:verify`: PASS (33/33)
- `npm run readiness:api`: PASS contract; readiness is blocked 16/17 only because local `APP_BASE_URL` is not HTTPS.
- Browser smoke on `http://127.0.0.1:5177/`: PASS, no warning/error console logs, SMS-code login and workspace render.

## Fix applied during takeover

- Production frontend builds now ignore localhost or `127.0.0.1` values from `VITE_PLAYDRAMA_API_BASE` / `VITE_PLAYDRAMA_API_BASES` and fall back to same-origin `/api`.
- `npm run deploy:preflight` now uses the same rule, so local development API settings do not falsely block a production same-origin deployment.
- `deploy/create-aliyun-release.ps1` now includes `handoff-index.json` in the Aliyun release package.

## Fresh Aliyun release

Generate a fresh package with:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\create-aliyun-release.ps1
```

Keep the SHA256 checksum beside the zip as a local release artifact rather than writing it into files that are included in the zip.

## Remote finding

Netlify project `playdrama-studio-preview` has current deploy `6a0eee7f325f1f219ce3c27d` in `ready` state, but public traffic currently returns:

```json
{"error":"usage_exceeded","message":"Usage exceeded"}
```

This happens for both `/` and `/api/health`, so the request is blocked by Netlify before it reaches the app or function handler.

## Immediate next slice

Restore public HTTPS hosting:

1. Resolve the Netlify usage/billing limit for `playdrama-studio-preview`, or deploy the prepared cloud-server/Aliyun package.
2. Set `APP_BASE_URL` and `PLAYDRAMA_API_BASE` to the public HTTPS URL.
3. Make sure the frontend API base is same-origin or HTTPS, not `http://127.0.0.1:8787`.
4. Rerun:

```powershell
npm run deploy:preflight
npm run launch:gate
npm run commercial:smoke
```

Only call the public environment commercially ready after all three pass against the public HTTPS URL.

## Execution update - 2026-05-23 14:55 CST

Public production domain checked:

```text
https://playdrama.tokenaicloud.com
```

Results:

- `GET /`: PASS, HTTP 200 via Nginx.
- `GET /api/health`: PASS, storage `postgres`, commercial readiness `pass (17/17)`.
- `npm run deploy:preflight` with `APP_BASE_URL` and `PLAYDRAMA_API_BASE` set to the production domain: PASS (8/8), Decision GO.
- `npm run launch:gate` with the same production domain: Decision GO.
- `npm run payment:provider:verify`: PASS (8/8), active provider `alipay`, unpaid order remains pending and does not unlock paid ending.
- `npm run commercial:smoke`: PASS (13/13).
- `npm run online:smoke`: PASS (3/3).
- `npm run online:cleanup-smoke`: completed, no smoke rows found to delete.
- Browser smoke on the public URL: PASS, no console warnings/errors, UI shows `商用体检 · 已通过` and `17/17 项通过`.

SSH deployment note:

- DNS resolves `playdrama.tokenaicloud.com` to `59.110.171.143`.
- Local known_hosts has a matching IP entry, but the available `lingbase_codex_deploy_rsa` key is not accepted for common users (`root`, `ubuntu`, `admin`, `ecs-user`, `deploy`, `lingbase`, `codex`).
- Because SSH access is not currently available from this workstation, no remote file replacement was performed. The public server already passes production checks.

## Remote deploy update - 2026-05-23 15:23 CST

SSH access was restored by adding the local `lingbase-codex-deploy` public key to the ECS root account.

Release deployed:

```text
output/release/playdrama-studio-aliyun-20260523-135831.zip
```

Remote upload target:

```text
/root/playdrama-upload/playdrama-studio-aliyun-20260523-135831.zip
```

Remote checksum verification:

```text
D1111826E0642471BA97B22852DE1FA6011EFC79A9B56BC4CAD48F504439081A
```

Pre-deploy backup:

```text
/root/playdrama-deploy-backups/20260523-151916
```

Rollback directory kept on ECS:

```text
/root/playdrama-studio-aliyun.previous-20260523-152048
```

Deploy steps completed:

- Uploaded and checksum-verified release zip.
- Copied existing production `deploy/cloud-server.env` into the unpacked release.
- Ran `npm ci --no-audit --no-fund`.
- Ran production build with `VITE_PLAYDRAMA_API_BASE` and `VITE_PLAYDRAMA_API_BASES` unset.
- Ran `npm prune --omit=dev`.
- Applied PostgreSQL schema and verified DB: PASS (33/33).
- Stopped `playdrama`, moved the old app dir aside, moved the new release into `/root/playdrama-studio-aliyun`, restarted `playdrama`, and reloaded Nginx.

Post-deploy verification:

- Remote `systemctl is-active playdrama`: `active`.
- Remote `bash deploy/aliyun/ops.sh health`: local node, local Nginx, and public health all OK.
- `npm run deploy:preflight`: PASS (8/8), Decision GO.
- `npm run launch:gate`: Decision GO, readiness PASS (17/17).
- `npm run payment:provider:verify`: PASS (8/8), active provider `alipay`.
- `npm run commercial:smoke`: PASS (13/13).
- `npm run online:smoke`: PASS (3/3).
- `npm run online:cleanup-smoke`: completed.
- Remote `node --env-file=deploy/cloud-server.env server/verify-postgres.mjs`: PASS (33/33).
- Browser smoke on `https://playdrama.tokenaicloud.com/?fresh=20260523-deploy`: PASS, no console warnings/errors.
