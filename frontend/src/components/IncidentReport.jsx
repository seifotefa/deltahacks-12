import { useState, useRef, useEffect } from 'react'

// Backend URLs
const GEMINI_URL = import.meta.env.VITE_GEMINI_URL || 'http://localhost:3000'
const ELEVENLABS_URL = import.meta.env.VITE_ELEVENLABS_URL || 'http://localhost:3001'

// Mock hospital data for GTA Area
const GTA_HOSPITALS = [
  { id: 'mcmaster', name: 'McMaster University Medical Centre', city: 'Hamilton', phone: '905-521-2100' },
  { id: 'hamilton-general', name: 'Hamilton General Hospital', city: 'Hamilton', phone: '905-527-4322' },
  { id: 'st-josephs', name: "St. Joseph's Healthcare", city: 'Hamilton', phone: '905-522-1155' },
  { id: 'toronto-general', name: 'Toronto General Hospital', city: 'Toronto', phone: '416-340-4800' },
  { id: 'sunnybrook', name: 'Sunnybrook Health Sciences Centre', city: 'Toronto', phone: '416-480-6100' },
  { id: 'mt-sinai', name: 'Mount Sinai Hospital', city: 'Toronto', phone: '416-596-4200' },
  { id: 'sick-kids', name: 'SickKids Hospital', city: 'Toronto', phone: '416-813-1500' },
  { id: 'trillium', name: 'Trillium Health Partners', city: 'Mississauga', phone: '905-848-7580' },
  { id: 'brampton-civic', name: 'Brampton Civic Hospital', city: 'Brampton', phone: '905-494-2120' },
  { id: 'markham-stouffville', name: 'Markham Stouffville Hospital', city: 'Markham', phone: '905-472-7000' },
]

