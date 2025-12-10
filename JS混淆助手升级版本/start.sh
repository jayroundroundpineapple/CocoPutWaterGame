#!/bin/bash

# Exit on error
set -e

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR=$SCRIPT_DIR
echo "Script DIR: $SCRIPT_DIR"
echo "App DIR: $APP_DIR"

# Change to application directory
cd "$APP_DIR" || exit 1

# Check if JAR file exists
JAR_FILE="SecretJS.jar"
if [ ! -f "$JAR_FILE" ]; then
    echo "ERROR: Cannot find $JAR_FILE in $APP_DIR"
    exit 1
fi

chmod +x "$JAR_FILE" 2>/dev/null || true

# Create necessary directories
echo "Creating directories..."
mkdir -p data logs web_cache jcef-bundle

# Set directory permissions
echo "Setting directory permissions..."
chmod -R 755 data logs web_cache jcef-bundle 2>/dev/null || true

# Try to find Java executable
JAVA_CMD=""

# First, check if java is in system PATH
if command -v java &> /dev/null; then
    JAVA_CMD="java"
    echo "Using system Java"
    java -version
else
    # If not found in PATH, try to use local jre folder
    if [ -f "$APP_DIR/jre/bin/java" ]; then
        JAVA_CMD="$APP_DIR/jre/bin/java"
        echo "Using local JRE: $JAVA_CMD"
        chmod +x "$JAVA_CMD" 2>/dev/null || true
        "$JAVA_CMD" -version
    else
        echo "ERROR: Java not found in system PATH and no local jre folder found."
        echo "Please install Java 8 or higher, or place a jre folder in the application directory."
        exit 1
    fi
fi

# Start application
echo "Starting application..."
"$JAVA_CMD" -jar "$JAR_FILE"

# Check exit code
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "Application exited with error code: $EXIT_CODE"
    exit $EXIT_CODE
fi
