#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/aliyun/bootstrap-ecs.sh"
  exit 1
fi

install_with_apt() {
  apt-get update
  apt-get install -y docker.io git nginx curl unzip xz-utils
  apt-get install -y docker-compose-plugin || apt-get install -y docker-compose
}

install_with_yum() {
  yum install -y docker git nginx curl unzip xz
  yum install -y docker-compose-plugin || true
}

install_node_runtime() {
  local node_version="v24.16.0"
  local node_dir="/opt/node-${node_version}-linux-x64"

  if [ -x "${node_dir}/bin/node" ]; then
    ln -sf "${node_dir}/bin/node" /usr/local/bin/node
    ln -sf "${node_dir}/bin/npm" /usr/local/bin/npm
    ln -sf "${node_dir}/bin/npx" /usr/local/bin/npx
    return
  fi

  if command -v node >/dev/null 2>&1; then
    return
  fi

  cd /tmp
  rm -rf "node-${node_version}-linux-x64" "node-${node_version}-linux-x64.tar.xz"
  curl -fsSLO "https://nodejs.org/dist/${node_version}/node-${node_version}-linux-x64.tar.xz"
  tar -xJf "node-${node_version}-linux-x64.tar.xz"
  rm -rf "${node_dir}"
  mv "node-${node_version}-linux-x64" "${node_dir}"
  ln -sf "${node_dir}/bin/node" /usr/local/bin/node
  ln -sf "${node_dir}/bin/npm" /usr/local/bin/npm
  ln -sf "${node_dir}/bin/npx" /usr/local/bin/npx
}

if command -v apt-get >/dev/null 2>&1; then
  install_with_apt
elif command -v yum >/dev/null 2>&1; then
  install_with_yum
else
  echo "Unsupported Linux package manager. Install Docker, Docker Compose, Git, Nginx, curl, and unzip manually."
  exit 1
fi

systemctl enable --now docker
systemctl enable --now nginx
install_node_runtime

if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  usermod -aG docker "$SUDO_USER"
fi

if docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is available."
elif command -v docker-compose >/dev/null 2>&1; then
  echo "Legacy docker-compose is available."
else
  echo "Docker Compose is missing. Install docker-compose-plugin or docker-compose, then rerun deploy/aliyun/start.sh."
  exit 1
fi

echo "ECS bootstrap complete. Log out and back in if your user was added to the docker group."