const IncidentReport = ({ report, videoUrl, onStopAutoAudio }) => {
  const [copied, setCopied] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState(GTA_HOSPITALS[0].id)
  const [showHospitalSelect, setShowHospitalSelect] = useState(false)
  const [sendStatus, setSendStatus] = useState(null) // null | 'sending' | 'sent'
  const [showVideoPlayback, setShowVideoPlayback] = useState(false)
  
  // Voice Agent State
  const [isAgentActive, setIsAgentActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [agentStatus, setAgentStatus] = useState('') // Status message
  const [conversationHistory, setConversationHistory] = useState([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const isAgentActiveRef = useRef(false)
  
  // Keep ref in sync with state
  useEffect(() => {
    isAgentActiveRef.current = isAgentActive
  }, [isAgentActive])

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': case 'urgent': return 'bg-cyan-600 text-white'
      case 'medium': return 'bg-cyan-500 text-white'
      default: return 'bg-cyan-400 text-white'
    }
  }

  const generateEMSReport = () => {
    const erSummary = report.erSummary || {}
    const simVitals = report.simulatedVitals || {}
    const incident = report.incidentReport || {}
    const imageAnalysis = report.imageAnalysis || {}
    
    // SBAR Format - Standard EMS Communication
    return `
════════════════════════════════════════════════════════════════
              SBAR EMS HANDOFF REPORT - #${report.reportId || '000'}
════════════════════════════════════════════════════════════════
Generated: ${report.timestamp || new Date().toLocaleString()}
Priority: ${erSummary.triageLevel || report.urgency?.toUpperCase() || 'UNKNOWN'}
${report.callEmergency ? '⚠️  EMERGENCY SERVICES REQUIRED  ⚠️\n' : ''}
────────────────────────────────────────────────────────────────
  S - SITUATION
────────────────────────────────────────────────────────────────
Chief Complaint: ${erSummary.chiefComplaint || 'Not specified'}
Incident Type: ${incident.type || 'Medical emergency'}
Location: ${incident.location || 'Not specified'}
Time of Incident: ${incident.time || report.timestamp || 'Unknown'}
Patient Position: ${imageAnalysis.position || 'Not determined'}
Distress Level: ${imageAnalysis.distressLevel || 'Unknown'}

────────────────────────────────────────────────────────────────
  B - BACKGROUND
────────────────────────────────────────────────────────────────
Incident Summary: ${incident.summary || 'N/A'}
Visible Injuries: ${imageAnalysis.injuries?.join(', ') || erSummary.suspectedInjuries?.join(', ') || 'None observed'}
Environmental Risks: ${imageAnalysis.environmentalRisks?.join(', ') || 'None identified'}
Patient History: Unknown (first responder assessment)

────────────────────────────────────────────────────────────────
  A - ASSESSMENT
────────────────────────────────────────────────────────────────
VITAL SIGNS (Simulated):
  • Heart Rate:       ${simVitals.heartRate || 'N/A'} BPM
  • Respiratory Rate: ${simVitals.respiratoryRate || 'N/A'} /min
  • O2 Saturation:    ${simVitals.oxygenSaturation || 'N/A'}%
  • Blood Loss Est:   ${simVitals.bloodLoss || 'None'}
  • Stress Level:     ${simVitals.stressLevel || 'Unknown'}
  • Shock Risk:       ${simVitals.shockRisk || 'Unknown'}

Clinical Impression: ${erSummary.chiefComplaint || 'Requires further assessment'}
Triage Category: ${erSummary.triageLevel || report.urgency?.toUpperCase() || 'UNKNOWN'}

────────────────────────────────────────────────────────────────
  R - RECOMMENDATION
────────────────────────────────────────────────────────────────
IMMEDIATE ACTIONS:
${report.actions?.map((a, i) => `  ${i + 1}. ${a}`).join('\n') || '  None specified'}

${report.doNotActions?.length > 0 ? `PRECAUTIONS (DO NOT):\n${report.doNotActions.map(a => `  • ${a}`).join('\n')}` : ''}

DISPOSITION: ${report.callEmergency ? 'Transport to nearest trauma center' : 'Continue monitoring, transport if condition worsens'}
FOLLOW-UP: ${incident.followUp || 'Standard EMS protocols'}

────────────────────────────────────────────────────────────────
  DISCLAIMER
────────────────────────────────────────────────────────────────
${report.disclaimer || 'All vitals are simulated for demonstration purposes only. This AI-generated report does not replace professional medical assessment. Always follow local EMS protocols.'}

════════════════════════════════════════════════════════════════
                    END OF SBAR REPORT
════════════════════════════════════════════════════════════════
    `.trim()
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEMSReport()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadEMSReport = () => {
    const reportText = generateEMSReport()
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EMS-Report-${report.reportId || Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sendToHospital = () => {
    const hospital = GTA_HOSPITALS.find(h => h.id === selectedHospital)
    setSendStatus('sending')
    // Simulate sending (mock)
    setTimeout(() => {
      setSendStatus('sent')
      console.log(`Report sent to ${hospital.name}`)
      setTimeout(() => {
        setSendStatus(null)
        setShowHospitalSelect(false)
      }, 2000)
    }, 1500)
  }

  // Initialize Speech Recognition
  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.')
      return null
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true  // Keep listening
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    
    return recognition
  }

  // Send message to Gemini and get response
  const getAgentResponse = async (userMessage) => {
    try {
      const response = await fetch(`${GEMINI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          reportContext: report,
          conversationHistory
        })
      })
      
      if (!response.ok) throw new Error('Failed to get agent response')
      
      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Agent response error:', error)
      return "I'm having trouble connecting. Please try again or call 911 if this is an emergency."
    }
  }

  // Convert text to speech using ElevenLabs
  const speakResponse = async (text) => {
    try {
      setIsAgentSpeaking(true)
      setAgentStatus('Agent speaking...')
      
      const response = await fetch(`${ELEVENLABS_URL}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      
      if (!response.ok) throw new Error('TTS failed')
      
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => {
          setIsAgentSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          // Start listening again after agent finishes speaking
          if (isAgentActiveRef.current) {
            setTimeout(() => startListening(), 500) // Small delay before listening again
          }
        }
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('TTS error:', error)
      setIsAgentSpeaking(false)
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.onend = () => {
          setIsAgentSpeaking(false)
          if (isAgentActiveRef.current) {
            setTimeout(() => startListening(), 500)
          }
        }
        speechSynthesis.speak(utterance)
      }
    }
  }

  // Start listening for user speech
  const startListening = () => {
    // Clear any existing silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }
    finalTranscriptRef.current = ''
    
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition()
      if (!recognitionRef.current) return
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        // Accumulate final transcript
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript
        }
        
        // Show both final and interim
        const displayTranscript = finalTranscriptRef.current + interimTranscript
        setCurrentTranscript(displayTranscript)
        
        // Reset silence timeout on any speech activity
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }
        
        // Wait 2 seconds of silence before processing
        if (displayTranscript.trim()) {
          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim() || displayTranscript.trim()) {
              const messageToSend = finalTranscriptRef.current.trim() || displayTranscript.trim()
              // Stop recognition before processing
              if (recognitionRef.current) {
                recognitionRef.current.stop()
              }
              handleUserMessage(messageToSend)
            }
          }, 2000) // 2 second silence before processing
        }
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
        // Don't auto-restart - wait for agent to finish or user to tap
      }
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setAgentStatus('Tap the mic to speak')
        }
      }
    }
    
    try {
      recognitionRef.current.start()
      setIsListening(true)
      setCurrentTranscript('')
      finalTranscriptRef.current = ''
      setAgentStatus('Listening... (speak, then pause when done)')
    } catch (e) {
      console.error('Failed to start recognition:', e)
  }
  }

  // Handle user's spoken message
  const handleUserMessage = async (message) => {
    if (!message.trim()) return
    
    setIsListening(false)
    setAgentStatus('Processing...')
    
    // Add user message to history
    const newHistory = [...conversationHistory, { role: 'user', content: message }]
    setConversationHistory(newHistory)
    
    // Get agent response
    const agentResponse = await getAgentResponse(message)
    
    // Add agent response to history
    setConversationHistory([...newHistory, { role: 'agent', content: agentResponse }])
    
    // Speak the response
    await speakResponse(agentResponse)
  }

  // Main function to start/stop agent
  const speakWithAgent = async () => {
    if (isAgentActive) {
      // Stop the agent
      setIsAgentActive(false)
      setIsListening(false)
      setIsAgentSpeaking(false)
      setAgentStatus('')
      setConversationHistory([])
      setCurrentTranscript('')
      finalTranscriptRef.current = ''
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      speechSynthesis.cancel()
      return
    }
    
    // Start the agent
    // Stop any auto-playing audio first
    if (onStopAutoAudio) {
      onStopAutoAudio()
    }
    
    setIsAgentActive(true)
    setAgentStatus('Connecting to agent...')
    
    // Initial greeting from agent
    const greeting = "Hi, I'm your EMS support agent. I can see the incident report. How can I help you right now?"
    setConversationHistory([{ role: 'agent', content: greeting }])
    
    await speakResponse(greeting)
  }

  const urgencyStyle = getUrgencyColor(report.urgency || report.erSummary?.triageLevel)
  const simVitals = report.simulatedVitals || {}
  const erSummary = report.erSummary || {}
  const imageAnalysis = report.imageAnalysis || {}

  return (
    <div className="max-w-6xl mx-auto">
      <div className="panel p-6 border-2 border-gray-300">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full font-bold text-sm ${urgencyStyle}`}>
              {erSummary.triageLevel || report.urgency?.toUpperCase() || 'UNKNOWN'}
            </div>
            <h2 className="text-xl font-semibold text-text">
              Incident Report #{report.reportId || '000'}
            </h2>
          </div>
          <div className="text-sm text-text-muted">
              {report.timestamp || new Date().toLocaleString()}
          </div>
        </div>

        {/* Emergency Banner */}
        {report.callEmergency && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 mb-4 text-center">
            <span className="text-red-500 font-bold">⚠️ CALL EMERGENCY SERVICES IMMEDIATELY</span>
          </div>
        )}

        {/* Main Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          
          {/* Column 1: Patient Assessment */}
          <div className="panel p-4 bg-surface-2">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Assessment</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-text-dim">Complaint:</span>
                <div className="text-text font-medium">{erSummary.chiefComplaint || 'Not specified'}</div>
              </div>
              <div>
                <span className="text-text-dim">Position:</span>
                <span className="text-text ml-2">{imageAnalysis.position || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-text-dim">Distress:</span>
                <span className={`ml-2 font-medium ${imageAnalysis.distressLevel?.toLowerCase() === 'severe' ? 'text-red-500' : imageAnalysis.distressLevel?.toLowerCase() === 'moderate' ? 'text-orange-500' : 'text-green-500'}`}>
                  {imageAnalysis.distressLevel || 'Unknown'}
                </span>
              </div>
              {imageAnalysis.injuries?.length > 0 && (
                <div>
                  <span className="text-text-dim">Injuries:</span>
                  <div className="text-red-400 text-xs mt-1">{imageAnalysis.injuries.join(', ')}</div>
                </div>
              )}
            </div>
              </div>

          {/* Column 2: Vitals */}
          <div className="panel p-4 bg-surface-2">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3 flex items-center gap-2">
              Vitals <span className="text-text-dim font-normal">(Presage Estimate)</span>
              <img src="/images/image.png" alt="Presage" className="h-4 object-contain" />
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center p-2 bg-surface rounded">
                <div className="text-xl font-bold text-red-400">{simVitals.heartRate || '--'}</div>
                <div className="text-xs text-text-dim">HR bpm</div>
              </div>
              <div className="text-center p-2 bg-surface rounded">
                <div className="text-xl font-bold text-text">{simVitals.respiratoryRate || '--'}</div>
                <div className="text-xs text-text-dim">RR /min</div>
              </div>
              <div className="text-center p-2 bg-surface rounded">
                <div className="text-xl font-bold text-green-400">{simVitals.oxygenSaturation || '--'}</div>
                <div className="text-xs text-text-dim">SpO2 %</div>
              </div>
              <div className="text-center p-2 bg-surface rounded">
                <div className={`text-sm font-bold ${simVitals.shockRisk?.toLowerCase() === 'high' ? 'text-red-400' : simVitals.shockRisk?.toLowerCase() === 'moderate' ? 'text-orange-400' : 'text-green-400'}`}>
                  {simVitals.shockRisk || '--'}
              </div>
                <div className="text-xs text-text-dim">Shock Risk</div>
            </div>
          </div>
        </div>

          {/* Column 3: Actions */}
          <div className="panel p-4 bg-surface-2">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Immediate Actions</h3>
            <ul className="space-y-1 text-sm max-h-32 overflow-y-auto">
              {report.actions?.slice(0, 4).map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-text">{action}</span>
                </li>
              )) || <li className="text-text-dim">No actions specified</li>}
            </ul>
            {report.doNotActions?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs text-red-400 font-medium">DO NOT:</div>
                <ul className="text-xs text-text-dim mt-1">
                  {report.doNotActions.slice(0, 2).map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Summary Row */}
        {(erSummary.suspectedInjuries?.length > 0 || report.incidentReport?.summary) && (
          <div className="panel p-3 bg-surface-2 mb-4 text-sm">
            <span className="text-text-dim">Summary: </span>
            <span className="text-text">
              {report.incidentReport?.summary || erSummary.suspectedInjuries?.join(', ') || 'N/A'}
                  </span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-text-dim text-center mb-4">
          ⚠️ All vitals are simulated for demonstration. Not a medical assessment.
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          {/* ER Playback Button */}
          {videoUrl && (
            <button
              onClick={() => setShowVideoPlayback(true)}
              className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2 border-2 border-red-400"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ER Playback
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '✓ Copied!' : 'Copy Report'}
          </button>
          <button
            onClick={downloadEMSReport}
            className="btn-primary-cyan inline-flex items-center gap-2 text-sm px-4 py-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download EMS Report
          </button>
          
          {/* Send to Hospital Button */}
          <div className="relative">
            <button
              onClick={() => setShowHospitalSelect(!showHospitalSelect)}
              className="btn-primary-cyan inline-flex items-center gap-2 text-sm px-4 py-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? '✓ Sent!' : 'Send EMS Report'}
            </button>
            
            {/* Hospital Dropdown */}
            {showHospitalSelect && !sendStatus && (
              <div className="absolute bottom-full left-0 mb-2 w-80 panel p-4 shadow-xl z-10">
                <div className="text-xs text-text-dim uppercase tracking-wide mb-3 font-medium">Select Hospital</div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {GTA_HOSPITALS.map(h => (
                    <label 
                      key={h.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedHospital === h.id 
                          ? 'bg-cyan-500/10 border border-cyan-500/30' 
                          : 'bg-surface-2 hover:bg-surface-3 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hospital"
                        value={h.id}
                        checked={selectedHospital === h.id}
                        onChange={(e) => setSelectedHospital(e.target.value)}
                        className="accent-cyan-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">{h.name}</div>
                        <div className="text-xs text-text-dim">{h.city} • {h.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={sendToHospital}
                  className="w-full btn-primary-cyan text-sm"
                >
                  Send Report
                </button>
              </div>
            )}
          </div>

          {/* Speak with Agent Button */}
          <button
            onClick={speakWithAgent}
            className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              isAgentActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'btn-primary-cyan'
            }`}
          >
            {isAgentActive ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Call
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Speak with Agent
              </>
            )}
          </button>
        </div>

        {/* Voice Agent Panel */}
        {isAgentActive && (
          <div className="mt-4 panel p-4 border-2 border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : isAgentSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-text">{agentStatus || 'Connected'}</span>
              </div>
              {!isAgentSpeaking && !isListening && (
                <button
                  onClick={startListening}
                  className="btn-primary-cyan text-xs px-3 py-1 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  Tap to Speak
                </button>
              )}
            </div>
            
            {/* Current transcript */}
            {currentTranscript && (
              <div className="text-sm text-text-muted italic mb-2">
                "{currentTranscript}"
              </div>
            )}
            
            {/* Conversation history */}
            <div className="max-h-32 overflow-y-auto space-y-2">
              {conversationHistory.slice(-4).map((msg, i) => (
                <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block px-3 py-1 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-cyan-500/20 text-text' 
                      : 'bg-surface-2 text-text'
                  }`}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Hidden audio element for TTS playback */}
        <audio ref={audioRef} className="hidden" />
      </div>

      {/* Video Playback Modal */}
      {showVideoPlayback && videoUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                ER Recording Playback
              </h3>
              <button
                onClick={() => setShowVideoPlayback(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-black">
              <video 
                src={videoUrl} 
                controls 
                autoPlay
                className="w-full max-h-[60vh] rounded"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Recording from incident #{report.reportId || 'N/A'} • {report.timestamp || new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentReport
