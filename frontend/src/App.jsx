import { useState, useRef, useEffect } from 'react'
import CameraScanner from './components/CameraScanner'
import IncidentReport from './components/IncidentReport'
import HowItWorksModal from './components/HowItWorksModal'
import './App.css'

// Backend API endpoint
// Default: http://localhost:3000
// To change: Create frontend/.env file with: VITE_BACKEND_URL=http://localhost:YOUR_PORT
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// ElevenLabs service endpoint
// Default: http://localhost:3001
// To change: Create frontend/.env file with: VITE_ELEVENLABS_URL=http://localhost:YOUR_PORT
const ELEVENLABS_URL = import.meta.env.VITE_ELEVENLABS_URL || 'http://localhost:3001'

// Log configuration on startup
console.log('=== Frontend Configuration ===')
console.log('Backend URL (Gemini):', BACKEND_URL)
console.log('ElevenLabs URL:', ELEVENLABS_URL)
console.log('Expected backend port: 3000')
console.log('Expected ElevenLabs port: 3001')
console.log('To change: Set VITE_BACKEND_URL and VITE_ELEVENLABS_URL in frontend/.env')

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
  const [processingProgress, setProcessingProgress] = useState(0)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isButtonAnimating, setIsButtonAnimating] = useState(false)
  
  // Ref to track auto-playing audio so it can be stopped
  const autoAudioRef = useRef(null)
  const progressIntervalRef = useRef(null)
  
  // Slow progress bar animation while processing
  useEffect(() => {
    if (isProcessing) {
      // Start from 0 and slowly increment
      setProcessingProgress(0)
      progressIntervalRef.current = setInterval(() => {
        setProcessingProgress(prev => {
          // Slow down as we approach 90% (never reach 100% until done)
          if (prev < 30) return prev + 2
          if (prev < 60) return prev + 1
          if (prev < 85) return prev + 0.5
          if (prev < 95) return prev + 0.2
          return prev // Stop at 95%, wait for completion
        })
      }, 200) // Update every 200ms
    } else {
      // Clear interval when not processing
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isProcessing])
  
  // Function to stop auto-playing audio
  const stopAutoAudio = () => {
    if (autoAudioRef.current) {
      autoAudioRef.current.pause()
      autoAudioRef.current.currentTime = 0
      autoAudioRef.current = null
    }
    // Also stop Web Speech API if active
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }

  const handleStartScan = (e) => {
    // Ripple effect
    setIsButtonAnimating(true)
    setTimeout(() => setIsButtonAnimating(false), 600)
    
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
    
    // Save video URL for playback
    const videoUrl = URL.createObjectURL(videoFile)
    setRecordedVideoUrl(videoUrl)

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

      // Determine urgency level based on multiple factors
      // Be CONSERVATIVE - only escalate when there's clear evidence
      let urgency = 'low' // Default to low
      const triageLevel = erSummary.triage_level?.toLowerCase() || ''
      const distressLevel = imageAnalysis.distress_level?.toLowerCase() || ''
      const bloodLoss = simulatedVitals.estimated_blood_loss?.toLowerCase() || 'none'
      const shockRisk = simulatedVitals.shock_risk?.toLowerCase() || 'low'
      
      // Check for non-urgent FIRST (contains "urgent" but means low priority)
      const isNonUrgent = triageLevel.includes('non-urgent') || triageLevel.includes('non urgent')
      // Only "urgent" without "non" prefix means high priority
      const isUrgent = triageLevel.includes('urgent') && !isNonUrgent
      const isCritical = triageLevel.includes('critical')
      
      console.log('Urgency factors:', { triageLevel, distressLevel, bloodLoss, shockRisk, isNonUrgent, isUrgent, isCritical })
      
      // Critical conditions - explicit critical triage OR severe indicators
      if (
        isCritical ||
        (bloodLoss === 'severe' && shockRisk === 'high') ||
        (distressLevel === 'severe' && shockRisk === 'high')
      ) {
        urgency = 'critical'
      }
      // High priority - explicit urgent triage (NOT non-urgent) OR severe single factors
      else if (
        isUrgent ||
        (bloodLoss === 'severe') ||
        (shockRisk === 'high') ||
        (distressLevel === 'severe')
      ) {
        urgency = 'high'
      }
      // Medium - moderate concerns
      else if (
        bloodLoss === 'moderate' ||
        shockRisk === 'moderate' ||
        distressLevel === 'moderate'
      ) {
        urgency = 'medium'
      }
      // Low - non-urgent, mild, or no significant concerns (default)
      
      console.log('Determined urgency:', urgency)

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
        // Only show call emergency for high/critical urgency
        callEmergency: (urgency === 'critical' || urgency === 'high') && healthGuidance.call_emergency_services,
        
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

      setProcessingProgress(100)
      setProcessingStatus('')
      setIsProcessing(false)
      setProcessingProgress(0)
      setIncidentReport(report)
      console.log('✓ Report generated successfully:', report)

      // Generate and speak audio instructions using ElevenLabs
      // Build speech script dynamically from Gemini analysis data
      try {
        let audioScript = ''
        
        // 1. Urgency prefix based on calculated urgency
        if (urgency === 'critical') {
          audioScript += 'Critical situation detected. Immediate medical attention required. '
        } else if (urgency === 'high') {
          audioScript += 'Urgent medical attention needed. '
        }
        
        // 2. Emergency services OR investigate based on urgency
        if (urgency === 'critical' || urgency === 'high') {
          if (healthGuidance.call_emergency_services === true) {
            audioScript += 'Call emergency services immediately. '
          }
        } else {
          // Low or medium urgency - don't prompt for emergency, suggest investigation
          audioScript += 'Please assess the situation carefully. '
        }
        
        // 3. Situation summary from Gemini's ER summary
        if (erSummary.chief_complaint) {
          audioScript += `Assessment: ${erSummary.chief_complaint}. `
        }
        
        // 4. Key vitals if concerning (from Gemini simulated vitals)
        if (simulatedVitals.shock_risk?.toLowerCase() === 'high') {
          audioScript += 'High shock risk detected. '
        }
        if (simulatedVitals.estimated_blood_loss?.toLowerCase() === 'severe') {
          audioScript += 'Severe blood loss observed. '
        }
        
        // 5. Immediate actions from Gemini (first 3)
        const immediateActions = healthGuidance.immediate_actions || []
        if (immediateActions.length > 0) {
          audioScript += 'Immediate actions: ' + immediateActions.slice(0, 3).join('. ') + '. '
        }
        
        // 6. Critical warnings from Gemini (do not actions)
        const doNotList = healthGuidance.do_not || []
        if (doNotList.length > 0 && urgency !== 'low') {
          audioScript += 'Important: Do not ' + doNotList[0].toLowerCase() + '. '
        }
        
        // 7. Additional notes from Gemini if available
        if (healthGuidance.additional_notes && urgency !== 'low') {
          audioScript += healthGuidance.additional_notes + ' '
        }
        
        // Fallback if no data
        if (!audioScript.trim()) {
          audioScript = 'Analysis complete. Please review the report for details.'
        }
        
        console.log('Audio script from Gemini data:', audioScript)
        
        console.log('Generating audio with ElevenLabs:', audioScript.substring(0, 100) + '...')
        
        // Call ElevenLabs text-to-speech endpoint
        const audioResponse = await fetch(`${ELEVENLABS_URL}/text-to-speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: audioScript
          })
        })
        
        if (audioResponse.ok) {
          // Get audio as blob
          const audioBlob = await audioResponse.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          
          // Play audio and store ref so it can be stopped
          const audio = new Audio(audioUrl)
          autoAudioRef.current = audio
          audio.onended = () => {
            autoAudioRef.current = null
            URL.revokeObjectURL(audioUrl)
          }
          audio.play().catch(err => {
            console.error('Error playing audio:', err)
          })
          
          console.log('✓ Audio generated and playing')
        } else {
          console.warn('Failed to generate audio:', audioResponse.status)
        }
      } catch (audioErr) {
        console.error('Error generating audio:', audioErr)
        // Fallback to Web Speech API if ElevenLabs fails
        if ('speechSynthesis' in window) {
          // Build same dynamic script for fallback
          let fallbackScript = ''
          if (urgency === 'critical') {
            fallbackScript += 'Critical situation. '
          } else if (urgency === 'high') {
            fallbackScript += 'Urgent attention needed. '
          }
          if (urgency === 'critical' || urgency === 'high') {
            if (healthGuidance.call_emergency_services) {
              fallbackScript += 'Call emergency services. '
            }
          } else {
            fallbackScript += 'Please assess the situation. '
          }
          if (erSummary.chief_complaint) {
            fallbackScript += erSummary.chief_complaint + '. '
          }
          const immediateActions = healthGuidance.immediate_actions || []
          if (immediateActions.length > 0) {
            fallbackScript += immediateActions.slice(0, 2).join('. ') + '. '
          }
          if (!fallbackScript.trim()) {
            fallbackScript = 'Analysis complete. Review the report.'
          }
          
          const utterance = new SpeechSynthesisUtterance(fallbackScript)
          utterance.rate = 0.9
          speechSynthesis.speak(utterance)
        }
      }
    } catch (err) {
      console.error('✗ Error sending to backend:', err)
      setProcessingStatus('')
      setIsProcessing(false)
      setProcessingProgress(0)
      
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
    setProcessingProgress(0)
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle background treatment */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.03) 40%, transparent 70%)'
          }}
        />
        {/* Noise texture */}
        <div className="absolute inset-0 noise-texture opacity-30" />
      </div>

      {/* Header for scanning/report pages - Logo only in top left */}
      {(isScanning || incidentReport || isProcessing) && (
        <header className="absolute top-6 left-6 z-10">
          <img 
            src="/images/frontlinenobg.png" 
            alt="Frontline Logo" 
            className="h-12 md:h-16 w-auto object-contain"
            style={{ 
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
            }}
          />
        </header>
      )}

      {/* Landing Page - Hero Centered */}
      {!isScanning && !incidentReport && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-6 animate-fade-in">
            {/* Logo and Subheadline - Tight Grouping */}
            <div className="flex flex-col items-center">
              <img 
                src="/images/frontlinenobg.png" 
                alt="Frontline Logo" 
                className="h-48 md:h-56 lg:h-64 w-auto object-contain"
                style={{ 
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
                  marginBottom: '-30px'
                }}
              />
              <p className="text-xl text-gray-700 font-medium" style={{ marginTop: '-20px', lineHeight: '1.2' }}>
                Biometric assessment in seconds.
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <div 
              className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-xl p-8"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset'
              }}
            >
              {/* Instructions */}
              <div className="text-center mb-6">
                <p className="text-gray-900 font-medium mb-2">
                  Point your camera at the person needing first aid
                </p>
                <p className="text-sm text-gray-500">
                  Hold steady for best results
                </p>
              </div>

              {/* Start Scan Button */}
              <button
                onClick={handleStartScan}
                className={`relative w-full bg-cyan-500 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 hover:bg-cyan-600 active:scale-95 overflow-hidden ${
                  isButtonAnimating ? 'ripple-effect' : ''
                }`}
                aria-label="Start biometric scan"
              >
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Scan
                </span>
              </button>

              {/* Learn How It Works Button */}
              <button
                onClick={() => setShowHowItWorks(true)}
                className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 rounded-lg py-2"
                aria-label="Learn how it works"
              >
                Learn how it works
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />

      <div className="app-container py-8 md:py-12 relative z-10">

        {isScanning && (
          <CameraScanner
            onScanComplete={handleScanComplete}
            onScanProgress={handleScanProgress}
            progress={scanProgress}
          />
        )}

        {isProcessing && (
          <div className="fixed inset-0 flex items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
            <div className="max-w-md w-full mx-4 panel p-8 shadow-xl">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-4">
                  <svg className="animate-spin h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-text font-semibold">Processing Video Analysis</p>
                </div>
                
                {/* Progress Bar - clean and fast */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="h-full rounded-full relative overflow-hidden"
                    style={{ 
                      width: `${processingProgress}%`,
                      transition: 'width 0.4s ease-out',
                      background: 'linear-gradient(90deg, #06b6d4, #0891b2, #06b6d4)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1s ease-in-out infinite'
                    }}
                  >
                    <div 
                      className="absolute inset-0 opacity-50"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                        animation: 'glow-sweep 1s ease-in-out infinite'
                      }}
                    />
                  </div>
                </div>
                <style>{`
                  @keyframes shimmer {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                  }
                  @keyframes glow-sweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                  }
                `}</style>
              </div>
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
            <IncidentReport report={incidentReport} vitals={presageData} videoUrl={recordedVideoUrl} onStopAutoAudio={stopAutoAudio} />
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