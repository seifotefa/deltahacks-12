import { useRef, useEffect, useState } from 'react'

const CameraScanner = ({ onScanComplete, onScanProgress, progress }) => {
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const streamRef = useRef(null)
  const vitalsRef = useRef({ heartRate: 0, breathingRate: 0, focus: 0 })
  const hasStoppedRef = useRef(false)
  const timerRef = useRef(null)
  const processingTriggeredRef = useRef(false)
  const [stream, setStream] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanTime, setScanTime] = useState(0)
  const [vitals, setVitals] = useState({
    heartRate: 0,
    breathingRate: 0,
    focus: 0
  })

  // Keep refs in sync with state
  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    vitalsRef.current = vitals
  }, [vitals])

  useEffect(() => {
    // Reset state when component mounts
    hasStoppedRef.current = false
    processingTriggeredRef.current = false
    setIsProcessing(false)
    setScanTime(0)
    recordedChunksRef.current = []
    
    startCamera()
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Start recording when stream is ready
  useEffect(() => {
    if (stream && !mediaRecorderRef.current && !hasStoppedRef.current) {
      console.log('=== Stream ready, starting recording ===')
      console.log('Stream tracks:', stream.getTracks().length)
      startRecording()
    }
  }, [stream])

  useEffect(() => {
    // Stop timer and recording when we reach 10 seconds
    if (scanTime >= 10 && !hasStoppedRef.current) {
      hasStoppedRef.current = true
      
      // Clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      
      // Stop recording
      console.log('=== scanTime >= 10, attempting to stop ===')
      console.log('mediaRecorderRef.current:', mediaRecorderRef.current ? 'exists' : 'NULL')
      
      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current
        console.log('=== Attempting to stop recorder ===')
        console.log('Current state:', recorder.state)
        console.log('Has stopped flag:', hasStoppedRef.current)
        
        if (recorder.state === 'recording') {
          console.log('Stopping recording at 10 seconds...')
          try {
            // Request final data chunk before stopping
            recorder.requestData()
            console.log('Requested final data chunk')
            
            // Small delay to ensure data is captured
            setTimeout(() => {
              try {
                recorder.stop()
                console.log('✓ Stop command sent, new state:', recorder.state)
              } catch (stopErr) {
                console.error('✗ Error in stop():', stopErr)
              }
            }, 50)
          } catch (err) {
            console.error('✗ Error stopping recorder:', err)
            // Force stop
            try {
              if (recorder.state !== 'inactive') {
                recorder.requestData()
                setTimeout(() => {
                  if (recorder.state !== 'inactive') {
                    console.log('Force stopping recorder')
                    recorder.stop()
                  }
                }, 100)
              }
            } catch (forceErr) {
              console.error('✗ Force stop failed:', forceErr)
            }
          }
        } else if (recorder.state === 'paused') {
          recorder.requestData()
          recorder.stop()
        } else if (recorder.state === 'inactive') {
          console.warn('⚠ Recorder already inactive')
        } else {
          console.warn('⚠ Recorder in unexpected state:', recorder.state)
        }
      } else {
        console.error('✗ MediaRecorder ref is null!')
      }
      
      // Fallback: Force stop after 500ms if still recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          console.warn('⚠ Force stopping recorder after timeout')
          try {
            mediaRecorderRef.current.requestData()
            mediaRecorderRef.current.stop()
          } catch (err) {
            console.error('✗ Force stop error:', err)
          }
        }
        
        // Fallback: If onstop didn't fire, manually trigger processing
        setTimeout(() => {
          if (!processingTriggeredRef.current && recordedChunksRef.current.length > 0) {
            console.warn('⚠ onstop callback did not fire, manually triggering processing')
            const mimeType = recordedChunksRef.current[0]?.type || 'video/webm'
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const videoFile = new File(
              recordedChunksRef.current,
              `recording-${timestamp}.mp4`,  // Always use .mp4 extension
              { type: mimeType }
            )
            if (videoFile.size > 0) {
              processingTriggeredRef.current = true
              const currentVitals = vitalsRef.current
              const finalVitals = {
                heartRate: currentVitals.heartRate || Math.floor(70 + Math.random() * 60),
                breathingRate: currentVitals.breathingRate || Math.floor(12 + Math.random() * 20),
                focus: currentVitals.focus || Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40))
              }
              console.log('Manually calling onScanComplete (fallback)')
              onScanComplete(videoFile, finalVitals)
            }
          }
        }, 1000) // Wait 1 second after stop to see if onstop fires
      }, 500)
      
      // Ensure progress is at 100% (use setTimeout to avoid setState during render)
      setTimeout(() => onScanProgress(100), 0)
    } else if (scanTime < 10 && !hasStoppedRef.current) {
      timerRef.current = setTimeout(() => {
        const newTime = scanTime + 0.1
        setScanTime(newTime)
        
        // Update progress (use setTimeout to avoid setState during render)
        setTimeout(() => onScanProgress((newTime / 10) * 100), 0)
        
        // Simulate Presage SDK data collection
        // In production, this would be actual Presage SDK calls
        if (newTime > 1) {
          setVitals({
            heartRate: Math.floor(70 + Math.random() * 60), // 70-130 BPM
            breathingRate: Math.floor(12 + Math.random() * 20), // 12-32 breaths/min
            focus: Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40))
          })
        }
      }, 100)
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [scanTime, isProcessing, onScanProgress])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('Camera access denied. Please allow camera permissions.')
    }
  }

  const startRecording = () => {
    const currentStream = stream
    if (!currentStream) {
      console.error('✗ Cannot start recording: stream is null')
      return
    }
    
    if (mediaRecorderRef.current) {
      console.log('⚠ Recording already started, skipping')
      return
    }

    console.log('=== startRecording called ===')
    console.log('Stream:', currentStream)
    console.log('Stream active:', currentStream.active)
    console.log('Video tracks:', currentStream.getVideoTracks().length)
    
    recordedChunksRef.current = []
    
    // Try MP4 first, then fallback to WebM
    const options = { mimeType: 'video/mp4' }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.log('MP4 not supported, trying WebM codecs...')
      options.mimeType = 'video/webm;codecs=vp9'
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8'
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm'
        }
      }
    }
    
    console.log('Recording with MIME type:', options.mimeType)

    try {
      const mediaRecorder = new MediaRecorder(currentStream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data) {
          if (event.data.size > 0) {
            console.log('Received video chunk:', event.data.size, 'bytes')
            recordedChunksRef.current.push(event.data)
          } else {
            console.warn('Empty data chunk received (size: 0)')
          }
        } else {
          console.warn('No data in event')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('=== MediaRecorder.onstop CALLED ===')
        console.log('MediaRecorder state:', mediaRecorder.state)
        console.log('Total chunks:', recordedChunksRef.current.length)
        const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
        console.log('Total size:', totalSize, 'bytes')
        
        // Mark that processing has been triggered
        processingTriggeredRef.current = true
        
        // Small delay to ensure all data is available
        setTimeout(() => {
          setIsProcessing(true)
          
          // Check if we have any chunks
          if (recordedChunksRef.current.length === 0) {
            console.error('✗ No video chunks recorded!')
            setIsProcessing(false)
            alert('Recording failed: No video data captured. Please try again.')
            return
          }
          
        // Get MIME type from recorded chunks
        const mimeType = recordedChunksRef.current[0]?.type || 'video/webm'
        
        // Always save as .mp4 extension for easier tracking
        // (Backend can handle WebM format even with .mp4 extension)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const videoFile = new File(
          recordedChunksRef.current,  // Directly use chunks array
          `recording-${timestamp}.mp4`,  // Always use .mp4 extension
          { type: mimeType }  // Keep original MIME type (webm or mp4)
        )
        
        console.log('Video file created:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type,
          chunks: recordedChunksRef.current.length
        })
        
        if (videoFile.size === 0) {
          console.error('✗ Video file is empty!')
          setIsProcessing(false)
          alert('Recording failed: Video file is empty. Please try again.')
          return
        }
        
        // Get final vitals from ref (current state)
        const currentVitals = vitalsRef.current
        const finalVitals = {
          heartRate: currentVitals.heartRate || Math.floor(70 + Math.random() * 60),
          breathingRate: currentVitals.breathingRate || Math.floor(12 + Math.random() * 20),
          focus: currentVitals.focus || Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40))
        }
        
        console.log('Calling onScanComplete with:', {
          videoFile: videoFile.name,
          videoSize: videoFile.size,
          videoType: videoFile.type,
          vitals: finalVitals
        })
        
        // Stop camera stream
        const currentStream = streamRef.current
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop())
        }
        
        // Pass video file to parent component
        try {
          console.log('✓ Calling onScanComplete callback...')
          onScanComplete(videoFile, finalVitals)
          console.log('✓ onScanComplete callback executed')
        } catch (err) {
          console.error('✗ Error calling onScanComplete:', err)
          setIsProcessing(false)
          alert(`Error processing video: ${err.message}`)
        }
        }, 100) // Small delay to ensure all data is flushed
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error)
        setIsProcessing(false)
      }

      // Start recording
      console.log('=== Starting MediaRecorder ===')
      console.log('Options:', options)
      console.log('Stream tracks:', currentStream.getTracks().length)
      
      try {
        mediaRecorder.start(100) // Collect data every 100ms
        console.log('✓ MediaRecorder started, state:', mediaRecorder.state)
      } catch (startErr) {
        console.error('✗ Error starting MediaRecorder:', startErr)
        alert('Failed to start recording. Please try again.')
      }
    } catch (err) {
      console.error('Error starting MediaRecorder:', err)
      alert('Failed to start video recording. Please try again.')
    }
  }

  // Note: handleScanComplete is now handled by MediaRecorder.onstop
  // This function is kept for compatibility but recording happens automatically

  return (
    <div className="max-w-4xl mx-auto">
      <div className="panel p-8 hover:bg-surface-2 transition-colors">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <svg className="w-7 h-7 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-2xl font-semibold tracking-tight text-text">Scanning Vitals...</h2>
          </div>
          <p className="text-text-muted mb-3">Keep the camera steady on the patient</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-sm text-text-dim">Collecting biometric data</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-surface-2 rounded-xl p-5 border border-border">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-text flex items-center gap-2">
              <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Scan Progress
            </span>
            <span className="text-lg font-semibold text-text">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center mt-4 text-text-dim text-sm">
            {scanTime.toFixed(1)}s / 10.0s remaining
          </div>
        </div>

        {/* Camera Preview */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-surface-3 border border-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto max-h-96 object-cover"
          />
          {scanTime < 10 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="w-24 h-24 border-2 border-accent rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Vitals Display */}
        {scanTime > 1 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-danger" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Heart Rate</div>
              </div>
              <div className="text-3xl font-semibold mb-1 text-danger tracking-tight">
                {vitals.heartRate}
              </div>
              <div className="text-xs text-text-dim">BPM</div>
            </div>
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Respiration</div>
              </div>
              <div className="text-3xl font-semibold mb-1 text-text tracking-tight">
                {vitals.breathingRate}
              </div>
              <div className="text-xs text-text-dim">/min</div>
            </div>
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Focus</div>
              </div>
              <div className="text-3xl font-semibold mb-1 text-success tracking-tight">
                {Math.round(vitals.focus)}
              </div>
              <div className="text-xs text-text-dim">%</div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8 bg-surface-2 rounded-xl border border-border">
            <div className="inline-flex items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-text" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-text-muted">Processing incident report...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraScanner
