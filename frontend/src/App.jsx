import { useState, useRef, useEffect } from 'react'
import CameraScanner from './components/CameraScanner'
import IncidentReport from './components/IncidentReport'
import './App.css'

// Backend API endpoint
// Default: http://localhost:3000
// To change: Create frontend/.env file with: VITE_BACKEND_URL=http://localhost:YOUR_PORT
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// Log backend URL on startup
console.log('=== Frontend Configuration ===')
console.log('Backend URL:', BACKEND_URL)
console.log('Expected backend port: 3000')
console.log('If backend is on different port, set VITE_BACKEND_URL in frontend/.env')

// Test backend connection on startup
fetch(`${BACKEND_URL}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('✓ Backend connection test (startup):', data)
  })
  .catch(err => {
    console.error('✗ Backend connection test (startup) FAILED:', err.message)
    console.error('  Make sure backend is running: cd backend/gemini-service && npm start')
  })

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [incidentReport, setIncidentReport] = useState(null)
  const [error, setError] = useState(null)
  const [presageData, setPresageData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  const handleStartScan = () => {
    setIsScanning(true)
    setScanProgress(0)
    setIncidentReport(null)
    setError(null)
    setPresageData(null)
  }

  const handleScanComplete = async (videoFile, vitalsData) => {
    console.log('=== handleScanComplete called ===')
    console.log('Video file:', videoFile ? { 
      name: videoFile.name, 
      size: videoFile.size, 
      type: videoFile.type 
    } : 'MISSING')
    console.log('Vitals data:', vitalsData)
    
    if (!videoFile || videoFile.size === 0) {
      console.error('ERROR: Video file is missing or empty')
      setError('Video recording failed - no video data captured')
      setIsScanning(false)
      setIsProcessing(false)
      return
    }
    
    setIsScanning(false)
    setIsProcessing(true)
    setProcessingStatus('Preparing video for analysis...')
    setPresageData(vitalsData)
    setError(null)

    try {
      // Send video file to backend for analysis
      const formData = new FormData()
      formData.append('video', videoFile, videoFile.name) // Use the File object with its name
      formData.append('presageData', JSON.stringify(vitalsData))

      console.log('Sending video to backend...', {
        videoSize: videoFile.size,
        videoType: videoFile.type,
        videoName: videoFile.name,
        vitals: vitalsData,
        backendUrl: `${BACKEND_URL}/analyze-video`
      })

      // Test backend connection first
      setProcessingStatus('Checking backend connection...')
      console.log(`\n=== TESTING BACKEND CONNECTION ===`)
      console.log(`Backend URL: ${BACKEND_URL}`)
      console.log(`Health check URL: ${BACKEND_URL}/health`)
      console.log(`Full URL: ${BACKEND_URL}/health`)
      
      let healthCheck
      try {
        const healthCheckStartTime = Date.now()
        console.log(`[${new Date().toISOString()}] Making GET request to: ${BACKEND_URL}/health`)
        
        healthCheck = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        const healthCheckTime = Date.now() - healthCheckStartTime
        console.log(`[${new Date().toISOString()}] Health check response received: ${healthCheck.status} ${healthCheck.statusText} (${healthCheckTime}ms)`)
        console.log('Response headers:', Object.fromEntries(healthCheck.headers.entries()))
        
        if (!healthCheck.ok) {
          const errorText = await healthCheck.text()
          console.error('Health check failed response body:', errorText)
          throw new Error(`Backend health check failed: ${healthCheck.status} - ${errorText}`)
        }
        
        const healthData = await healthCheck.json()
        console.log('✓ Backend is reachable:', healthData)
        console.log('=== BACKEND CONNECTION OK ===\n')
      } catch (healthErr) {
        console.error('✗ Backend connection test failed:', healthErr)
        console.error('Error details:', {
          name: healthErr.name,
          message: healthErr.message,
          stack: healthErr.stack?.substring(0, 500)
        })
        console.error('This means the backend is NOT reachable. Check:')
        console.error('  1. Is backend running? (cd backend/gemini-service && npm start)')
        console.error('  2. Is backend on port 3000?')
        console.error('  3. Check browser Network tab for CORS errors')
        setIsProcessing(false)
        throw new Error(`Cannot connect to backend at ${BACKEND_URL}. Make sure the backend is running: cd backend/gemini-service && npm start`)
      }

      setProcessingStatus('Sending video to backend...')
      console.log(`\n=== SENDING VIDEO TO BACKEND ===`)
      console.log(`URL: ${BACKEND_URL}/analyze-video`)
      console.log(`Video file: ${videoFile.name}`)
      console.log(`Video size: ${(videoFile.size / 1024 / 1024).toFixed(2)} MB (${videoFile.size} bytes)`)
      console.log(`Video type: ${videoFile.type}`)
      console.log(`Presage data:`, vitalsData)
      
      // Log FormData contents
      console.log(`FormData entries:`)
      for (const [key, val] of formData.entries()) {
        if (val instanceof File) {
          console.log(`  ${key}: File(${val.name}, ${val.size} bytes, ${val.type})`)
        } else {
          console.log(`  ${key}: ${typeof val === 'string' ? val.substring(0, 100) : val}`)
        }
      }
      
      const fetchStartTime = Date.now()
      console.log(`\n[${new Date().toISOString()}] === MAKING POST REQUEST ===`)
      console.log(`URL: ${BACKEND_URL}/analyze-video`)
      console.log(`Method: POST`)
      console.log(`FormData size: ${formData.get('video')?.size || 'unknown'} bytes`)
      console.log(`Video file name: ${videoFile.name}`)
      
      let response
      try {
        console.log(`[${new Date().toISOString()}] Sending fetch request...`)
        response = await fetch(`${BACKEND_URL}/analyze-video`, {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
          signal: AbortSignal.timeout(60000) // 60 second timeout for video processing
        })
        console.log(`[${new Date().toISOString()}] ✓ Fetch request completed (no exception thrown)`)
        console.log(`Response status: ${response.status} ${response.statusText}`)
      } catch (fetchErr) {
        console.error(`[${new Date().toISOString()}] ✗ Fetch request failed:`, fetchErr)
        console.error('Error details:', {
          name: fetchErr.name,
          message: fetchErr.message,
          stack: fetchErr.stack?.substring(0, 500)
        })
        console.error('This could be:')
        console.error('  - Network error (backend not running)')
        console.error('  - CORS error (check backend CORS settings)')
        console.error('  - Timeout (backend taking too long)')
        throw fetchErr
      }
      
      const fetchTime = ((Date.now() - fetchStartTime) / 1000).toFixed(2)
      console.log(`✓ Fetch completed in ${fetchTime}s`)
      console.log('Response status:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.debug?.errors?.join(', ') || `Backend error: ${response.status}`)
      }

      setProcessingStatus('Processing video analysis...')
      const backendResult = await response.json()
      console.log('✓ Backend response received:', backendResult)

      if (!backendResult.ok) {
        console.error('✗ Backend returned error:', backendResult)
        throw new Error(backendResult.debug?.errors?.join(', ') || 'Video analysis failed')
      }
      
      setProcessingStatus('Generating report...')

      // Generate report ID
      const reportId = Math.floor(100 + Math.random() * 900)

      // Get backend analysis
      const analysis = backendResult.analysis || {}
      const { heartRate, breathingRate, focus } = vitalsData

      // Combine vitals-based actions with visual analysis
      const actions = []
      let diagnosis = ''

      // Actions based on vitals
      if ((heartRate > 100) && (breathingRate > 20)) {
        actions.push('Elevate legs (Shock protocol)')
        actions.push('Keep patient warm')
        diagnosis += 'Possible shock detected. '
      }

      if (heartRate > 100) {
        actions.push('Monitor heart rate continuously')
        diagnosis += 'Tachycardia present. '
      }

      if (breathingRate > 20) {
        actions.push('Ensure airway is clear')
        diagnosis += 'Hyperventilation noted. '
      }

      if (focus < 30) {
        actions.push('Maintain airway positioning')
        actions.push('Check for responsiveness')
        diagnosis += 'Patient shows signs of decreased consciousness. '
      }

      // Actions based on visual analysis (from Gemini)
      if (analysis.bleeding_level && analysis.bleeding_level !== 'none') {
        const bleedingActions = {
          mild: 'Apply direct pressure to wound',
          moderate: 'Apply pressure and elevate if possible',
          severe: 'Apply direct pressure, call emergency services immediately'
        }
        actions.push(bleedingActions[analysis.bleeding_level] || 'Monitor for bleeding')
      }

      if (analysis.urgency_level === 'critical' || analysis.urgency_level === 'high') {
        actions.push('Immediate medical attention required')
        actions.push('Do not move patient if spinal injury suspected')
      }

      // Default actions
      if (actions.length === 0) {
        actions.push('Continue monitoring vital signs')
        actions.push('Ensure patient comfort')
      } else {
        actions.push('Apply pressure to any visible wounds')
        actions.push('Do not move patient if spinal injury suspected')
      }

      // Combine diagnosis
      if (analysis.notes) {
        diagnosis += analysis.notes + ' '
      }
      if (!diagnosis.trim()) {
        diagnosis = 'Vitals within normal range. Continue monitoring.'
      }

      // Visual analysis from backend
      const visuals = {
        injury: analysis.injury_types?.length > 0 
          ? `Detected injuries: ${analysis.injury_types.join(', ')}` 
          : 'No obvious external injuries visible.',
        bleeding: analysis.bleeding_level 
          ? `Bleeding level: ${analysis.bleeding_level}` 
          : 'No active bleeding detected',
        position: analysis.body_position || 'Position not determined',
        confidence: analysis.confidence ? `Confidence: ${Math.round(analysis.confidence * 100)}%` : ''
      }

      // Generate the report
      const report = {
        reportId: reportId,
        timestamp: new Date().toLocaleString(),
        vitals: {
          heartRate: heartRate,
          breathingRate: breathingRate,
          focus: focus
        },
        visuals: visuals,
        actions: actions,
        diagnosis: diagnosis.trim(),
        urgency: analysis.urgency_level || 'medium',
        backendAnalysis: analysis // Include full backend analysis
      }

      setProcessingStatus('')
      setIsProcessing(false)
      setIncidentReport(report)
      console.log('✓ Report generated successfully')

      // Generate and speak audio instructions using Web Speech API
      if ('speechSynthesis' in window) {
        const urgencyNote = analysis.urgency_level === 'critical' 
          ? 'CRITICAL: Immediate medical attention required. ' 
          : analysis.urgency_level === 'high' 
          ? 'HIGH PRIORITY: Urgent medical attention needed. ' 
          : ''
        const audioScript = urgencyNote + actions.join('. ') + '. ' + diagnosis
        const utterance = new SpeechSynthesisUtterance(audioScript)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1
        speechSynthesis.speak(utterance)
      }
    } catch (err) {
      console.error('✗ Error sending to backend:', err)
      setProcessingStatus('')
      setIsProcessing(false)
      
      // Provide more helpful error messages
      let errorMessage = err.message
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The backend may be processing or unavailable.'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = `Cannot connect to backend at ${BACKEND_URL}. Make sure the backend service is running on port 3000.`
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error. Check backend CORS configuration.'
      }
      
      setError(errorMessage)
      setIsScanning(false)
      setIsProcessing(false)
    }
  }

  const handleScanProgress = (progress) => {
    setScanProgress(progress)
  }

  const handleNewScan = () => {
    setIncidentReport(null)
    setPresageData(null)
    setError(null)
    setScanProgress(0)
    setIsProcessing(false)
    setProcessingStatus('')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="app-container py-16">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6 p-3 rounded-full bg-surface-2 border border-border">
            <svg className="w-10 h-10 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold mb-3 text-text tracking-tight">
            Touchless Triage
          </h1>
          <p className="text-text-muted text-lg mb-4">10-Second Biometric & Visual Analysis</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-text-dim text-sm">Medical Grade Health Assessment</span>
          </div>
        </header>

        {!isScanning && !incidentReport && (
          <div className="max-w-2xl mx-auto">
            <div className="panel p-10 hover:bg-surface-2 transition-colors">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-5 rounded-full bg-surface-2 border border-border mb-6">
                  <svg className="w-16 h-16 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-semibold mb-4 text-text tracking-tight">Ready to Scan</h2>
                <p className="text-text-muted text-base leading-relaxed mb-6">
                  Point your camera at the patient and begin the 10-second biometric scan.
                  <br />
                  <span className="text-text">We'll measure heart rate, breathing rate, and consciousness levels.</span>
                </p>
                <div className="mt-8 flex items-center justify-center gap-8 text-sm text-text-dim">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Non-invasive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Real-time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Clinical Grade</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleStartScan}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start 10-Second Biometric Scan
              </button>
            </div>
          </div>
        )}

        {isScanning && (
          <CameraScanner
            onScanComplete={handleScanComplete}
            onScanProgress={handleScanProgress}
            progress={scanProgress}
          />
        )}

        {isProcessing && (
          <div className="max-w-2xl mx-auto mt-8 panel p-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4">
                <svg className="animate-spin h-6 w-6 text-text" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-text font-semibold">Processing Video Analysis</p>
              </div>
              {processingStatus && (
                <p className="text-text-dim text-sm">{processingStatus}</p>
              )}
              <p className="text-text-dim text-xs mt-4">
                This may take 30-60 seconds...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-8 panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-text font-semibold">Error: {error}</p>
                <p className="text-text-dim text-sm mt-2">
                  Backend URL: {BACKEND_URL}
                </p>
                <p className="text-text-dim text-xs mt-1">
                  Make sure the backend is running: <code className="bg-surface-2 px-1 rounded">cd backend/gemini-service && npm start</code>
                </p>
              </div>
            </div>
            <button
              onClick={handleNewScan}
              className="btn-secondary"
            >
              Try Again
            </button>
          </div>
        )}

        {incidentReport && (
          <div className="mt-8">
            <IncidentReport report={incidentReport} vitals={presageData} />
            <div className="text-center mt-12">
              <button
                onClick={handleNewScan}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App