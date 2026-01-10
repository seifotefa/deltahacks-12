#!/bin/bash

# Test script for video injury analysis backend
# Make sure the backend is running first: npm start

BACKEND_URL="http://localhost:3000"

echo "Testing Video Injury Analysis Backend"
echo "======================================"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -X GET "$BACKEND_URL/health"
echo ""
echo ""

# Test 2: Video analysis (requires a video file)
if [ -z "$1" ]; then
    echo "2. To test video analysis, run:"
    echo "   ./test-backend.sh /path/to/video.mp4"
    echo ""
    echo "   Or use curl directly:"
    echo "   curl -X POST $BACKEND_URL/analyze-video \\"
    echo "     -F 'video=@/path/to/video.mp4' \\"
    echo "     -F 'presageData={\"heartRate\":75,\"breathingRate\":16,\"focus\":85}'"
else
    VIDEO_FILE="$1"
    echo "2. Testing video analysis with: $VIDEO_FILE"
    curl -X POST "$BACKEND_URL/analyze-video" \
      -F "video=@$VIDEO_FILE" \
      -F 'presageData={"heartRate":75,"breathingRate":16,"focus":85}' \
      | jq .
fi
