# Video Injury Analysis Service

A Node.js service that analyzes video files for visible injuries using Google's Gemini Vision API.

## Requirements

- Node.js (v18 or higher)
- ffmpeg installed on your system

### Installing ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use chocolatey:
```bash
choco install ffmpeg
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
```

## Running the Service

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The service will start on `http://localhost:3000` (or the PORT specified in `.env`).

## API Endpoints

### POST /analyze-video

Analyzes a video file for injuries.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `video`: MP4 or WebM video file
  - `presageData`: (optional) Stringified JSON string

**Response:**
```json
{
  "ok": true,
  "analysis": {
    "injury_types": ["bruise", "cut"],
    "bleeding_level": "mild",
    "body_position": "sitting",
    "urgency_level": "medium",
    "notes": "Minor injuries observed",
    "confidence": 0.85
  },
  "presage": { ... },
  "framesUsed": 4
}
```

### GET /health

Health check endpoint.

## Example Usage

### Using curl:

```bash
curl -X POST http://localhost:3000/analyze-video \
  -F "video=@path/to/your/video.mp4" \
  -F 'presageData={"sensor": "camera1", "timestamp": "2024-01-01T12:00:00Z"}'
```

### Using JavaScript (fetch):

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('presageData', JSON.stringify({ sensor: 'camera1' }));

const response = await fetch('http://localhost:3000/analyze-video', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

## How It Works

1. Accepts video file upload (MP4/WebM)
2. Extracts 10 frames at timestamps: 0s, 1s, 2s, 3s, 4s, 5s, 6s, 7s, 8s, 9s
3. Sends all frames to Gemini Vision API in a single multi-image request
4. Parses the JSON response with injury analysis
5. Returns structured analysis data
6. Automatically cleans up temporary files after each request

## Notes

- Maximum video file size: 100MB
- Supported formats: MP4, WebM
- Temporary files are stored in `tmp/` directory and automatically deleted after processing
- If Gemini returns non-JSON output, the service returns `ok: false` with the raw text in the `notes` field
