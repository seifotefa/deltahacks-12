import { useState, useRef, useEffect } from 'react'
import CameraScanner from './components/CameraScanner'
import IncidentReport from './components/IncidentReport'
import './App.css'

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [incidentReport, setIncidentReport] = useState(null)
  const [error, setError] = useState(null)
  const [presageData, setPresageData] = useState(null)

  const handleStartScan = () => {
    setIsScanning(true)
    setScanProgress(0)
    setIncidentReport(null)
    setError(null)
    setPresageData(null)
  }

  const handleScanComplete = async (imageBlob, vitalsData) => {
    setIsScanning(false)
    setPresageData(vitalsData)

    // Generate incident report from vitals (frontend-only)
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Generate report ID
      const reportId = Math.floor(100 + Math.random() * 900)

      // Analyze vitals and determine diagnosis/actions
      const { heartRate, breathingRate, focus } = vitalsData
      const actions = []
      let diagnosis = ''

      // Check for shock
      if ((heartRate > 100) && (breathingRate > 20)) {
        actions.push('Elevate legs (Shock protocol)')
        actions.push('Keep patient warm')
        diagnosis += 'Possible shock detected. '
      }

      // Check for tachycardia
      if (heartRate > 100) {
        actions.push('Monitor heart rate continuously')
        diagnosis += 'Tachycardia present. '
      }

      // Check for hyperventilation
      if (breathingRate > 20) {
        actions.push('Ensure airway is clear')
        diagnosis += 'Hyperventilation noted. '
      }

      // Check consciousness
      if (focus < 30) {
        actions.push('Maintain airway positioning')
        actions.push('Check for responsiveness')
        diagnosis += 'Patient shows signs of decreased consciousness. '
      }

      // Default actions
      if (actions.length === 0) {
        actions.push('Continue monitoring vital signs')
        actions.push('Ensure patient comfort')
      }

      actions.push('Apply pressure to any visible wounds')
      actions.push('Do not move patient if spinal injury suspected')

      if (!diagnosis) {
        diagnosis = 'Vitals within normal range. Continue monitoring.'
      }

      // Mock visual analysis (simulating Gemini analysis)
      const visuals = {
        injury: heartRate > 110 ? 'Possible trauma indicators detected. Visible distress.' : 'No obvious external injuries visible.',
        bleeding: heartRate > 110 && breathingRate > 22 ? 'Possible active bleeding (based on vitals)' : 'No active bleeding detected',
        position: 'Supine (Lying on back) - inferred from scan'
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
        diagnosis: diagnosis.trim()
      }

      setIncidentReport(report)

      // Generate and speak audio instructions using Web Speech API
      if ('speechSynthesis' in window) {
        const audioScript = actions.join('. ') + '. ' + diagnosis
        const utterance = new SpeechSynthesisUtterance(audioScript)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1
        speechSynthesis.speak(utterance)
      }
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
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

        {error && (
          <div className="max-w-2xl mx-auto mt-8 panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-text">Error: {error}</p>
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