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

      // Get backend analysis (new comprehensive format from Gemini)
      const analysis = backendResult.analysis || {}
      console.log('Full Gemini analysis:', analysis)

      // Extract data from new response structure
      const imageAnalysis = analysis.image_analysis || {}
      const simulatedVitals = analysis.simulated_vitals || {}
      const healthGuidance = analysis.health_guidance || {}
      const erSummary = analysis.er_summary || {}
      const incidentReportData = analysis.incident_report || {}

      // Build actions from health guidance
      const actions = [
        ...(healthGuidance.immediate_actions || []),
      ]
      
      // Add "do not" items as warnings
      const doNotActions = healthGuidance.do_not || []

      // Build diagnosis/summary
      let diagnosis = ''
      if (erSummary.chief_complaint) {
        diagnosis += `Chief complaint: ${erSummary.chief_complaint}. `
      }
      if (erSummary.vital_summary) {
        diagnosis += `${erSummary.vital_summary}. `
      }
      if (healthGuidance.additional_notes) {
        diagnosis += healthGuidance.additional_notes
      }
      if (!diagnosis.trim()) {
        diagnosis = 'Analysis complete. Follow guidance above.'
      }

      // Determine urgency level
      let urgency = 'medium'
      const triageLevel = erSummary.triage_level?.toLowerCase() || ''
      if (triageLevel.includes('critical')) urgency = 'critical'
      else if (triageLevel.includes('urgent')) urgency = 'high'
      else if (triageLevel.includes('non-urgent')) urgency = 'low'

      // Visual analysis from backend
      const visuals = {
        injuries: imageAnalysis.visible_injuries || [],
        position: imageAnalysis.body_position || 'Not determined',
        distressLevel: imageAnalysis.distress_level || 'Unknown',
        environmentalRisks: imageAnalysis.environmental_risks || []
      }

      // Simulated vitals from Gemini
      const geminiVitals = {
        heartRate: simulatedVitals.heart_rate_bpm || 'N/A',
        respiratoryRate: simulatedVitals.respiratory_rate_bpm || 'N/A',
        oxygenSaturation: simulatedVitals.oxygen_saturation_percent || 'N/A',
        bloodLoss: simulatedVitals.estimated_blood_loss || 'none',
        stressLevel: simulatedVitals.stress_level || 'Unknown',
        shockRisk: simulatedVitals.shock_risk || 'Unknown'
      }

      // Generate the comprehensive report
      const report = {
        reportId: reportId,
        timestamp: new Date().toLocaleString(),
        
        // Image analysis
        imageAnalysis: visuals,
        
        // Simulated vitals from Gemini
        simulatedVitals: geminiVitals,
        
        // Frontend collected vitals (from Presage simulation)
        presageVitals: vitalsData,
        
        // Health guidance
        actions: actions,
        doNotActions: doNotActions,
        callEmergency: healthGuidance.call_emergency_services || false,
        
        // ER Summary
        erSummary: {
          chiefComplaint: erSummary.chief_complaint || '',
          suspectedInjuries: erSummary.suspected_injuries || [],
          vitalSummary: erSummary.vital_summary || '',
          triageLevel: erSummary.triage_level || 'Unknown'
        },
        
        // Incident report
        incidentReport: {
          type: incidentReportData.incident_type || '',
          summary: incidentReportData.summary || '',
          location: incidentReportData.location || 'Not specified',
          time: incidentReportData.time || new Date().toLocaleString(),
          followUp: incidentReportData.recommended_follow_up || ''
        },
        
        diagnosis: diagnosis.trim(),
        urgency: urgency,
        disclaimer: analysis.disclaimer || 'All vitals are simulated for demonstration purposes.',
        
        // Keep full backend analysis for debugging
        fullAnalysis: analysis
      }

      setProcessingStatus('')
      setIsProcessing(false)
      setIncidentReport(report)
      console.log('✓ Report generated successfully:', report)

      // Generate and speak audio instructions using Web Speech API
      if ('speechSynthesis' in window) {
        const urgencyNote = urgency === 'critical' 
          ? 'CRITICAL: Immediate medical attention required. ' 
          : urgency === 'high' 
          ? 'HIGH PRIORITY: Urgent medical attention needed. ' 
          : ''
        
        // Build speech script
        let audioScript = urgencyNote
        if (healthGuidance.call_emergency_services) {
          audioScript += 'Call emergency services immediately. '
        }
        audioScript += actions.slice(0, 3).join('. ') + '. '
        if (erSummary.chief_complaint) {
          audioScript += erSummary.chief_complaint + '. '
        }
        
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
    <div className={`min-h-screen bg-surface ${!isScanning && !incidentReport ? 'flex flex-col justify-center' : ''} relative`}>
      <div className="app-container py-8 md:py-12">
        {/* Header for initial page - Logo + Text */}
        {!isScanning && !incidentReport && (
          <header className="text-center mb-12 md:mb-16">
            <div className="flex items-center justify-center mb-6">
                <img 
                  src="/images/Logo.png" 
                alt="FrontLine Logo" 
                className="h-16 md:h-20 lg:h-24 w-auto object-contain"
                style={{ 
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
                  marginRight: '2px',
                  display: 'inline-block'
                }}
              />
              <h1 className="text-3xl md:text-4xl lg:text-5xl text-text tracking-tight canela-italic-bold" style={{ marginLeft: '0px', lineHeight: '1.2', display: 'inline-block' }}>
                rontline
              </h1>
            </div>
          </header>
        )}

        {/* Header for scanning/report pages - Logo only in top left */}
        {(isScanning || incidentReport || isProcessing) && (
          <header className="text-left mb-6 -mt-4 -ml-4 md:-mt-6 md:-ml-6">
            <img 
              src="/images/Logo.png" 
              alt="FrontLine Logo" 
              className="h-12 md:h-16 w-auto object-contain"
              style={{ 
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
              }}
            />
          </header>
        )}

        {!isScanning && !incidentReport && (
          <div className="max-w-2xl mx-auto mt-8 md:mt-12">
            <div className="panel p-10 hover:bg-surface-2 transition-colors">
              <div className="text-center mb-8">
                <p className="text-text-muted text-base leading-relaxed mb-6">
                  Point your camera at the person needing first aid to begin the biometric assessment
                </p>
              </div>
              <button
                onClick={handleStartScan}
                className="w-full btn-primary-cyan flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Scan
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