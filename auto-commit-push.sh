#!/bin/bash

# Auto commit and push script
echo "Starting auto commit and push process..."

# Add all changes
git add .

# Create commit message with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Auto commit: Changes pushed at $TIMESTAMP"

# Commit changes
git commit -m "$COMMIT_MESSAGE"

# Push to remote repository
git push origin main

echo "Auto commit and push completed successfully!"