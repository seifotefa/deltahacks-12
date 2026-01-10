import { useState } from 'react'

const IncidentReport = ({ report, vitals }) => {
  const [copied, setCopied] = useState(false)

  const getHeartRateStatus = (hr) => {
    if (hr > 100) return { text: 'High', color: 'text-danger', emoji: '🔴' }
    if (hr < 60) return { text: 'Low', color: 'text-text', emoji: '🟡' }
    return { text: 'Normal', color: 'text-success', emoji: '🟢' }
  }

  const getRespirationStatus = (rr) => {
    if (rr > 20) return { text: 'Elevated', color: 'text-text', emoji: '🟡' }
    if (rr < 12) return { text: 'Low', color: 'text-danger', emoji: '🔴' }
    return { text: 'Normal', color: 'text-success', emoji: '🟢' }
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
    <div className="max-w-5xl mx-auto">
      <div className="panel p-8 hover:bg-surface-2 transition-colors">
        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b border-border -mt-8 -mx-8 pt-8 px-8 bg-surface-2">
          <div className="flex items-center justify-center gap-3 mb-5">
            <svg className="w-8 h-8 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-3xl font-semibold tracking-tight text-text">
              INCIDENT HANDOFF REPORT
            </h2>
          </div>
          <div className="inline-block px-4 py-1.5 bg-text text-white rounded-full font-semibold text-lg tracking-tight mb-4">
            #{report.reportId || '402'}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-text-muted">
            <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              {report.timestamp || new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Vitals Section */}
        <div className="mb-8 panel p-6">
          <h3 className="text-xl font-semibold tracking-tight mb-6 flex items-center gap-2 text-text">
            <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="tracking-tight">VITALS (Measured by Presage)</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-danger" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Heart Rate</div>
              </div>
              <div className={`text-3xl font-semibold tracking-tight mb-1 ${hrStatus.color}`}>
                {vitals?.heartRate || report.vitals?.heartRate || 'N/A'}
              </div>
              <div className="text-xs text-text-dim mb-3">BPM</div>
              <div 
                className={`text-xs font-medium px-3 py-1 rounded-full inline-block border ${hrStatus.color}`}
                style={{
                  backgroundColor: hrStatus.color === 'text-danger' ? 'rgba(220, 38, 38, 0.08)' : hrStatus.color === 'text-success' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                  borderColor: hrStatus.color === 'text-danger' ? 'rgba(220, 38, 38, 0.2)' : hrStatus.color === 'text-success' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(249, 115, 22, 0.2)'
                }}
              >
                {hrStatus.emoji} {hrStatus.text}
              </div>
            </div>
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Respiration</div>
              </div>
              <div className={`text-3xl font-semibold tracking-tight mb-1 ${rrStatus.color}`}>
                {vitals?.breathingRate || report.vitals?.breathingRate || 'N/A'}
              </div>
              <div className="text-xs text-text-dim mb-3">/min</div>
              <div 
                className={`text-xs font-medium px-3 py-1 rounded-full inline-block border ${rrStatus.color}`}
                style={{
                  backgroundColor: rrStatus.color === 'text-danger' ? 'rgba(220, 38, 38, 0.08)' : rrStatus.color === 'text-success' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                  borderColor: rrStatus.color === 'text-danger' ? 'rgba(220, 38, 38, 0.2)' : rrStatus.color === 'text-success' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(249, 115, 22, 0.2)'
                }}
              >
                {rrStatus.emoji} {rrStatus.text}
              </div>
            </div>
            <div className="panel p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs font-medium text-text-dim uppercase tracking-wide">Consciousness</div>
              </div>
              <div className="text-xl font-semibold tracking-tight text-text mb-2">
                {getConsciousnessStatus(vitals?.focus || report.vitals?.focus || 0)}
              </div>
              <div className="text-xs text-text-dim mb-3">
                Focus Score: <span className="text-success font-medium">{Math.round(vitals?.focus || report.vitals?.focus || 0)}%</span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-1.5 border border-border">
                <div 
                  className="bg-success h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round(vitals?.focus || report.vitals?.focus || 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Visuals Section */}
        <div className="mb-8 panel p-6">
          <h3 className="text-xl font-semibold tracking-tight mb-6 flex items-center gap-2 text-text">
            <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="tracking-tight">VISUALS (Verified by Gemini)</span>
          </h3>
          <div className="space-y-4">
            <div className="panel p-4 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-text-muted text-sm font-medium">Injury: </span>
              </div>
              <span className="text-text">{report.visuals?.injury || 'No visible injuries detected'}</span>
            </div>
            <div className="panel p-4 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-text-muted text-sm font-medium">Bleeding: </span>
              </div>
              <span className={`${report.visuals?.bleeding?.toLowerCase().includes('active') || report.visuals?.bleeding?.toLowerCase().includes('moderate') || report.visuals?.bleeding?.toLowerCase().includes('severe') ? 'text-danger' : 'text-success'}`}>
                {report.visuals?.bleeding || 'None'}
              </span>
            </div>
            <div className="panel p-4 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-text-muted text-sm font-medium">Position: </span>
              </div>
              <span className="text-text">{report.visuals?.position || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="mb-8 panel p-6">
          <h3 className="text-xl font-semibold tracking-tight mb-6 flex items-center gap-2 text-text">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tracking-tight">IMMEDIATE ACTIONS TAKEN</span>
          </h3>
          <ul className="space-y-3">
            {report.actions && report.actions.length > 0 ? (
              report.actions.map((action, index) => (
                <li key={index} className="flex items-start panel p-4 hover:bg-surface-2 transition-colors">
                  <span className="text-success mr-3 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-text flex-1">{action}</span>
                </li>
              ))
            ) : (
              <li className="text-text-dim panel p-4">Assessment completed</li>
            )}
          </ul>
        </div>

        {/* Diagnosis Section */}
        {report.diagnosis && (
          <div className="mb-8 panel p-6 bg-surface-2">
            <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
              <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span className="tracking-tight">CLINICAL DIAGNOSIS</span>
            </h3>
            <p className="text-text panel p-4 leading-relaxed">{report.diagnosis}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border -mx-8 px-8 pb-4 bg-surface-2">
          <button
            onClick={copyToClipboard}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '✓ Copied!' : 'Copy for EMS'}
          </button>
          <button
            onClick={exportJSON}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
        </div>

        {/* Audio Status */}
        {report.audioUrl && (
          <div className="mt-6 text-center">
            <p className="text-text-dim text-sm">🎵 Audio instructions have been played</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentReport
