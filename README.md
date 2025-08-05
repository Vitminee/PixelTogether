# PixelTogether 🎨

A collaborative real-time pixel art canvas inspired by r/place, where users can work together to create collective artwork by placing pixels on a shared canvas.

## ✨ Features

- **Multiple Canvas Sizes**: Choose from 64x64, 128x128, 256x256, or 512x512 pixel canvases
- **Real-time Collaboration**: See other users' pixels appear instantly as they place them
- **10-Minute Cooldown**: Anti-spam protection with cooldown system and visual timer
- **Optimized Performance**: HTML5 Canvas rendering with smooth zoom and pan controls
- **16-Color Palette**: Curated color selection for vibrant pixel art
- **Recent Changes Feed**: Live-updating pixel placement history with timestamps
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Username System**: Set your artist name to get credit for your contributions
- **Canvas Statistics**: View total edits, unique artists, and real-time online count
- **Enterprise Security**: Zero log injection vulnerabilities with secure logging
- **Debug Mode**: Comprehensive debugging tools for development (disabled in production)
- **Auto-reconnection**: Resilient WebSocket connections with automatic retry logic

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Go 1.21+
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vitminee/PixelTogether.git
   cd PixelTogether
   ```

2. **Set up backend**
   ```bash
   cd backend
   go mod tidy
   ```

3. **Set up environment variables**
   
   **Backend** - Create a `.env` file in the backend directory:
   ```bash
   DATABASE_URL=postgres://username:password@localhost/pixeltogether?sslmode=disable
   PORT=8080
   DEBUG=true  # Enable debug logging (set to false for production)
   ```
   
   **Frontend** - Create a `.env.local` file in the frontend directory:
   ```bash
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
   NEXT_PUBLIC_DEBUG=true  # Enable debug logging (optional)
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

5. **Start the backend server**
   ```bash
   cd backend
   go run .
   ```
   Backend runs on http://localhost:8080 (configurable via PORT env var)

6. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on http://localhost:3000

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: React 19, TypeScript
- **Styling**: TailwindCSS v4
- **Fonts**: Geist Sans & Geist Mono
- **Build Tool**: Turbopack for fast development

### Backend
- **Language**: Go 1.21+
- **WebSocket**: Gorilla WebSocket
- **Database**: PostgreSQL
- **Real-time**: WebSocket-based hub pattern

## 📁 Project Structure

```
pixeltogether/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   │   ├── [size]/   # Dynamic canvas size routes
│   │   │   ├── globals.css # Global styles
│   │   │   ├── layout.tsx # Root layout
│   │   │   └── page.tsx  # Homepage
│   │   ├── components/   # React components
│   │   │   ├── CanvasPage.tsx # Main canvas interface
│   │   │   ├── OptimizedCanvas.tsx # Canvas rendering engine
│   │   │   ├── ColorPalette.tsx # Color selection
│   │   │   ├── CooldownTimer.tsx # Placement timer
│   │   │   └── ...       # Other UI components
│   │   └── hooks/        # Custom React hooks
│   │       ├── useCanvasSync.ts # Real-time canvas synchronization
│   │       ├── useCooldown.ts # Cooldown management
│   │       └── useWebSocket.ts # WebSocket connection
│   └── package.json      # Frontend dependencies
└── backend/               # Go backend server
    ├── internal/
    │   ├── database/     # Database operations
    │   ├── types/        # Type definitions
    │   └── websocket/    # WebSocket hub and client handlers
    ├── main.go           # Server entry point
    └── go.mod            # Go dependencies
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

### Frontend (in /frontend directory)
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

### Backend (in /backend directory)
```bash
# Run development server
go run .

# Build binary
go build -o pixeltogether.exe .

# Run tests
go test ./...

# Install dependencies
go mod tidy
```

## 🌐 WebSocket API

The backend provides a WebSocket endpoint at `ws://localhost:8080/ws` for real-time communication:

### Message Types

- **`place_pixel`** - Place a pixel on the canvas
- **`get_canvas`** - Request canvas data for a specific size
- **`check_cooldown`** - Check user's placement cooldown status
- **`update_username`** - Update user's display name

### Real-time Updates

- **`pixel_update`** - Broadcast when any user places a pixel
- **`stats_update`** - Live canvas statistics (total pixels, unique users)
- **`recent_changes`** - Updated list of recent pixel placements
- **`online_count`** - Current number of connected users

## 📊 Performance Features

- **Go Backend**: High-performance WebSocket server with concurrent client handling  
- **Sparse Pixel Storage**: Only stores non-white pixels in database for efficiency
- **HTML5 Canvas Rendering**: Optimized rendering instead of SVG for large canvases
- **Real-time Hub Pattern**: Efficient WebSocket message broadcasting to all clients
- **PostgreSQL Indexing**: Optimized database queries with proper indexing
- **Non-blocking Operations**: Goroutine-based architecture prevents client blocking

## 🔒 Security Features

- **Zero Log Injection**: All user input is sanitized and never logged directly
- **Secure Logging**: Production logs contain only safe, validated data
- **Input Validation**: Comprehensive validation on both frontend and backend
- **CORS Protection**: Configurable origin restrictions for WebSocket connections
- **Rate Limiting**: Cooldown system prevents spam and abuse
- **Safe Error Handling**: Error messages don't expose internal system details

## 🐛 Debugging & Development

### Debug Mode

Enable comprehensive logging for development:

**Backend:**
```bash
DEBUG=true go run .
```

**Frontend:**
```bash
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Debug Features

- **Detailed WebSocket Logs**: Connection events, message types, and state changes
- **Canvas Operations**: Pixel placement tracking and validation steps
- **Database Operations**: Query execution and result verification
- **Performance Metrics**: Connection timing and retry attempts
- **Error Tracing**: Detailed error context for troubleshooting

### Production Deployment

For production, ensure debug logging is disabled:

```bash
# Backend
DEBUG=false
# or simply omit the DEBUG variable

# Frontend
# Omit NEXT_PUBLIC_DEBUG or set to false
```

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