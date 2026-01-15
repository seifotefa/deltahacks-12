# Presage Engine - Dockerized C++ Microservice

Standalone Dockerized C++ application to run the Presage (SmartSpectra) SDK, access webcam, and output vital signs data via HTTP API.

## Prerequisites

1. **Docker Desktop** installed and running
2. **API Key** - Set in environment or pass as argument
   ```bash
   export PRESAGE_API_KEY="your-api-key-here"
   ```

## Quick Start

### 1. Build and Run

```bash
cd presage-engine

# Set API key (or use docker-compose env)
export PRESAGE_API_KEY="your-api-key"

# Build and start
docker-compose up --build
```

### 3. Test the API

```bash
# Check status
curl http://localhost:8080/status

# Run 10-second camera test (vitals printed to console)
curl http://localhost:8080/test

# Get latest vitals data
curl http://localhost:8080/live

# Health check
curl http://localhost:8080/health
```

## API Endpoints

### GET /status
Returns SDK and camera status.

**Response:**
```json
{
  "status": "SDK Ready",
  "sdk_initialized": true,
  "camera_running": false,
  "camera_available": true
}
```

### GET /test
Starts a 10-second camera test. Vital signs are printed to console/stdout.

**Response:**
```json
{
  "message": "Camera test started. Will run for 10 seconds.",
  "check_console": "Vital signs will be printed to console/stdout"
}
```

**Console Output:**
```
Heart Rate: 72.5 BPM
Breathing Rate: 16.2 BPM
```

### GET /live
Returns the latest vital signs data as JSON.

**Response:**
```json
{
  "timestamp": 1234567890,
  "heart_rate": 72.5,
  "breathing_rate": 16.2
}
```

### GET /health
Simple health check endpoint.

**Response:** `OK`

## Camera Access

The Docker container uses:
- `privileged: true` - Required for device access
- Device mapping: `/dev/video0:/dev/video0` - Maps host webcam to container

**Note:** On macOS, Docker cannot directly access the webcam. You may need to:
1. Use a Linux VM with USB passthrough
2. Use a network camera stream
3. Test with a video file (modify code)

## Building Manually

```bash
# Build Docker image
docker build -t presage-engine .

# Run container
docker run --privileged \
  --device=/dev/video0:/dev/video0 \
  -p 8080:8080 \
  -e SMARTSPECTRA_API_KEY="your-key" \
  presage-engine
```

## Troubleshooting

### "Camera device /dev/video0 not found"
- Check if webcam is accessible: `ls -la /dev/video0`
- On macOS, Docker cannot access webcam directly
- Consider using Linux VM or network camera stream

### "Could not find SmartSpectra"
- SDK should be installed automatically from official repository during build
- Check if SDK installed: `docker exec presage_engine dpkg -l | grep smartspectra`
- Verify CMake can find it: `docker exec presage_engine find /usr -name "*SmartSpectra*.cmake"`
- If build failed, check Docker logs for repository installation errors

### "Failed to initialize SDK"
- Verify API key is correct
- Check SDK installation logs in Docker build output
- Ensure SDK package is compatible with Ubuntu 22.04

## Development

To modify and rebuild:

```bash
# Rebuild after code changes
docker-compose build

# View logs
docker-compose logs -f

# Enter container for debugging
docker-compose exec presage_core bash
```

## Notes

- The application compiles even without the SDK (with stubs) for testing
- Camera test runs for exactly 10 seconds
- Vital signs are printed to stdout and available via `/live` endpoint
- Server runs on port 8080 inside container, mapped to host port 8080
