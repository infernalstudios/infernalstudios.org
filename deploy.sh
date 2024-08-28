#!/bin/sh
# This script is run without arguments, in the deployment user's home directory.
# This is a modified version of https://github.com/SwanX1/cernavskis.dev/blob/main/deploy.sh
# It does not have administrative privileges.

SERVICE_NAME="webapp"
SERVICE_USER="github"
GIT_REMOTE="https://github.com/infernalstudios.org.git"
GIT_BRANCH="stable"

# Check if the script is run as root
if [ "$(id -u)" -eq 0 ]; then
  echo "This script must not be run as root."
  exit 1
fi

# Check if bun is installed
if [ -z $(command -v yarn) ]; then
  echo "yarn is not installed. Please install it first."
  exit 1
fi

# Check if screen is installed
if [ -z $(command -v screen) ]; then
  echo "screen is not installed. Please install it first."
  exit 1
fi

echo "Running as $(whoami) in $(pwd)."

# Find service path
if [ ! -f "$(pwd)/.service_paths" ]; then
  echo "Did you initialize the service using server-init.sh?: .service_paths not found."
  exit 1
fi

SERVICE_PATH=$(cat $(pwd)/.service_paths | grep $SERVICE_NAME | cut -d' ' -f2)

if [ -z "$SERVICE_PATH" ]; then
  echo "Did you initialize the service using server-init.sh?: Service path not found in .service_paths."
  exit 1
fi

if [ ! -d "$SERVICE_PATH" ]; then
  echo "Did you initialize the service using server-init.sh?: Service path does not exist."
  exit 1
fi

cd $SERVICE_PATH

# Checkout the latest commit on GIT_BRANCH
git fetch origin -v
if [ $! -ne 0 ]; then
  echo "Failed to fetch."
  exit 1
fi
git checkout origin/$GIT_BRANCH
if [ $! -ne 0 ]; then
  echo "Failed to checkout the latest commit."
  exit 1
fi

# Install the dependencies
yarn install --frozen-lockfile --non-interactive --verbose

if [ $! -ne 0 ]; then
  echo "Failed to install the dependencies."
  exit 1
fi

# We use build:only here, because we don't want to run any checks beforehand. Those are handled by GH Actions.
yarn build:only --verbose

if [ $! -ne 0 ]; then
  echo "Failed to build, this should be unreachable."
  echo "Ignoring this, since tsc transpiles everything regardless of errors."
  echo "This should have been caught by GH Actions."
fi

if [ ! -z "$(screen -ls $SERVICE_NAME | grep $SERVICE_NAME)" ]; then
  echo "Service is already running, stopping it."
  screen -S $SERVICE_NAME -X quit
  if [ $! -ne 0 ]; then
    echo "Failed to stop the service."
    exit 1
  fi
fi

echo "Starting the service."
screen -dmqS $SERVICE_NAME yarn start

if [ $! -ne 0 ]; then
  echo "Failed to start the service."
  exit 1
fi