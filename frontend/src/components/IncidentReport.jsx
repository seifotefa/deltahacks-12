import { useState } from 'react'

const IncidentReport = ({ report, vitals }) => {
  const [copied, setCopied] = useState(false)

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical': return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' }
      case 'high': return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' }
      case 'medium': case 'urgent': return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' }
      default: return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' }
    }
  }

  const getShockRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'text-danger'
      case 'moderate': return 'text-yellow-500'
      default: return 'text-success'
    }
  }

  const copyToClipboard = () => {
    const erSummary = report.erSummary || {}
    const simVitals = report.simulatedVitals || {}
    const incident = report.incidentReport || {}
    
    const reportText = `
INCIDENT HANDOFF REPORT #${report.reportId || '000'}
Timestamp: ${report.timestamp || new Date().toLocaleString()}

═══════════════════════════════════════
ER TRIAGE SUMMARY
═══════════════════════════════════════
Chief Complaint: ${erSummary.chiefComplaint || 'Not specified'}
Suspected Injuries: ${erSummary.suspectedInjuries?.join(', ') || 'None identified'}
Triage Level: ${erSummary.triageLevel || 'Unknown'}
Vital Summary: ${erSummary.vitalSummary || 'N/A'}

═══════════════════════════════════════
SIMULATED VITALS (Demo Only)
═══════════════════════════════════════
Heart Rate: ${simVitals.heartRate || 'N/A'} BPM
Respiratory Rate: ${simVitals.respiratoryRate || 'N/A'} /min
Oxygen Saturation: ${simVitals.oxygenSaturation || 'N/A'}%
Estimated Blood Loss: ${simVitals.bloodLoss || 'None'}
Stress Level: ${simVitals.stressLevel || 'Unknown'}
Shock Risk: ${simVitals.shockRisk || 'Unknown'}

═══════════════════════════════════════
IMAGE ANALYSIS
═══════════════════════════════════════
Visible Injuries: ${report.imageAnalysis?.injuries?.join(', ') || 'None detected'}
Body Position: ${report.imageAnalysis?.position || 'Not determined'}
Distress Level: ${report.imageAnalysis?.distressLevel || 'Unknown'}
Environmental Risks: ${report.imageAnalysis?.environmentalRisks?.join(', ') || 'None identified'}

═══════════════════════════════════════
IMMEDIATE ACTIONS
═══════════════════════════════════════
${report.actions?.map((a, i) => `${i + 1}. ${a}`).join('\n') || 'None specified'}

DO NOT:
${report.doNotActions?.map((a, i) => `• ${a}`).join('\n') || 'No restrictions'}

Call Emergency Services: ${report.callEmergency ? 'YES - RECOMMENDED' : 'Not required at this time'}

═══════════════════════════════════════
INCIDENT REPORT
═══════════════════════════════════════
Type: ${incident.type || 'Not specified'}
Summary: ${incident.summary || 'N/A'}
Location: ${incident.location || 'Not specified'}
Time: ${incident.time || 'Not specified'}
Recommended Follow-up: ${incident.followUp || 'None'}

═══════════════════════════════════════
DISCLAIMER
═══════════════════════════════════════
${report.disclaimer || 'All vitals are simulated for demonstration purposes.'}
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

  const urgencyStyle = getUrgencyColor(report.urgency || report.erSummary?.triageLevel)
  const simVitals = report.simulatedVitals || {}
  const erSummary = report.erSummary || {}
  const imageAnalysis = report.imageAnalysis || {}
  const incident = report.incidentReport || {}

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="panel p-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-8 h-8 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-3xl font-semibold tracking-tight text-text">
              INCIDENT HANDOFF REPORT
            </h2>
          </div>
          <div className="inline-block px-4 py-1.5 bg-text text-white rounded-full font-semibold text-lg tracking-tight mb-4">
            #{report.reportId || '000'}
          </div>
          <div className="text-sm text-text-muted mt-2">
            {report.timestamp || new Date().toLocaleString()}
          </div>
        </div>

        {/* Urgency Banner */}
        {report.callEmergency && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-center">
            <div className="text-red-500 font-bold text-lg flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              CALL EMERGENCY SERVICES IMMEDIATELY
            </div>
          </div>
        )}

        {/* Triage Level */}
        <div className={`${urgencyStyle.bg} ${urgencyStyle.border} border rounded-lg p-4 text-center`}>
          <div className="text-sm text-text-muted uppercase tracking-wide mb-1">Triage Level</div>
          <div className={`text-2xl font-bold ${urgencyStyle.text}`}>
            {erSummary.triageLevel || report.urgency?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {/* ER Summary */}
      <div className="panel p-6">
        <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          ER TRIAGE SUMMARY
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Chief Complaint</div>
            <div className="text-text font-medium">{erSummary.chiefComplaint || 'Not specified'}</div>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Vital Summary</div>
            <div className="text-text">{erSummary.vitalSummary || 'N/A'}</div>
          </div>
          <div className="panel p-4 md:col-span-2">
            <div className="text-xs text-text-dim uppercase mb-2">Suspected Injuries</div>
            <div className="flex flex-wrap gap-2">
              {erSummary.suspectedInjuries?.length > 0 ? (
                erSummary.suspectedInjuries.map((injury, i) => (
                  <span key={i} className="px-3 py-1 bg-surface-3 rounded-full text-sm text-text">
                    {injury}
                  </span>
                ))
              ) : (
                <span className="text-text-dim">None identified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Vitals */}
      <div className="panel p-6">
        <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          SIMULATED VITALS
          <span className="text-xs text-text-dim font-normal ml-2">(Demo Only)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">Heart Rate</div>
            <div className="text-2xl font-bold text-danger">{simVitals.heartRate || 'N/A'}</div>
            <div className="text-xs text-text-dim">BPM</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">Respiratory</div>
            <div className="text-2xl font-bold text-text">{simVitals.respiratoryRate || 'N/A'}</div>
            <div className="text-xs text-text-dim">/min</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">O₂ Saturation</div>
            <div className="text-2xl font-bold text-success">{simVitals.oxygenSaturation || 'N/A'}</div>
            <div className="text-xs text-text-dim">%</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">Blood Loss</div>
            <div className={`text-lg font-bold ${simVitals.bloodLoss === 'severe' ? 'text-danger' : simVitals.bloodLoss === 'moderate' ? 'text-orange-500' : 'text-success'}`}>
              {simVitals.bloodLoss || 'None'}
            </div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">Stress Level</div>
            <div className="text-lg font-bold text-text">{simVitals.stressLevel || 'Unknown'}</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-xs text-text-dim uppercase mb-1">Shock Risk</div>
            <div className={`text-lg font-bold ${getShockRiskColor(simVitals.shockRisk)}`}>
              {simVitals.shockRisk || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Image Analysis */}
      <div className="panel p-6">
        <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          IMAGE ANALYSIS
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-2">Visible Injuries</div>
            <div className="flex flex-wrap gap-2">
              {imageAnalysis.injuries?.length > 0 ? (
                imageAnalysis.injuries.map((injury, i) => (
                  <span key={i} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm">
                    {injury}
                  </span>
                ))
              ) : (
                <span className="text-success">None detected</span>
              )}
            </div>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Body Position</div>
            <div className="text-text font-medium">{imageAnalysis.position || 'Not determined'}</div>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Distress Level</div>
            <div className={`font-medium ${imageAnalysis.distressLevel?.toLowerCase() === 'severe' ? 'text-danger' : imageAnalysis.distressLevel?.toLowerCase() === 'moderate' ? 'text-orange-500' : 'text-success'}`}>
              {imageAnalysis.distressLevel || 'Unknown'}
            </div>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-2">Environmental Risks</div>
            <div className="flex flex-wrap gap-2">
              {imageAnalysis.environmentalRisks?.length > 0 ? (
                imageAnalysis.environmentalRisks.map((risk, i) => (
                  <span key={i} className="px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-sm">
                    {risk}
                  </span>
                ))
              ) : (
                <span className="text-success">None identified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Health Guidance */}
      <div className="panel p-6">
        <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          HEALTH GUIDANCE
        </h3>
        
        {/* Immediate Actions */}
        <div className="mb-6">
          <div className="text-sm font-medium text-success mb-3 uppercase">Immediate Actions</div>
          <ul className="space-y-2">
            {report.actions?.length > 0 ? (
              report.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 panel p-3">
                  <span className="text-success mt-0.5">✓</span>
                  <span className="text-text">{action}</span>
                </li>
              ))
            ) : (
              <li className="text-text-dim panel p-3">No specific actions required</li>
            )}
          </ul>
        </div>

        {/* Do Not */}
        {report.doNotActions?.length > 0 && (
          <div>
            <div className="text-sm font-medium text-danger mb-3 uppercase">Do NOT</div>
            <ul className="space-y-2">
              {report.doNotActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 panel p-3 border-danger/20">
                  <span className="text-danger mt-0.5">✗</span>
                  <span className="text-text">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Incident Report */}
      <div className="panel p-6">
        <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2 text-text">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          INCIDENT REPORT
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Incident Type</div>
            <div className="text-text font-medium">{incident.type || 'Not specified'}</div>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-text-dim uppercase mb-1">Location</div>
            <div className="text-text">{incident.location || 'Not specified'}</div>
          </div>
          <div className="panel p-4 md:col-span-2">
            <div className="text-xs text-text-dim uppercase mb-1">Summary</div>
            <div className="text-text">{incident.summary || 'N/A'}</div>
          </div>
          <div className="panel p-4 md:col-span-2">
            <div className="text-xs text-text-dim uppercase mb-1">Recommended Follow-up</div>
            <div className="text-text">{incident.followUp || 'None specified'}</div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="panel p-4 bg-surface-2 text-center">
        <div className="text-xs text-text-dim">
          ⚠️ {report.disclaimer || 'All vitals are simulated for demonstration purposes and are not medical measurements.'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
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
    </div>
  )
}

export default IncidentReport
