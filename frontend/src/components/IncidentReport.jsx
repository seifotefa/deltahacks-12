import { useState } from 'react'

const IncidentReport = ({ report, vitals }) => {
  const [copied, setCopied] = useState(false)

  const getHeartRateStatus = (hr) => {
    if (hr > 100) return { text: 'High', color: 'text-red-500', emoji: '🔴' }
    if (hr < 60) return { text: 'Low', color: 'text-yellow-500', emoji: '🟡' }
    return { text: 'Normal', color: 'text-green-500', emoji: '🟢' }
  }

  const getRespirationStatus = (rr) => {
    if (rr > 20) return { text: 'Elevated', color: 'text-yellow-500', emoji: '🟡' }
    if (rr < 12) return { text: 'Low', color: 'text-red-500', emoji: '🔴' }
    return { text: 'Normal', color: 'text-green-500', emoji: '🟢' }
  }

  const getConsciousnessStatus = (focus) => {
    if (focus < 30) return 'Unconscious/Disoriented'
    if (focus < 60) return 'Drowsy/Disoriented'
    return 'Alert'
  }

  const copyToClipboard = () => {
    const reportText = `
INCIDENT HANDOFF REPORT #${report.reportId || '402'}
Timestamp: ${report.timestamp || new Date().toLocaleString()}

VITALS (Measured by Presage)
Heart Rate: ${vitals?.heartRate || report.vitals?.heartRate || 'N/A'} BPM ${getHeartRateStatus(vitals?.heartRate || report.vitals?.heartRate).emoji} ${getHeartRateStatus(vitals?.heartRate || report.vitals?.heartRate).text}
Respiration: ${vitals?.breathingRate || report.vitals?.breathingRate || 'N/A'}/min ${getRespirationStatus(vitals?.breathingRate || report.vitals?.breathingRate).emoji} ${getRespirationStatus(vitals?.breathingRate || report.vitals?.breathingRate).text}
Status: ${getConsciousnessStatus(vitals?.focus || report.vitals?.focus || 0)} (Focus Score: ${Math.round(vitals?.focus || report.vitals?.focus || 0)}%)

VISUALS (Verified by Gemini)
Injury: ${report.visuals?.injury || 'No visible injuries detected'}
Bleeding: ${report.visuals?.bleeding || 'None'}
Position: ${report.visuals?.position || 'Not specified'}

IMMEDIATE ACTIONS TAKEN
${report.actions?.join('\n') || 'Assessment completed'}

DIAGNOSIS
${report.diagnosis || 'Under assessment'}
    `.trim()

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const exportJSON = () => {
    const dataStr = JSON.stringify(report, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `incident-report-${report.reportId || Date.now()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const hrStatus = getHeartRateStatus(vitals?.heartRate || report.vitals?.heartRate)
  const rrStatus = getRespirationStatus(vitals?.breathingRate || report.vitals?.breathingRate)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-white/20">
          <h2 className="text-4xl font-bold mb-2">🚨 INCIDENT HANDOFF REPORT</h2>
          <p className="text-2xl text-gray-300">#{report.reportId || '402'}</p>
          <p className="text-gray-400 mt-2">
            Timestamp: {report.timestamp || new Date().toLocaleString()}
          </p>
        </div>

        {/* Vitals Section */}
        <div className="mb-8 bg-gradient-to-r from-red-500/10 to-blue-500/10 rounded-xl p-6 border border-white/10">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            📊 VITALS (Measured by Presage)
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-1">Heart Rate</div>
              <div className={`text-3xl font-bold mb-1 ${hrStatus.color}`}>
                {vitals?.heartRate || report.vitals?.heartRate || 'N/A'} BPM
              </div>
              <div className={`text-lg ${hrStatus.color}`}>
                {hrStatus.emoji} {hrStatus.text}
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-1">Respiration</div>
              <div className={`text-3xl font-bold mb-1 ${rrStatus.color}`}>
                {vitals?.breathingRate || report.vitals?.breathingRate || 'N/A'}/min
              </div>
              <div className={`text-lg ${rrStatus.color}`}>
                {rrStatus.emoji} {rrStatus.text}
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-1">Consciousness Status</div>
              <div className="text-xl font-bold text-white mb-1">
                {getConsciousnessStatus(vitals?.focus || report.vitals?.focus || 0)}
              </div>
              <div className="text-sm text-gray-400">
                Focus Score: {Math.round(vitals?.focus || report.vitals?.focus || 0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Visuals Section */}
        <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            👁️ VISUALS (Verified by Gemini)
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-300 font-semibold">Injury: </span>
              <span className="text-white">{report.visuals?.injury || 'No visible injuries detected'}</span>
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Bleeding: </span>
              <span className={`${report.visuals?.bleeding?.toLowerCase().includes('active') || report.visuals?.bleeding?.toLowerCase().includes('moderate') || report.visuals?.bleeding?.toLowerCase().includes('severe') ? 'text-red-400' : 'text-white'}`}>
                {report.visuals?.bleeding || 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Position: </span>
              <span className="text-white">{report.visuals?.position || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="mb-8 bg-gradient-to-r from-green-500/10 to-yellow-500/10 rounded-xl p-6 border border-white/10">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            📝 IMMEDIATE ACTIONS TAKEN
          </h3>
          <ul className="space-y-2">
            {report.actions && report.actions.length > 0 ? (
              report.actions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span className="text-white">{action}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-400">Assessment completed</li>
            )}
          </ul>
        </div>

        {/* Diagnosis Section */}
        {report.diagnosis && (
          <div className="mb-8 bg-red-500/10 rounded-xl p-6 border border-red-500/30">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              🏥 DIAGNOSIS
            </h3>
            <p className="text-white text-lg">{report.diagnosis}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pt-6 border-t border-white/20">
          <button
            onClick={copyToClipboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            {copied ? '✓ Copied!' : '📋 Copy for EMS'}
          </button>
          <button
            onClick={exportJSON}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            📥 Export JSON
          </button>
        </div>

        {/* Audio Status */}
        {report.audioUrl && (
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">🎵 Audio instructions have been played</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentReport
