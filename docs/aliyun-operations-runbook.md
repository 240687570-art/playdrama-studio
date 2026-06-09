# Aliyun Operations Runbook

Production URL:

```text
https://playdrama.tokenaicloud.com
```

ECS app root:

```text
/root/playdrama-studio-aliyun
```

## Daily Commands

Run from the ECS app root:

```sh
bash deploy/aliyun/ops.sh status
bash deploy/aliyun/ops.sh health
bash deploy/aliyun/ops.sh payment
bash deploy/aliyun/ops.sh logs 120
sudo bash deploy/aliyun/ops.sh restart
```

Run the online checks:

```sh
sudo bash deploy/aliyun/ops.sh smoke
```

The smoke command runs:

- Live payment-provider checkout verification: provider must not be sandbox, order must remain pending before callback, checkout URL/code must exist, and unpaid order must not unlock the paid ending.
- Public commercial readiness checks.
- An end-to-end flow with a controlled smoke user: project create, Qwen generation, content safety, publish, published play read, runtime analytics write, analytics read, AI usage read, logout.

Clean test data afterward:

```sh
sudo bash deploy/aliyun/ops.sh cleanup-smoke
```

## Backups

Create a PostgreSQL custom-format backup:

```sh
sudo bash deploy/aliyun/ops.sh backup
```

Verify a backup archive:

```sh
bash deploy/aliyun/ops.sh backup-verify /root/playdrama-studio-aliyun/backups/playdrama-postgres-YYYYMMDD-HHMMSS.dump
```

Keep at least:

- Daily RDS automatic backups.
- A manual backup before schema changes.
- A manual backup before replacing the ECS app directory.

Current RDS automatic backup policy checked on 2026-05-22:

- Data backup retention: 7 days.
- Backup days: every day.
- Backup window: 15:00Z-16:00Z, which is 23:00-00:00 in China Standard Time.
- Log backup: enabled.
- Log backup retention: 7 days.

## Restore Drill

For a real restore, create a new PostgreSQL database or temporary RDS instance first, then restore into the new target:

```sh
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" /path/to/playdrama-postgres.dump
npm run db:verify
sudo bash deploy/aliyun/ops.sh restart
```

Do not restore over production until the target database and backup timestamp are confirmed.

## Known Operational Notes

- The app runs as a systemd service named `playdrama`.
- Nginx terminates HTTPS and proxies to `127.0.0.1:8787`.
- Port `8787` is intentionally not open to the public internet.
- Tencent SMS quota limits are independent of ECS health. If SMS says daily limit reached, wait for the next quota window or raise the Tencent quota.
- The current temporary production domain is `playdrama.tokenaicloud.com`; later switch `APP_BASE_URL` and `PLAYDRAMA_API_BASE` to `https://playdrama.cn` after ICP filing is complete.
