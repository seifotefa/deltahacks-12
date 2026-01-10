# Testing Guide

## Quick Start Testing

### 1. Start the Backend Service

```bash
cd backend/gemini-service
npm install
npm start
```

The service should start on `http://localhost:3000`

### 2. Test Backend Directly (Without Frontend)

#### Option A: Using the test script
```bash
# Health check
./test-backend.sh

# With a video file
./test-backend.sh /path/to/your/video.mp4
```

#### Option B: Using curl directly
```bash
# Health check
curl http://localhost:3000/health

# Video analysis (replace with your video file path)
curl -X POST http://localhost:3000/analyze-video \
  -F "video=@/path/to/video.mp4" \
  -F 'presageData={"heartRate":75,"breathingRate":16,"focus":85}'
```

#### Option C: Using a test video
If you don't have a video, you can:
1. Record a 10-second video with your phone/camera
2. Save it as MP4 or WebM
3. Use the curl command above

### 3. Test with Current Frontend

**Current Frontend Status:**
- ✅ Records for 10 seconds
- ✅ Generates presageData (vitals)
- ❌ Only captures a single image frame (not video)
- ❌ Doesn't send data to backend

**To integrate the frontend with backend, you need to:**

1. **Modify `CameraScanner.jsx`** to record actual video instead of capturing a frame:
   - Use `MediaRecorder` API to record 10 seconds of video
   - Create a video Blob from the recording

2. **Modify `App.jsx`** `handleScanComplete` function to:
   - Send the video Blob to the backend endpoint
   - Include presageData in the request
   - Handle the backend response

**Example integration code** (for reference, don't modify yet):

```javascript
// In CameraScanner.jsx - record video instead of capturing frame
const mediaRecorder = useRef(null);
const recordedChunks = useRef([]);

// Start recording when scan starts
useEffect(() => {
  if (stream && scanTime === 0) {
    recordedChunks.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.current.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const videoBlob = new Blob(recordedChunks.current, { type: 'video/webm' });
      onScanComplete(videoBlob, finalVitals);
    };
    
    mediaRecorder.current = recorder;
    recorder.start();
  }
}, [stream, scanTime]);

// Stop recording at 10 seconds
if (scanTime >= 10 && !isProcessing) {
  if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
    mediaRecorder.current.stop();
  }
}
```

```javascript
// In App.jsx - send to backend
const handleScanComplete = async (videoBlob, vitalsData) => {
  setIsScanning(false);
  setPresageData(vitalsData);

  try {
    // Send video to backend
    const formData = new FormData();
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('presageData', JSON.stringify(vitalsData));

    const response = await fetch('http://localhost:3000/analyze-video', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.ok) {
      // Use backend analysis
      const report = {
        reportId: Math.floor(100 + Math.random() * 900),
        timestamp: new Date().toLocaleString(),
        vitals: vitalsData,
        visuals: result.analysis, // From Gemini
        actions: generateActionsFromAnalysis(result.analysis),
        diagnosis: result.analysis.notes
      };
      setIncidentReport(report);
    } else {
      setError(result.debug?.errors?.join(', ') || 'Analysis failed');
    }
  } catch (err) {
    setError(err.message);
    console.error('Error:', err);
  }
};
```

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Can upload a video file via curl
- [ ] Backend extracts 10 frames correctly
- [ ] Gemini API returns analysis (requires valid API key)
- [ ] Response includes all required fields
- [ ] Temp files are cleaned up after request

## Troubleshooting

**Backend won't start:**
- Check `.env` file has `GEMINI_API_KEY` set
- Check port 3000 is not already in use

**Video upload fails:**
- Ensure video is MP4 or WebM format
- Check file size is under 100MB
- Verify backend is running

**Frame extraction fails:**
- Ensure ffmpeg is installed: `ffmpeg -version`
- Check video file is valid and playable

**Gemini API errors:**
- Verify API key is valid
- Check API quota/limits
- Review error messages in response `debug` field
