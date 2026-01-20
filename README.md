# 🚨 Frontline 
![Logo](frontend/images/Logo.png)
- Frontline turns bystanders into first responders.

## 🎯 Features

- **10-Second Biometric Scan**: Real-time heart rate, breathing rate, and focus/consciousness detection using camera feed
- **Visual Analysis**: AI-powered visual injury detection using Google Gemini Vision
- **Intelligent Diagnosis**: Combines vitals data to detect shock, tachycardia, hyperventilation, and consciousness levels
- **ER-Ready Incident Report**: Comprehensive handoff report with all critical sections from RULES.md:
  - 📊 VITALS (Heart Rate, Respiration, Consciousness Status)
  - 👁️ VISUALS (Injury description, bleeding status, body position)
  - 📝 IMMEDIATE ACTIONS (Shock protocol, wound care, airway management)
  - 🏥 DIAGNOSIS (Combined analysis)
- **Audio Instructions**: ElevenLabs text-to-speech provides immediate first aid guidance
- **Export Options**: Copy for EMS or export as JSON
![dashboard](frontend/public/images/frontdashboard.jpg)
## 🏗️ Architecture

### Full-Stack System

**Frontend (React + Vite + Tailwind CSS)**
- Camera access and live video preview
- 10-second scanning progress bar with real-time vitals display
- Video recording and upload
- Report display and interaction
- Audio playback

**Presage Engine (C++ )**
- Processes video to extract vital signs using Presage SmartSpectra SDK
- Returns heart rate, breathing rate, and consciousness indicators
- Runs on port 8080

**Gemini Service (Node.js + Express)**
- Receives video and vitals data from frontend
- Extracts frames from video using ffmpeg
- Analyzes images using Google Gemini Vision API
- Generates structured injury analysis
- Runs on port 3000

**ElevenLabs Service (Node.js + Express)**
- Converts text to speech using ElevenLabs API
- Generates audio instructions for first aid
- Runs on port 3001
![demo](frontend/public/images/frontvideo.jpg)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Docker Desktop installed and running
- Camera access on your device
- Modern browser with camera support
- API Keys:
  - Presage API Key (for biometric sensing)
  - Google Gemini API Key (for visual analysis)
  - ElevenLabs API Key (for text-to-speech)
 

## 📝 Implementation Details

- **Biometric Sensing**: Simulates Presage SDK data collection (HR, RR, Focus)
- **Visual Analysis**: Generates mock visual analysis based on vitals patterns
- **Report Generation**: Frontend-only logic that combines all data sources
- **Audio Instructions**: Uses ElevenLabs API

## 🔒 Privacy & Security

- Camera access requires explicit user permission
- Reports are generated locally and can be exported

### Installation

1. **Start Presage Engine**ash
   cd presage-engine
   export PRESAGE_API_KEY="your-presage-api-key"
   docker-compose up --build
   
