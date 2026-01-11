import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Log all incoming requests (must be first middleware)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  console.log(`[${timestamp}] Headers:`, {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'origin': req.headers['origin'],
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  });
  next();
});

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log(`Backend configured to run on port: ${PORT}`);

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Use gemini-2.0-flash for vision analysis
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Setup temp directories
const TEMP_DIR = path.join(__dirname, 'tmp');
const FRAMES_DIR = path.join(TEMP_DIR, 'frames');

// Ensure temp directories exist
async function ensureDirs() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(FRAMES_DIR, { recursive: true });
    console.log(`Temp directories created: ${TEMP_DIR}`);
    console.log(`Frames directory: ${FRAMES_DIR}`);
  } catch (err) {
    console.error('Error creating temp directories:', err);
    throw err;
  }
}

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    console.log('File upload - original name:', file.originalname, 'extension:', ext);
    if (['.mp4', '.webm'].includes(ext)) {
      cb(null, true);
    } else {
      console.warn('File extension not allowed:', ext);
      cb(new Error('Only MP4 and WebM files are allowed'));
    }
  }
});

// Extract frames using ffmpeg (works with WebM, MP4, and other formats)
async function extractFrames(videoPath, outputDir) {
  // Verify video file exists before processing
  try {
    await fs.access(videoPath);
    const stats = await fs.stat(videoPath);
    console.log(`Extracting frames from: ${videoPath} (${stats.size} bytes)`);
  } catch (err) {
    throw new Error(`Video file does not exist: ${videoPath} - ${err.message}`);
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const timestamps = [0, 3, 6, 9]; // seconds - 4 frames (reduced to save API tokens)
  const framePaths = [];
  const errors = [];

  console.log(`Extracting ${timestamps.length} frames at timestamps: ${timestamps.join(', ')}s`);

  for (const timestamp of timestamps) {
    const frameFilename = `frame-${timestamp}s.jpg`;
    const framePath = path.join(outputDir, frameFilename);
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Frame extraction timeout at ${timestamp}s`));
        }, 10000); // 10 second timeout per frame

        ffmpeg(videoPath)
          .screenshots({
            timestamps: [timestamp],
            filename: frameFilename,
            folder: outputDir,
            size: '800x600'
          })
        .on('end', async () => {
          clearTimeout(timeout);
          // Small delay to ensure file is fully written
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify frame file was actually created
          try {
            await fs.access(framePath);
            const frameStats = await fs.stat(framePath);
            if (frameStats.size > 0) {
              console.log(`✓ Frame ${timestamp}s extracted: ${framePath} (${frameStats.size} bytes)`);
              framePaths.push(framePath);
              resolve();
            } else {
              console.warn(`⚠ Frame ${timestamp}s is empty: ${framePath}`);
              errors.push(`Frame ${timestamp}s is empty`);
              resolve(); // Continue with other frames
            }
          } catch (accessErr) {
            console.error(`✗ Frame ${timestamp}s file not found: ${framePath}`);
            errors.push(`Frame ${timestamp}s not created: ${accessErr.message}`);
            resolve(); // Continue with other frames
          }
        })
          .on('error', (err) => {
            clearTimeout(timeout);
            console.error(`✗ Error extracting frame ${timestamp}s:`, err.message);
            errors.push(`Frame ${timestamp}s: ${err.message}`);
            reject(err);
          });
      });
    } catch (err) {
      console.error(`Failed to extract frame at ${timestamp}s:`, err.message);
      errors.push(`Frame ${timestamp}s: ${err.message}`);
      // Continue with other frames
    }
  }

  console.log(`Frame extraction complete: ${framePaths.length}/${timestamps.length} frames extracted`);
  if (errors.length > 0) {
    console.warn('Frame extraction errors:', errors);
  }

  if (framePaths.length === 0) {
    throw new Error(`No frames extracted. Errors: ${errors.join('; ')}`);
  }

  return framePaths;
}

// Convert image to base64 for Gemini
async function imageToBase64(imagePath) {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
}

// Analyze frames with Gemini
async function analyzeFrames(framePaths) {
  const prompt = `You are a medical triage and incident analysis AI.

You will be given:
1) One or more images of a person involved in a medical or emergency scenario
2) Optional contextual data (time, location, short description)

Your tasks:

1. IMAGE ANALYSIS
Analyze the image(s) and identify:
- Visible injuries (cuts, swelling, bruising, bleeding, burns, abnormal posture)
- Body position (standing, sitting, lying, collapsed)
- Apparent distress level (low / moderate / severe)
- Environmental risk factors (traffic, fire, sharp objects, unsafe surroundings)

2. SIMULATED VITAL SIGNS (DEMO / NON-MEDICAL)
Generate **realistic but clearly simulated vitals** inspired by Presage-style physiological outputs.
These values are **NOT real measurements** and are for demonstration only.

Generate:
- Heart Rate (bpm)
- Respiratory Rate (breaths/min)
- Blood Oxygen Saturation (%)
- Estimated Blood Loss (none / mild / moderate / severe)
- Stress Level (low / moderate / high)
- Shock Risk (low / moderate / high)

3. HEALTH & FIRST-AID GUIDANCE
Provide:
- Immediate first-aid advice appropriate for a non-professional
- Clear do's and don'ts
- Whether emergency services should be contacted immediately
- Advice must be calm, supportive, and non-alarming

4. ER TRIAGE SUMMARY
Create a short **Emergency Room handoff summary** suitable for paramedics or ER staff:
- Chief complaint
- Suspected injuries
- Vital sign summary
- Urgency level (Non-urgent / Urgent / Critical)

5. INCIDENT REPORT
Generate a structured incident report that could be shared with emergency services or workplace safety teams.

OUTPUT FORMAT:
Return ONLY valid JSON in the following structure:

{
  "image_analysis": {
    "visible_injuries": [],
    "body_position": "",
    "distress_level": "",
    "environmental_risks": []
  },
  "simulated_vitals": {
    "heart_rate_bpm": "",
    "respiratory_rate_bpm": "",
    "oxygen_saturation_percent": "",
    "estimated_blood_loss": "",
    "stress_level": "",
    "shock_risk": ""
  },
  "health_guidance": {
    "immediate_actions": [],
    "do_not": [],
    "call_emergency_services": true,
    "additional_notes": ""
  },
  "er_summary": {
    "chief_complaint": "",
    "suspected_injuries": [],
    "vital_summary": "",
    "triage_level": ""
  },
  "incident_report": {
    "incident_type": "",
    "summary": "",
    "location": "",
    "time": "",
    "recommended_follow_up": ""
  },
  "disclaimer": "All vitals are simulated for demonstration purposes and are not medical measurements."
}

IMPORTANT RULES:
- Do NOT provide diagnoses
- Do NOT claim medical certainty
- Always clarify vitals are simulated
- Prioritize user safety and emergency escalation when appropriate
- Return ONLY the JSON object, no additional text`;

  // Prepare image parts
  const imageParts = [];
  for (const framePath of framePaths) {
    try {
      const base64 = await imageToBase64(framePath);
      const mimeType = 'image/jpeg';
      imageParts.push({
        inlineData: {
          data: base64,
          mimeType
        }
      });
    } catch (err) {
      console.error(`Error reading frame ${framePath}:`, err);
    }
  }

  if (imageParts.length === 0) {
    throw new Error('No valid frames to analyze');
  }

  // Call Gemini API
  console.log(`Sending ${imageParts.length} frames to Gemini API...`);
  const totalImageSize = imageParts.reduce((sum, img) => sum + (img.inlineData.data.length || 0), 0);
  console.log(`Total image data size: ${(totalImageSize / 1024).toFixed(2)} KB`);
  try {
    const apiStartTime = Date.now();
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    const apiTime = ((Date.now() - apiStartTime) / 1000).toFixed(2);
    console.log(`✓ Gemini API response received in ${apiTime}s`);
    console.log(`Response length: ${text.length} characters`);
    console.log(`Response preview: ${text.substring(0, 200)}...`);

  // Try to parse JSON from response
  try {
    // Extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    }
    
    const analysis = JSON.parse(jsonText);
    console.log('✓ Gemini response parsed successfully');
    return { success: true, analysis, rawText: text };
  } catch (parseError) {
    // If JSON parsing fails, return error with raw text
    console.warn('⚠ Gemini response is not valid JSON:', parseError.message);
    console.log('Raw response (first 500 chars):', text.substring(0, 500));
    return { 
      success: false, 
      analysis: null, 
      rawText: text,
      parseError: parseError.message 
    };
  }
  } catch (apiError) {
    console.error('✗ Gemini API error:', apiError);
    throw new Error(`Gemini API failed: ${apiError.message}`);
  }
}

// Cleanup temp files (DISABLED FOR DEBUGGING)
async function cleanupFiles(files) {
  console.log('⚠ CLEANUP DISABLED - Files kept for debugging:');
  for (const file of files) {
    console.log(`  - ${file}`);
  }
  // To re-enable cleanup, uncomment the code below:
  /*
  for (const file of files) {
    try {
      // Check if file exists before trying to delete
      await fs.access(file);
      await fs.unlink(file);
      console.log(`✓ Cleaned up: ${file}`);
    } catch (err) {
      // File doesn't exist or already deleted - that's okay
      if (err.code !== 'ENOENT') {
        console.warn(`⚠ Error deleting ${file}:`, err.message);
      }
    }
  }
  */
}

// Main route with error handling
app.post('/analyze-video', (req, res, next) => {
  const requestId = Date.now();
  const requestStartTime = requestId;
  req.requestId = requestId; // Attach to request object
  req.requestStartTime = requestStartTime;
  
  console.log('\n' + '='.repeat(60));
  console.log(`[${new Date().toISOString()}] === POST /analyze-video received ===`);
  console.log(`Request ID: ${requestId}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length'] ? `${(parseInt(req.headers['content-length']) / 1024 / 1024).toFixed(2)} MB` : 'Unknown');
  console.log('Origin:', req.headers['origin'] || 'Unknown');
  
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error(`[${requestId}] ✗ Upload error:`, err.message);
      return res.status(400).json({
        ok: false,
        analysis: null,
        presage: null,
        framesUsed: 0,
        debug: { errors: [`Upload error: ${err.message}`] }
      });
    }
    console.log(`[${requestId}] ✓ File upload processed successfully`);
    next();
  });
}, async (req, res) => {
  const requestId = req.requestId || Date.now();
  const requestStartTime = req.requestStartTime || requestId;
  console.log(`\n[${requestId}] === Processing video analysis request ===`);
  console.log(`[${requestId}] Request file:`, req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    encoding: req.file.encoding,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  } : 'No file');
  console.log(`[${requestId}] Presage data:`, req.body?.presageData ? 'Present' : 'Missing');
  if (req.body?.presageData) {
    try {
      const presageParsed = JSON.parse(req.body.presageData);
      console.log(`[${requestId}] Presage data content:`, JSON.stringify(presageParsed, null, 2));
    } catch (e) {
      console.log(`[${requestId}] Presage data (raw):`, req.body.presageData.substring(0, 100));
    }
  }
  
  const videoPath = req.file?.path;
  const presageDataStr = req.body?.presageData;

  const filesToCleanup = [];
  const errors = [];

  try {
    // Validate inputs
    if (!videoPath) {
      console.error(`[${requestId}] ✗ ERROR: No video file in request`);
      return res.status(400).json({
        ok: false,
        analysis: null,
        presage: null,
        framesUsed: 0,
        debug: { errors: ['No video file provided'] }
      });
    }

    console.log(`[${requestId}] Video file path: ${videoPath}`);
    const originalExtension = path.extname(videoPath).toLowerCase();
    console.log(`[${requestId}] Video format: ${originalExtension}`);

    // Verify video file exists and is accessible
    let videoStats;
    try {
      videoStats = await fs.stat(videoPath);
      const fileSizeMB = (videoStats.size / 1024 / 1024).toFixed(2);
      if (videoStats.size === 0) {
        console.error(`[${requestId}] ✗ Video file is empty`);
        return res.status(400).json({
          ok: false,
          analysis: null,
          presage: null,
          framesUsed: 0,
          debug: { errors: ['Video file is empty'] }
        });
      }
      console.log(`[${requestId}] ✓ Video file saved: ${videoPath}`);
      console.log(`[${requestId}]   File size: ${videoStats.size} bytes (${fileSizeMB} MB)`);
      console.log(`[${requestId}]   Format: ${originalExtension} (WebM/MP4 both supported)`);
      filesToCleanup.push(videoPath);
    } catch (statError) {
      console.error(`[${requestId}] ✗ Video file not accessible:`, statError.message);
      return res.status(500).json({
        ok: false,
        analysis: null,
        presage: null,
        framesUsed: 0,
        debug: { errors: [`Video file not accessible: ${statError.message}`] }
      });
    }
    
    console.log(`[${requestId}] Using video file for processing: ${videoPath} (no conversion needed)`);

    // Parse presageData
    let presage = null;
    if (presageDataStr) {
      try {
        presage = JSON.parse(presageDataStr);
      } catch (err) {
        errors.push(`Failed to parse presageData: ${err.message}`);
      }
    }

    // Extract frames from the video (WebM or MP4 - both work)
    let framePaths = [];
    try {
      console.log(`[${requestId}] Starting frame extraction from: ${videoPath}`);
      const extractionStartTime = Date.now();
      framePaths = await extractFrames(videoPath, FRAMES_DIR);
      const extractionTime = ((Date.now() - extractionStartTime) / 1000).toFixed(2);
      console.log(`[${requestId}] ✓ Successfully extracted ${framePaths.length} frames in ${extractionTime}s`);
      console.log(`[${requestId}] Frame files:`);
      for (const framePath of framePaths) {
        try {
          const frameStats = await fs.stat(framePath);
          console.log(`[${requestId}]   - ${path.basename(framePath)}: ${frameStats.size} bytes`);
        } catch (e) {
          console.log(`[${requestId}]   - ${path.basename(framePath)}: (size unknown)`);
        }
      }
      
      // Verify all frames exist and are readable
      for (const framePath of framePaths) {
        try {
          const frameStats = await fs.stat(framePath);
          if (frameStats.size === 0) {
            console.warn(`Warning: Frame file is empty: ${framePath}`);
          }
        } catch (frameErr) {
          console.error(`Error accessing frame: ${framePath}`, frameErr);
          errors.push(`Frame not accessible: ${framePath}`);
        }
      }
      
      filesToCleanup.push(...framePaths);
    } catch (err) {
      console.error('Frame extraction error:', err);
      errors.push(`Frame extraction failed: ${err.message}`);
      const errorResponse = {
        ok: false,
        analysis: null,
        presage,
        framesUsed: 0,
        debug: { errors }
      };
      res.status(500).json(errorResponse);
      
      // Delay cleanup
      setTimeout(async () => {
        await cleanupFiles(filesToCleanup);
      }, 1000);
      
      return;
    }

    if (framePaths.length === 0) {
      const errorResponse = {
        ok: false,
        analysis: null,
        presage,
        framesUsed: 0,
        debug: { errors: ['No frames extracted'] }
      };
      res.status(500).json(errorResponse);
      
      // Delay cleanup
      setTimeout(async () => {
        await cleanupFiles(filesToCleanup);
      }, 1000);
      
      return;
    }

    console.log(`[${requestId}] Using ${framePaths.length} frames for Gemini analysis`);

    // Analyze with Gemini
    console.log(`[${requestId}] Calling Gemini API for analysis...`);
    const geminiStartTime = Date.now();
    const geminiResult = await analyzeFrames(framePaths);
    const geminiTime = ((Date.now() - geminiStartTime) / 1000).toFixed(2);
    console.log(`[${requestId}] Gemini API call completed in ${geminiTime}s`);
    console.log(`[${requestId}] Gemini analysis result:`, geminiResult.success ? '✓ Success' : '✗ Failed');
    if (geminiResult.success) {
      console.log(`[${requestId}] Analysis summary:`, {
        injury_types: geminiResult.analysis.injury_types?.length || 0,
        bleeding_level: geminiResult.analysis.bleeding_level,
        urgency_level: geminiResult.analysis.urgency_level,
        confidence: geminiResult.analysis.confidence
      });
    }

    if (!geminiResult.success) {
      const errorResponse = {
        ok: false,
        analysis: {
          injury_types: [],
          bleeding_level: 'none',
          body_position: 'unknown',
          urgency_level: 'low',
          notes: `Gemini response was not valid JSON. Raw output: ${geminiResult.rawText.substring(0, 500)}... Parse error: ${geminiResult.parseError}`,
          confidence: 0
        },
        presage,
        framesUsed: framePaths.length,
        debug: { 
          errors: [`JSON parsing failed: ${geminiResult.parseError}`],
          rawGeminiOutput: geminiResult.rawText.substring(0, 1000)
        }
      };
      res.json(errorResponse);
      
      // Delay cleanup
      setTimeout(async () => {
        console.log('Cleaning up temporary files after Gemini parse error...');
        await cleanupFiles(filesToCleanup);
      }, 1000);
      
      return;
    }

    // Success response
    console.log(`[${requestId}] ✓ Preparing success response...`);
    const responseData = {
      ok: true,
      analysis: geminiResult.analysis,
      presage,
      framesUsed: framePaths.length
    };
    const responseSize = JSON.stringify(responseData).length;
    console.log(`[${requestId}] Response size: ${(responseSize / 1024).toFixed(2)} KB`);
    res.json(responseData);
    console.log(`[${requestId}] ✓ Response sent successfully to frontend`);
    console.log(`[${requestId}] Total processing time: ${((Date.now() - requestStartTime) / 1000).toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');
    
    // Delay cleanup to ensure response is sent first
    // Also allows inspection of frames if needed
    setTimeout(async () => {
      console.log(`[${requestId}] Cleaning up ${filesToCleanup.length} temporary files...`);
      await cleanupFiles(filesToCleanup);
      console.log(`[${requestId}] ✓ Cleanup complete`);
    }, 2000); // 2 second delay after response (increased for inspection)
    
    return; // Exit early, cleanup happens in setTimeout

  } catch (error) {
    console.error('Error in /analyze-video:', error);
    errors.push(error.message);
    
    // Get presage data if available
    let errorPresage = null;
    if (presageDataStr) {
      try {
        errorPresage = JSON.parse(presageDataStr);
      } catch (err) {
        errorPresage = presageDataStr;
      }
    }
    
    const errorResponse = {
      ok: false,
      analysis: null,
      presage: errorPresage,
      framesUsed: 0,
      debug: { errors }
    };
    res.status(500).json(errorResponse);
    
    // Delay cleanup for errors too
    setTimeout(async () => {
      console.log('Cleaning up temporary files after error...');
      await cleanupFiles(filesToCleanup);
    }, 1000);
    
    return; // Exit early
  }
  
  // Note: Cleanup is now handled in setTimeout above, not in finally block
  // This ensures files aren't deleted before response is sent
});

// Health check route
app.get('/health', (req, res) => {
  console.log('GET /health - Health check requested');
  res.json({ status: 'ok', service: 'video-injury-analysis', port: PORT });
});

// Test endpoint to verify connection
app.get('/test', (req, res) => {
  console.log('GET /test - Test endpoint called');
  res.json({ 
    message: 'Backend is reachable!', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Chat endpoint for voice agent conversation
app.use(express.json());

app.post('/chat', async (req, res) => {
  const { userMessage, reportContext, conversationHistory = [] } = req.body;
  
  console.log('\n' + '='.repeat(60));
  console.log('[CHAT] Voice Agent Request');
  console.log('='.repeat(60));
  console.log(`[CHAT] User message: "${userMessage}"`);
  console.log(`[CHAT] Report context provided: ${reportContext ? 'Yes' : 'No'}`);
  console.log(`[CHAT] Conversation history: ${conversationHistory.length} messages`);

  if (!userMessage) {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  try {
    // Build context from report
    const erSummary = reportContext?.erSummary || {};
    const simVitals = reportContext?.simulatedVitals || {};
    const imageAnalysis = reportContext?.imageAnalysis || {};
    const actions = reportContext?.actions || [];

    const contextSummary = `
CURRENT INCIDENT REPORT:
- Triage Level: ${erSummary.triageLevel || 'Unknown'}
- Chief Complaint: ${erSummary.chiefComplaint || 'Not specified'}
- Suspected Injuries: ${erSummary.suspectedInjuries?.join(', ') || 'None identified'}
- Body Position: ${imageAnalysis.position || 'Unknown'}
- Distress Level: ${imageAnalysis.distressLevel || 'Unknown'}
- Visible Injuries: ${imageAnalysis.injuries?.join(', ') || 'None detected'}
- Heart Rate: ${simVitals.heartRate || 'N/A'} BPM
- Respiratory Rate: ${simVitals.respiratoryRate || 'N/A'} /min
- Oxygen Saturation: ${simVitals.oxygenSaturation || 'N/A'}%
- Blood Loss: ${simVitals.bloodLoss || 'None'}
- Shock Risk: ${simVitals.shockRisk || 'Unknown'}
- Recommended Actions: ${actions.slice(0, 5).join('; ') || 'None'}
`;

    const systemPrompt = `You are a calm, professional EMS dispatch agent helping someone with a medical emergency.
You have access to the following incident report data:

${contextSummary}

IMPORTANT RULES:
1. Be calm, reassuring, and supportive
2. Give clear, actionable first-aid instructions
3. Keep responses SHORT (2-3 sentences max) - this will be spoken aloud
4. If the situation seems critical, tell them to call 911 immediately
5. Don't provide medical diagnoses, just first-aid guidance
6. Ask follow-up questions to assess the situation better
7. Always prioritize safety
8. NO FLUFF, Speak concisely and clearly, don't repeat what the user says. 
9. No filler words, don't say I understand, I see, I hear, etc. unless you need to. 
10. Don't say I'm sorry, I'm just a robot, I'm here to help, etc. unless you need to.

Respond naturally as if you're on a phone call with them.`;

    // Build conversation for Gemini
    const conversationPrompt = conversationHistory.length > 0
      ? conversationHistory.map(m => `${m.role === 'user' ? 'Caller' : 'Agent'}: ${m.content}`).join('\n') + `\nCaller: ${userMessage}\nAgent:`
      : `Caller: ${userMessage}\nAgent:`;

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationPrompt}`;

    console.log('[CHAT] Calling Gemini API...');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const agentResponse = response.text().trim();

    console.log(`[CHAT] ✓ Agent response: "${agentResponse}"`);
    console.log('='.repeat(60) + '\n');

    res.json({
      ok: true,
      response: agentResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate response',
      message: error.message
    });
  }
});

// Initialize and start server
ensureDirs().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Video Injury Analysis Service Started');
    console.log('='.repeat(60));
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Network: http://0.0.0.0:${PORT}`);
    console.log('\nEndpoints:');
    console.log(`  POST http://localhost:${PORT}/analyze-video`);
    console.log(`  POST http://localhost:${PORT}/chat`);
    console.log(`  GET  http://localhost:${PORT}/health`);
    console.log(`  GET  http://localhost:${PORT}/test`);
    console.log('\nWaiting for requests...');
    console.log('='.repeat(60) + '\n');
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
