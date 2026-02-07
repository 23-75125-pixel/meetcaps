# 🎥 Google Meet Clone for Capstone Project

A real-time video conferencing application built with **WebRTC**, **Socket.io**, and **Node.js**.

## 🔴 IMPORTANT: Fixing "Cannot Join/Create Meetings" on Deployment

**Are your meetings not working after deploying to Vercel?** 

This is expected! Vercel cannot run long-lived WebSocket servers. **You need to deploy your backend separately.**

👉 **Follow the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for step-by-step instructions.

**Quick summary:**
1. Deploy backend to **Railway** (5 min)
2. Update `public/config.js` with your Railway URL
3. Deploy frontend to **Vercel**
4. Meetings now work! ✓

---

## ⚡ Features

- 📹 Real-time video/audio streaming
- 💬 Live chat messaging
- 👥 Participant list with status
- 🖥️ Screen sharing capabilities
- 📷 Recording functionality
- 🔐 End-to-end encrypted connections
- 📱 Responsive design
- 🎯 Easy meeting links to share

---

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Socket.io (client)
- WebRTC API
- Font Awesome Icons

### Backend
- Node.js + Express
- Socket.io
- CORS support
- UUID for meeting IDs

---

## 📦 Project Structure

```
gmeet/
├── public/                  # Frontend files
│   ├── index.html          # Main page
│   ├── script.js           # Main application logic
│   ├── style.css           # Styling
│   └── config.js           # Server URL configuration
├── server/                  # Backend files
│   ├── server.js           # Express + Socket.io server
│   ├── package.json        # Node dependencies
│   └── package-lock.json
├── DEPLOYMENT_GUIDE.md     # How to deploy (read this!)
├── SETUP.bat               # Setup script (Windows)
├── SETUP.sh                # Setup script (Linux/Mac)
└── README.md               # This file
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 14+ 
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

2. **Start backend server:**
   ```bash
   cd server
   npm run dev
   # Runs on http://localhost:3001
   ```

3. **Start frontend (in new terminal):**
   ```bash
   npx http-server public -p 8080
   # Runs on http://localhost:8080
   ```

4. **Open browser:**
   - Visit `http://localhost:8080`
   - Create a meeting or join with a code
   - Test features!

---

## 🌐 Production Deployment

### The Problem
Vercel ≠ Traditional server. It cannot run WebSocket servers.

### The Solution
Deploy frontend and backend to **different platforms**:

| Component | Platform | Free? |
|-----------|----------|-------|
| Frontend  | Vercel   | ✅    |
| Backend   | Railway  | ✅    |

### Step-by-Step

**See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.**

Quick version:
1. Deploy backend to Railway
2. Copy Railway URL
3. Update `public/config.js` 
4. Deploy frontend to Vercel
5. Done! ✓

---

## 🔧 Configuration

### Frontend Server URL

Edit `public/config.js`:

```javascript
const CONFIG = {
    SERVER_URL: 'http://localhost:3001'  // Change for production
};
```

For production (deployed to Railway):
```javascript
const CONFIG = {
    SERVER_URL: 'https://your-app-name.railway.app'
};
```

### Environment Variables

**Development:**
- No env vars needed - uses defaults

**Production (Vercel):**
- Frontend: Auto-detects from config.js
- No additional setup needed

---

## 🐛 Troubleshooting

### Meetings won't load / "Cannot connect to server"
- **Problem:** Backend not running or wrong URL in config.js
- **Fix:** 
  1. Check SERVER_URL in `public/config.js`
  2. Verify backend is deployed to Railway
  3. Check browser console (F12) for error messages

### WebSocket connection fails
- **Problem:** Backend not responding
- **Fix:** Restart backend or check Railway deployment status

### Works on localhost but not on Vercel
- **Problem:** config.js still points to localhost
- **Fix:** Update config.js with your Railway URL and redeploy

### Video not showing
- **Problem:** Camera permission denied or WebRTC issue
- **Fix:** 
  1. Allow camera when browser asks
  2. Check browser console for errors
  3. Try in an incognito/private window

---

## 📱 How to Use

### Create a Meeting
1. Open the app
2. Enter your name
3. Click **"Create New Meeting"**
4. Share the code with others

### Join a Meeting  
1. Open the app
2. Enter your name
3. Enter the meeting code
4. Click **"Join"**

### During a Meeting
- 🎤 Toggle microphone
- 📹 Toggle camera
- 🖥️ Share your screen
- 💬 Send chat messages
- 👥 View participants

---

## 🔒 Security

- **WebRTC:** Peer-to-peer encrypted connections
- **Socket.io:** Real-time signaling over WebSocket
- **CORS:** Configured for production deployments
- **HTTPS:** Use HTTPS in production (Vercel provides this)

---

## 📚 Learning Resources

- [WebRTC Basics](https://webrtc.org/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Railway Deployment](https://railway.app/)
- [Vercel Deployment](https://vercel.com/)

---

## 🤝 Contributing

This is a capstone project. Feel free to:
- Report bugs
- Suggest features
- Improve code quality
- Optimize performance

---

## 📄 License

ISC License - See package.json

---

## 🎯 Capstone Project Notes

This app was created for the capstone project with the following goals:
- Learn WebRTC technology
- Understand real-time communications
- Build a scalable multi-user application
- Deploy to production

---

## ❓ FAQs

**Q: Can I use this in production?**  
A: Yes! Follow the deployment guide to set it up properly.

**Q: How many people can join a meeting?**  
A: Currently supports up to 50 participants (limited by browser capabilities).

**Q: Is it free to run?**  
A: Yes! Railway and Vercel both have free tiers.

**Q: Can I modify the code?**  
A: Absolutely! It's open source for learning.

**Q: Where do I deploy the backend?**  
A: Use Railway, Render, or similar. See DEPLOYMENT_GUIDE.md

---

## 🆘 Still Having Issues?

1. **Read:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Check:** Browser console (F12) for errors
3. **Verify:** Server URL in `public/config.js`
4. **Confirm:** Backend is deployed and running
5. **Test:** With correct URLs and fresh deployment

---

**Last Updated:** February 2026  
**Status:** Ready for Capstone Presentation ✅
