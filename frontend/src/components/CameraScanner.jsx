import { useRef, useEffect, useState } from 'react'

const CameraScanner = ({ onScanComplete, onScanProgress, progress }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanTime, setScanTime] = useState(0)
  const [vitals, setVitals] = useState({
    heartRate: 0,
    breathingRate: 0,
    focus: 0
  })

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (scanTime >= 10 && !isProcessing) {
      handleScanComplete()
    } else if (scanTime < 10) {
      const timer = setTimeout(() => {
        setScanTime(prev => {
          const newTime = prev + 0.1
          onScanProgress((newTime / 10) * 100)
          
          // Simulate Presage SDK data collection
          // In production, this would be actual Presage SDK calls
          if (newTime > 1) {
            setVitals({
              heartRate: Math.floor(70 + Math.random() * 60), // 70-130 BPM
              breathingRate: Math.floor(12 + Math.random() * 20), // 12-32 breaths/min
              focus: Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40))
            })
          }
          
          return newTime
        })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [scanTime, isProcessing])

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

  const handleScanComplete = async () => {
    setIsProcessing(true)
    
    // Capture frame
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (canvas && video) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      canvas.toBlob(async (blob) => {
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
        
        // Final vitals reading
        const finalVitals = {
          heartRate: vitals.heartRate || Math.floor(70 + Math.random() * 60),
          breathingRate: vitals.breathingRate || Math.floor(12 + Math.random() * 20),
          focus: vitals.focus || Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40))
        }
        
        onScanComplete(blob, finalVitals)
      }, 'image/jpeg', 0.95)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">🔬 Scanning Vitals...</h2>
          <p className="text-gray-300">Keep the camera steady on the patient</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Progress</span>
            <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center mt-2 text-gray-400 text-sm">
            {scanTime.toFixed(1)}s / 10.0s
          </div>
        </div>

        {/* Camera Preview */}
        <div className="relative rounded-xl overflow-hidden mb-6 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto max-h-96 object-cover"
          />
          {scanTime < 10 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-500/20 backdrop-blur-sm rounded-full p-8 animate-pulse">
                <div className="w-24 h-24 border-4 border-red-500 rounded-full" />
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Live Vitals Display */}
        {scanTime > 1 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
              <div className="text-sm text-gray-300 mb-1">Heart Rate</div>
              <div className="text-2xl font-bold text-red-400">{vitals.heartRate} BPM</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
              <div className="text-sm text-gray-300 mb-1">Breathing Rate</div>
              <div className="text-2xl font-bold text-yellow-400">{vitals.breathingRate}/min</div>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
              <div className="text-sm text-gray-300 mb-1">Focus Score</div>
              <div className="text-2xl font-bold text-blue-400">{Math.round(vitals.focus)}%</div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-300">Processing incident report...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraScanner
