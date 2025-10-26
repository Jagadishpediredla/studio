#!/bin/bash

# This script is automatically called at the end of each response
# It triggers the auto-commit and push process

echo "Triggering auto-commit and push..."

# Run the Node.js script
node auto-commit-push.js

echo "Auto-commit and push process completed."