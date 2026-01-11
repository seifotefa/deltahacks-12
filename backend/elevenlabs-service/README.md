# ElevenLabs Text-to-Speech Service

Standalone service for generating audio from text using the ElevenLabs API.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API key:**
   - Copy `.env.example` to `.env` (if exists)
   - Add your ElevenLabs API key:
     ```
     ELEVENLABS_API_KEY=your_api_key_here
     PORT=3001
     ```

3. **Start the service:**
   ```bash
   npm start
   ```

## Endpoints

### POST /text-to-speech

Generate audio from text.

**Request:**
```json
{
  "text": "Your text here",
  "voice_id": "Nhs7eitvQWFTQBsf0yiT" // Optional, defaults to custom voice
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Returns MP3 audio file

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "elevenlabs-service",
  "port": 3001
}
```

## Configuration

- **Port:** Default `3001` (configurable via `PORT` env variable)
- **Voice ID:** Default `Nhs7eitvQWFTQBsf0yiT` (configurable in request)

## Usage

The service runs on port 3001 by default. The frontend automatically calls this service when generating audio instructions.
