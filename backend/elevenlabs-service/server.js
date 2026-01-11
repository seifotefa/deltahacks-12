import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3001;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

console.log(`ElevenLabs Service configured to run on port: ${PORT}`);

if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY not found in .env file');
  process.exit(1);
} else {
  console.log('✓ ElevenLabs API key configured');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'elevenlabs-service', port: PORT });
});

// POST /text-to-speech - Generate audio from text using ElevenLabs
app.post('/text-to-speech', async (req, res) => {
  const { text, voice_id = 'Nhs7eitvQWFTQBsf0yiT' } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    console.log(`[TTS] Generating audio for text (${text.length} chars)`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Failed to generate audio',
        details: errorText 
      });
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    console.log(`[TTS] ✓ Audio generated (${audioData.length} bytes)`);

    // Send audio as MP3
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioData.length);
    res.send(audioData);

  } catch (error) {
    console.error('[TTS] Error generating audio:', error);
    res.status(500).json({ 
      error: 'Failed to generate audio',
      message: error.message 
    });
  }
});

// Initialize and start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔊 ElevenLabs Text-to-Speech Service Started');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log('\nEndpoints:');
  console.log(`  POST http://localhost:${PORT}/text-to-speech`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log('\nWaiting for requests...');
  console.log('='.repeat(60) + '\n');
});
