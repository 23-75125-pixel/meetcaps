# 🎥 Google Meet Clone - Deployment Guide

## ⚠️ The Problem: Why Your Deployment Isn't Working

When you deployed to Vercel, the meetings stopped working because:

- **Vercel is serverless** - It can't run long-running Node.js servers with WebSocket connections
- **Your backend server isn't running** - Without a backend, the frontend can't connect to create/join meetings
- **Socket.io needs a persistent server** - It requires WebSocket support that Vercel doesn't provide

---

## ✅ The Solution: Deploy Frontend & Backend Separately

### Architecture:
```
┌─────────────────────┐       WebSocket        ┌─────────────────────┐
│  Vercel (Frontend)  │ ◄──────────────────►  │ Railway (Backend)    │
│  - HTML/CSS/JS      │                        │ - Node.js Server    │
│  - Socket.io Client │                        │ - Socket.io Server  │
└─────────────────────┘                        └─────────────────────┘
```

---

## 🚀 Quick Start: 5 Minutes

### 1️⃣ Deploy Backend to Railway (5 minutes)

Railway automatically hosts Node.js apps with WebSocket support.

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub Repo"**
4. Select this repository
5. Railway auto-detects Node.js - just click **Deploy**
6. Wait ~2 minutes for deployment
7. **Copy your Railway URL** (looks like: `https://gmeet-prod.railway.app`)

### 2️⃣ Update Frontend Configuration

Open `public/config.js` and update the `SERVER_URL`:

```javascript
// BEFORE:
SERVER_URL: 'http://localhost:3001'

// AFTER (use YOUR railway URL):
SERVER_URL: 'https://YOUR-RAILWAY-URL.railway.app'
```

### 3️⃣ Push to GitHub & Deploy Frontend to Vercel

```bash
git add .
git commit -m "Update server URL for production"
git push
```

Vercel will auto-deploy when you push to GitHub.

### 4️⃣ Test It!

- Open your Vercel URL
- Try **Create New Meeting** ✓
- Try **Join Meeting** ✓
- Test video/chat features ✓

---

## 🔧 Configuration Details

### Environment Setup

**Development (Local):**
```
- Frontend: http://localhost:8080
- Backend: http://localhost:3001 (automatic in config.js)
```

**Production (Deployed):**
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-project.railway.app`

### Update Server URL

Edit `public/config.js`:

```javascript
const CONFIG = {
    SERVER_URL: 'https://your-railway-url.railway.app'
};
```

---

## 🔗 Alternative Backend Hosting Options

| Platform  | Price | Setup | WebSocket | Recommendation |
|-----------|-------|-------|-----------|-----------------|
| Railway   | Free  | 2 min | ✅        | **Best choice** |
| Render    | Free  | 3 min | ✅        | Good alternative |
| Heroku    | Paid  | 3 min | ✅        | No free tier |
| Fly.io    | Free  | 5 min | ✅        | Works but complex |
| AWS EC2   | $$$   | 10 min| ✅        | Overkill |

**Recommended:** Railway (easiest, fastest, free tier works)

---

## 📱 Running Locally

For development, run both frontend and backend locally:

**Terminal 1 - Backend:**
```bash
cd server/
npm install
npm run dev
# Backend runs at http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
# From root directory
npx http-server public -p 8080
# Frontend runs at http://localhost:8080
```

Then visit `http://localhost:8080` and test meetings locally.

---

## 🐛 Troubleshooting

### ❌ "Cannot connect to server"
- **Check:** Is your backend running on Railway?
- **Fix:** Deploy backend first (Step 1)
- **Verify:** Copy the Railway URL to config.js

### ❌ "Meeting won't load"
- **Check:** Open browser console (F12)
- **Look for:** "Connection error" messages
- **Fix:** Verify SERVER_URL in config.js is correct and has no typos

### ❌ "WebSocket connection fails"
- **Check:** Is CORS configured? (Already done)
- **Check:** Is backend actually running?
- **Fix:** Restart backend on Railway (push new commit to trigger redeploy)

### ❌ "Works on localhost but not on production"
- **Check:** SERVER_URL in config.js (must use HTTPS for Vercel HTTPS)
- **Fix:** Update config.js with Railway HTTPS URL
- **Then:** Redeploy frontend to Vercel

---

## 📝 Configuration Files

### `public/config.js`
Handles server URL for frontend

### `vercel.json`
Tells Vercel to serve static files from `public/` folder

### `.env.example`
Template for environment variables

### `DEPLOYMENT_GUIDE.md`
This file! Full deployment documentation

---

## 🟢 Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Railway URL copied
- [ ] `public/config.js` updated with Railway URL
- [ ] Changes pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Tested "Create Meeting" on Vercel URL
- [ ] Tested "Join Meeting" on Vercel URL
- [ ] Video stream working ✓
- [ ] Chat working ✓

---

## 🎯 Next Steps

1. **Deploy backend first** → Railway
2. **Get your backend URL**
3. **Update config.js**
4. **Deploy frontend** → Vercel
5. **Test everything**

If you're stuck, check the browser console (F12) for error messages - they usually tell you what's wrong!

---

## 📚 Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Socket.io Docs](https://socket.io/docs)
- [WebRTC Basics](https://webrtc.org/getting-started)

