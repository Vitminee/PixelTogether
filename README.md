# PixelTogether 🎨

A collaborative real-time pixel art canvas inspired by r/place, where users can work together to create collective artwork by placing pixels on a shared canvas.

## ✨ Features

- **Multiple Canvas Sizes**: Choose from 64x64, 128x128, 256x256, or 512x512 pixel canvases
- **Real-time Collaboration**: See other users' pixels appear instantly as they place them
- **5-Second Cooldown**: Anti-spam protection with a 5-second cooldown between pixel placements
- **Optimized Performance**: HTML5 Canvas rendering with smooth zoom and pan controls
- **16-Color Palette**: Curated color selection for vibrant pixel art
- **Recent Changes Feed**: Track the latest pixel placements from all users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Username System**: Set your artist name to get credit for your contributions
- **Canvas Statistics**: View total edits, unique artists, and online user count

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vitminee/PixelTogether.git
   cd PixelTogether
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Configure your database connection in `.env.local`

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript
- **Styling**: TailwindCSS v4
- **Database**: Neon PostgreSQL (serverless)
- **Analytics**: Vercel Analytics & Speed Insights
- **Fonts**: Geist Sans & Geist Mono
- **Build Tool**: Turbopack for fast development

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [size]/            # Dynamic canvas size routes
│   ├── api/               # API endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── CanvasPage.tsx     # Main canvas interface
│   ├── OptimizedCanvas.tsx # Canvas rendering engine
│   ├── ColorPalette.tsx   # Color selection
│   ├── CooldownTimer.tsx  # Placement timer
│   └── ...               # Other UI components
└── hooks/                # Custom React hooks
    ├── useCanvasSync.ts   # Real-time canvas synchronization
    ├── useCooldown.ts     # Cooldown management
    └── useResponsive.ts   # Responsive design values
```

## 🎮 How to Use

1. **Select Canvas Size**: Choose your preferred canvas size from the dropdown
2. **Pick a Color**: Click on any color from the palette on the left
3. **Place Pixels**: Click anywhere on the canvas to place your colored pixel
4. **Wait for Cooldown**: After placing a pixel, wait 5 seconds before placing another
5. **Zoom & Pan**: Use mouse wheel to zoom, Shift+scroll or middle-click to pan
6. **Set Username**: Enter your artist name to get credit for your contributions

## 🎨 Canvas Controls

- **Left Click**: Place pixel
- **Mouse Wheel**: Zoom in/out
- **Shift + Mouse Wheel**: Pan canvas
- **Middle Click + Drag**: Pan canvas
- **Zoom Controls**: Use the +/- buttons or home button to reset view

## 🔧 Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## 🌐 API Endpoints

- `GET /api/canvas` - Fetch canvas data for specific size
- `POST /api/canvas` - Place a pixel on the canvas
- WebSocket connections for real-time updates

## 📊 Performance Features

- **Optimized Rendering**: HTML5 Canvas instead of SVG for better performance on large canvases
- **Viewport Culling**: Only renders visible pixels during zoom/pan operations
- **Debounced Updates**: Smooth real-time synchronization without overwhelming the client
- **Responsive Loading**: Adaptive UI scaling based on screen size

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 💖 Support

If you enjoy PixelTogether, consider supporting the project:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/vitmine)

## 🐛 Issues & Feedback

Found a bug or have a suggestion? Please [open an issue](https://github.com/Vitminee/PixelTogether/issues) on GitHub.

---

**Made with ❤️ by the PixelTogether community**