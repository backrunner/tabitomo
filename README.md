<div align="center">
  <img src="./public/icons/buddy.png" alt="tabitomo" width="120" height="120">
  <h1>tabitomo (旅友)</h1>
  <p><strong>AI-Powered Multilingual Translator - Your Travel Companion</strong></p>

  [English](./README.md) | [中文](./README.zh-CN.md)

  [![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61dafb.svg)](https://reactjs.org/)
  [![Powered by AI](https://img.shields.io/badge/Powered%20by-AI-ff6b6b.svg)](https://github.com/vercel/ai)
</div>

---

## 🌟 Features

- **🎙️ Multi-Input Translation**
  - Text input with auto-translation
  - Voice input with speech recognition
  - Image translation with OCR support
  - Camera capture for instant translation

- **🤖 AI-Powered**
  - Supports multiple AI providers (OpenAI, custom endpoints)
  - Advanced VLM (Vision-Language Model) for image translation
  - High-quality OCR with coordinate-based text overlay
  - Smart caching for faster repeat translations

- **🌍 Multilingual Support**
  - Chinese, Japanese, English, Korean, French, Spanish, and more
  - Auto-detection of source language
  - Furigana support for Japanese text
  - Text-to-speech for translation results

- **📱 Progressive Web App**
  - Installable on mobile and desktop
  - Offline-capable with service worker
  - Optimized PWA assets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (managed via corepack)

### Installation

```bash
# Enable corepack (if not already enabled)
corepack enable

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Environment Setup

Create a `.env` file or configure settings in the app:

1. **General AI Settings**
   - API Key
   - Endpoint URL
   - Model Name

2. **Image OCR Settings**
   - Provider (Qwen VL or custom)
   - API Key and Endpoint
   - Model Name

3. **Audio Transcription** (Optional)
   - SiliconFlow API for enhanced speech recognition

## 🎯 Usage

### Text Translation
1. Select source and target languages
2. Type or speak your text
3. Get instant AI-powered translation
4. Listen to pronunciation with TTS

### Image Translation
1. Switch to camera mode
2. Upload an image or capture with camera
3. Choose between:
   - **OCR Mode**: Overlay translated text on image
   - **Text Only Mode**: Extract and translate text using VLM

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: UnoCSS (Tailwind-compatible)
- **UI Components**: shadcn/ui
- **AI SDK**: Vercel AI SDK
- **PWA**: vite-plugin-pwa
- **Icons**: Lucide React
- **Routing**: React Router
- **OCR/VLM**: OpenAI-compatible APIs

## 📦 Project Structure

```
tabitomo/
├── public/              # Static assets
│   ├── icons/          # App icons and PWA assets
│   └── kuromoji/       # Japanese text processing dictionary
├── src/
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   │   ├── translation.ts      # Translation logic
│   │   ├── imageOcr.ts         # OCR and VLM
│   │   ├── japanese.ts         # Furigana generation
│   │   └── settings.ts         # Settings management
│   ├── App.tsx         # Main app component
│   └── index.tsx       # Entry point
├── LICENSE             # Apache 2.0 License
├── NOTICE              # Proprietary assets notice
└── package.json        # Dependencies
```

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](./LICENSE) file for details.

### Proprietary Assets

The "Buddy" mascot icon (`public/icons/buddy.png`, `public/icon.png`) is proprietary and **all rights reserved**. See [NOTICE](./NOTICE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💖 Acknowledgments

- Buddy mascot design - © 2025 tabitomo
- Powered by [Vercel AI SDK](https://sdk.vercel.ai/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Built with [Vite](https://vitejs.dev/) and [React](https://react.dev/)

---

<div align="center">
  Made with ❤️ by the tabitomo team
</div>
