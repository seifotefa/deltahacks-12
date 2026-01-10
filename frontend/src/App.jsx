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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            🚨 Touchless Triage
          </h1>
          <p className="text-gray-300 text-lg">10-Second Biometric & Visual Analysis</p>
        </header>

        {!isScanning && !incidentReport && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📱</div>
                <h2 className="text-2xl font-semibold mb-2">Ready to Scan</h2>
                <p className="text-gray-300">
                  Point your camera at the patient and begin the 10-second biometric scan.
                  We'll measure heart rate, breathing rate, and focus levels.
                </p>
              </div>
              <button
                onClick={handleStartScan}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start 10-Second Scan
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
          <div className="max-w-2xl mx-auto mt-6 bg-red-500/20 border border-red-500 rounded-xl p-4">
            <p className="text-red-200">Error: {error}</p>
            <button
              onClick={handleNewScan}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {incidentReport && (
          <div className="mt-6">
            <IncidentReport report={incidentReport} vitals={presageData} />
            <div className="text-center mt-6">
              <button
                onClick={handleNewScan}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
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