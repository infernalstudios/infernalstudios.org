#!/bin/sh
# This script is run without arguments, in the root directory of the project.
# It has administrative privileges.

SERVICE_NAME="webapp"
SERVICE_USER="github"
SERVICE_PATH_DEFAULT="/var/www/$SERVICE_NAME"
GIT_REMOTE="https://github.com/infernalstudios/infernalstudios.org.git"
GIT_BRANCH="stable"

# Check if the script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root."
  exit 1
fi

# Find service path
if [ ! -f "$(pwd)/.service_paths" ]; then
  echo "Creating service paths file."
  touch "$(pwd)/.service_paths"
  chown $SERVICE_USER "$(pwd)/.service_paths"
fi

SERVICE_PATH=$(cat "$(pwd)/.service_paths" | grep $SERVICE_NAME | cut -d' ' -f2)

if [ -z "$SERVICE_PATH" ]; then
  echo "Service path not found. Using default path."
  SERVICE_PATH=$SERVICE_PATH_DEFAULT
  echo "$SERVICE_NAME $SERVICE_PATH" >> "$(pwd)/.service_paths"
fi

# Clone the repository
if [ ! -d "$SERVICE_PATH" ]; then
  echo "Cloning the repository into $SERVICE_PATH."
  git clone -v --depth=1 -b $GIT_BRANCH $GIT_REMOTE $SERVICE_PATH
else
  echo "Repository already exists in $SERVICE_PATH."
fi

cd $SERVICE_PATH

# Checkout the latest commit on GIT_BRANCH
echo "Checking out the latest commit on $GIT_BRANCH."
git config advice.detachedHead false
git fetch origin -v
git checkout origin/$GIT_BRANCH

chown -R $SERVICE_USER $SERVICE_PATH

if [ -z $(command -v screen) ]; then
  echo "screen is not installed. Please install it before deployment."
fi