@echo off
echo ===================================================================
echo        Setup Guide for Deployment (Windows)
echo ===================================================================
echo.
echo This project has TWO parts:
echo   1. Frontend - Deploy to Vercel
echo   2. Backend - Deploy to Railway (or Render, Heroku, etc.)
echo.
echo =================================================================== 
echo STEP 1: Deploy Backend to Railway
echo ===================================================================
echo.
echo 1. Go to https://railway.app
echo 2. Click "New Project" - "Deploy from GitHub repo"
echo 3. Select this repository
echo 4. Railway will detect it's a Node.js project
echo 5. Wait for deployment to complete
echo 6. Copy the deployed URL (e.g., https://yourapp.railway.app)
echo.
echo =====================================================================
echo STEP 2: Update Frontend Configuration
echo =====================================================================
echo.
echo Go to ./public/config.js and update SERVER_URL with your Railway URL
echo.
echo Example:
echo   SERVER_URL: 'https://gmeet-prod.railway.app'
echo.
echo =====================================================================
echo STEP 3: Deploy Frontend to Vercel
echo =====================================================================
echo.
echo 1. Go to https://vercel.com
echo 2. Click "Add New..." - "Project"
echo 3. Import this GitHub repository
echo 4. Vercel will auto-detect it's a static site
echo 5. Deploy!
echo.
echo =====================================================================
echo STEP 4: Test
echo =====================================================================
echo.
echo Open your Vercel URL and try to:
echo   - Create a new meeting
echo   - Join a meeting
echo.
echo If it still doesn't work:
echo   1. Check browser console (F12) for errors
echo   2. Verify SERVER_URL in config.js is correct
echo   3. Make sure backend server is running on Railway
echo.
pause
