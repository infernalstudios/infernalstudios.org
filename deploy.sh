#!/bin/sh

SERVICE_NAME="webapp"
GIT_BRANCH="stable"

if [ "$(id -u)" -eq 0 ]; then
  echo "This script must not be run as root."
  exit 1
fi

# Find service path
if [ ! -f "$(pwd)/.service_paths" ]; then
  echo "Did you initialize the service using server-init.sh?: .service_paths not found."
  exit 1
fi

SERVICE_PATH=$(cat $(pwd)/.service_paths | grep $SERVICE_NAME | cut -d' ' -f2)

if [ -z "$SERVICE_PATH" ] || [ ! -d "$SERVICE_PATH" ]; then
  echo "Service path invalid or missing."
  exit 1
fi

cd $SERVICE_PATH

# Checkout the latest commit
git fetch origin -v
git checkout origin/$GIT_BRANCH

# Use Docker Compose
echo "Building and starting Docker containers..."
docker compose up -d --build

if [ "$?" -ne 0 ]; then
  echo "Docker compose failed to start the service."
  exit 1
fi

echo "Deployment successful."
docker image prune -f