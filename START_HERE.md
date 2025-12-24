# 🚀 How to Start the VideoChat Project

This guide will help you set up and run both the server and client.

---

## 📋 Prerequisites

Before starting, make sure you have installed:

1. **Node.js** (v18 or higher)
2. **MongoDB** (running locally or MongoDB Atlas connection string)
3. **Redis** (running locally - required for BullMQ queue)
4. **FFmpeg** (for audio extraction from videos)
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use Chocolatey: `choco install ffmpeg`
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt-get install ffmpeg`

---

## 🔧 Step 1: Environment Variables Setup

### Server Environment Variables

Create a `.env` file in the `server` directory:

```bash
cd server
```

Create `.env` file with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/videochat
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/videochat

# Redis (optional - defaults shown)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# REDIS_PASSWORD=your_password_if_needed

# Cloudinary (for video storage)
CLOUDDINARY_CLOUD_NAME=your_cloud_name
CLOUDDINARY_API_KEY=your_api_key
CLOUDDINARY_API_SECRET=your_api_secret

# OpenAI (for Whisper transcription)
OPENAI_API_KEY=your_openai_api_key

# Google Generative AI (for summaries)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Server Port (optional - defaults to 3000)
PORT=3000
```

### Client Environment Variables

Create a `.env` file in the `client` directory:

```bash
cd client
```

Create `.env` file with:

```env
VITE_API_URL=http://localhost:3000/api/v1/video
```

---

## 📦 Step 2: Install Dependencies

### Install Server Dependencies

```bash
cd server
npm install
```

### Install Client Dependencies

```bash
cd client
npm install
```

---

## 🗄️ Step 3: Start Required Services

### Start MongoDB

**Windows:**
```bash
# If installed as service, it should start automatically
# Or run manually:
mongod
```

**Mac/Linux:**
```bash
# Using Homebrew (Mac)
brew services start mongodb-community

# Or manually
mongod
```

### Start Redis

**Windows:**
```bash
# If installed, run:
redis-server
```

**Mac:**
```bash
brew services start redis
# Or manually:
redis-server
```

**Linux:**
```bash
sudo systemctl start redis
# Or manually:
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

---

## 🖥️ Step 4: Start the Application

You need **3 terminal windows** to run everything:

### Terminal 1: Start the Server

```bash
cd server
npm run dev
```

You should see:
```
Connected to MongoDB
Server is running on port 3000
```

### Terminal 2: Start the Worker

```bash
cd server
npm run worker
```

You should see:
```
✅ [WORKER] Video worker is ready and listening for jobs
📡 [WORKER] Connected to Redis: 127.0.0.1:6379
```

### Terminal 3: Start the Client

```bash
cd client
npm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

## ✅ Step 5: Verify Everything is Running

1. **Server**: Open http://localhost:3000 - Should show "Server is running"
2. **Client**: Open http://localhost:5173 - Should show the VideoChat UI
3. **Worker**: Check Terminal 2 - Should show worker ready message

---

## 🧪 Step 6: Test the Application

1. **Upload a Video**:
   - Go to "Upload Video" tab
   - Select a video file
   - Enter title, description, and duration
   - Click "Upload Video"
   - Check Terminal 1 (server) and Terminal 2 (worker) for processing logs

2. **Generate Summary**:
   - Go to "Generate Summary" tab
   - Enter the video ID (from upload response)
   - Enter a timestamp (in seconds)
   - Select summary type (short/medium/detailed)
   - Click "Generate Summary"

---

## 📊 Monitoring Logs

### Server Logs (Terminal 1)
- API requests
- Video uploads
- Job enqueuing

### Worker Logs (Terminal 2)
- Job processing
- Transcript generation
- Chunk creation
- Detailed step-by-step progress

### Queue Logs
- Job status changes
- Queue events

---

## 🛠️ Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Make sure Redis is running (`redis-cli ping` should return PONG)

### FFmpeg Not Found
```
Error: spawn ffmpeg ENOENT
```
**Solution**: Install FFmpeg and make sure it's in your PATH

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Change PORT in `.env` or kill the process using port 3000

### Worker Not Processing Jobs
- Check Redis connection
- Verify worker is running in Terminal 2
- Check for errors in worker logs

---

## 📝 Quick Commands Reference

```bash
# Server
cd server
npm run dev          # Start server with nodemon (auto-restart)
npm start            # Start server (production)
npm run worker       # Start worker (production)
npm run dev:worker   # Start worker with nodemon (auto-restart)

# Client
cd client
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 🎯 Project Structure

```
VideoChat/
├── server/
│   ├── controllers/     # API controllers
│   ├── modals/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── queue/           # BullMQ queue config
│   ├── workers/         # Background workers
│   ├── lib/             # Utilities (DB, Cloudinary, Multer)
│   └── index.js         # Server entry point
│
└── client/
    ├── src/
    │   ├── pages/       # React pages
    │   ├── components/  # React components
    │   ├── store/       # Zustand stores
    │   └── api/         # API client
    └── package.json
```

---

## 🚀 You're All Set!

Now you can:
- Upload videos
- Process them (transcription + chunking)
- Generate AI summaries at specific timestamps

Happy coding! 🎉

