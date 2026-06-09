# Aliyun ECS Deploy

Netlify has paused the preview site because the account reached usage limits. This path runs the same app on an Aliyun ECS instance and keeps the existing Aliyun RDS PostgreSQL database.

## Recommended First Test Shape

- One ECS instance in the same region and VPC as RDS.
- Inbound security group: TCP 80 for the app, TCP 22 for SSH.
- RDS whitelist: allow the ECS private IP or the ECS security group.
- No domain required for the first test. Use `http://ECS_PUBLIC_IP`.
- Add a domain and HTTPS after the app passes smoke tests.

## 1. Prepare ECS

Install Docker, Docker Compose, Git, Nginx, and the Node.js runtime on the ECS instance.

Fast path:

```sh
sudo bash deploy/aliyun/bootstrap-ecs.sh
```

For Ubuntu:

```sh
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git nginx curl unzip xz-utils
sudo systemctl enable --now docker nginx
sudo usermod -aG docker "$USER"
```

If `docker-compose-plugin` is not available in the system repository, install `docker-compose` instead. The included scripts support both command forms.

For Alibaba Cloud Linux, use the distribution package manager for the same packages:

```sh
sudo yum install -y docker git nginx
sudo systemctl enable --now docker nginx
```

Log out and back in after adding your user to the Docker group.

## 2. Upload Code

Use the generated release zip from your local machine:

```text
output/release/playdrama-studio-aliyun-*.zip
```

Upload it to ECS, then unzip:

```sh
unzip playdrama-studio-aliyun-*.zip
cd playdrama-studio-aliyun
sudo bash deploy/aliyun/bootstrap-ecs.sh
```

Or clone the project from Git:

```sh
git clone YOUR_REPO_URL playdrama-studio
cd playdrama-studio
```

If there is no Git remote yet, use the zip package.

## 3. Create Production Env

Create the env file from the existing template:

```sh
cp deploy/cloud-server.env.example deploy/cloud-server.env
nano deploy/cloud-server.env
```

Set at least:

```sh
APP_BASE_URL=http://ECS_PUBLIC_IP
PLAYDRAMA_STORAGE_DRIVER=postgres
PLAYDRAMA_DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/playdrama
DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/playdrama
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
QWEN_API_KEY=replace-me
ALIYUN_ACCESS_KEY_ID=replace-me
ALIYUN_ACCESS_KEY_SECRET=replace-me
TENCENTCLOUD_SECRET_ID=replace-me
TENCENTCLOUD_SECRET_KEY=replace-me
```

Do not commit `deploy/cloud-server.env`.

## 4. Start App

Preferred Docker path:

```sh
bash deploy/aliyun/start.sh
```

If Docker Hub image pulls time out, use the direct Node service path:

```sh
sudo bash deploy/aliyun/start-node.sh
```

The Node path still runs behind Nginx and listens on `127.0.0.1:8787` inside the ECS host.

## 5. Add Nginx Reverse Proxy

```sh
sudo cp deploy/aliyun/nginx-playdrama.conf /etc/nginx/conf.d/playdrama.conf
sudo nginx -t
sudo systemctl reload nginx
```

Open:

```text
http://ECS_PUBLIC_IP
```

## 6. Verify

From the ECS instance:

```sh
bash deploy/aliyun/check.sh
bash deploy/aliyun/ops.sh health
sudo bash deploy/aliyun/ops.sh smoke
```

From your local machine:

```sh
curl http://ECS_PUBLIC_IP/api/health
```

After a domain is added, update:

```sh
APP_BASE_URL=https://your-domain.example
PLAYDRAMA_API_BASE=https://your-domain.example
```

Then restart:

```sh
bash deploy/aliyun/start.sh
# or, for the direct Node service:
sudo bash deploy/aliyun/start-node.sh
```

## Operational Notes

- RDS and ECS should be in the same VPC for stable private-network access.
- Keep RDS public access off after ECS connectivity is confirmed.
- Tencent SMS daily limits are separate from deployment. If SMS says the application daily limit is reached, increase the SMS quota or wait for the next day.
- Netlify can remain paused; this deployment path does not depend on Netlify.
- See `docs/aliyun-operations-runbook.md` for daily status, logs, restart, smoke, backup, and cleanup commands.
