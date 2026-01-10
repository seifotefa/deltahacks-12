# 🚨 Touchless Triage - 10-Second Biometric & Visual Analysis

A frontend web application that performs instant "Touchless Triage" using camera-based biometric sensing and visual analysis. Built according to RULES.md specifications.

## 🎯 Features

- **10-Second Biometric Scan**: Real-time heart rate, breathing rate, and focus/consciousness detection using camera feed
- **Visual Analysis**: Simulated Gemini-style visual injury detection
- **Intelligent Diagnosis**: Combines vitals data to detect shock, tachycardia, hyperventilation, and consciousness levels
- **ER-Ready Incident Report**: Comprehensive handoff report with all critical sections from RULES.md:
  - 📊 VITALS (Heart Rate, Respiration, Consciousness Status)
  - 👁️ VISUALS (Injury description, bleeding status, body position)
  - 📝 IMMEDIATE ACTIONS (Shock protocol, wound care, airway management)
  - 🏥 DIAGNOSIS (Combined analysis)
- **Audio Instructions**: Web Speech API provides immediate first aid guidance
- **Export Options**: Copy for EMS or export as JSON

## 🏗️ Architecture

### Frontend Only (React + Vite + Tailwind CSS)
- Camera access and live video preview
- 10-second scanning progress bar with real-time vitals display
- Presage SDK simulation (biometric sensing)
- Gemini simulation (visual analysis)
- Intelligent report generation combining vitals + visuals
- Shock detection logic
- Web Speech API for audio instructions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Camera access on your device
- Modern browser with camera support

### Installation

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:5173`
   - Allow camera permissions when prompted
   - Click "Start 10-Second Scan"

## 📄 Incident Report Format

The generated report includes all sections from RULES.md:

- **🚨 Incident Header**: Report ID and timestamp
- **📊 VITALS**: Heart Rate, Respiration, Consciousness Status (simulated Presage SDK)
- **👁️ VISUALS**: Injury description, bleeding status, body position (simulated Gemini)
- **📝 IMMEDIATE ACTIONS**: Shock protocol, wound care, airway management
- **🏥 DIAGNOSIS**: Combined analysis of vitals and visuals

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 3.4
- **Sensing**: Presage SDK simulation (biometric sensing from camera)
- **Vision**: Simulated Gemini-style analysis
- **Voice**: Web Speech API (text-to-speech)
- **Styling**: Tailwind CSS with gradient backgrounds and animations

## 🎨 UI Features

- Modern dark theme with gradient backgrounds
- Smooth animations and transitions
- Real-time progress indicators
- Responsive design for mobile/tablet
- Professional medical-grade UI styling
- Live camera preview with targeting overlay

## 📝 Implementation Details

- **Biometric Sensing**: Simulates Presage SDK data collection (HR, RR, Focus)
- **Visual Analysis**: Generates mock visual analysis based on vitals patterns
- **Report Generation**: Frontend-only logic that combines all data sources
- **Audio Instructions**: Uses browser's built-in Web Speech API
- **No Backend Required**: Everything runs client-side

## 🔒 Privacy & Security

- All processing happens client-side (no data sent to servers)
- Camera access requires explicit user permission
- No external API calls or data transmission
- Reports are generated locally and can be exported

---

Built following the specifications in `RULES.md` for DeltaHacks 12.
Frontend-only MVP implementation.