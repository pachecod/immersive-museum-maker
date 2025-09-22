# 🚀 Immersive Museum VR - Render Deployment Guide

Your Immersive Museum VR Experience is now ready for deployment on Render.com! This guide will walk you through the complete process.

## ✅ What's Already Set Up

Your project has been configured with:
- ✅ Express.js server (`server.js`)
- ✅ Production-ready `package.json` with start script
- ✅ Render configuration (`render.yaml`)
- ✅ Git repository initialized
- ✅ All files committed and ready

## 📋 Step-by-Step Deployment Process

### Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click "New repository"** (green button)
3. **Repository settings:**
   - Name: `immersivemuseum-vr` (or your preferred name)
   - Description: "Immersive Museum VR Experience for Syracuse University Agriquest"
   - Visibility: Public (required for free Render hosting)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. **Click "Create repository"**

### Step 2: Push Your Code to GitHub

Run these commands in your terminal (from your project directory):

```bash
# Add GitHub as remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/immersivemuseum-vr.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Render.com

1. **Go to Render.com** and sign in to your account
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository:**
   - Click "Connect account" if not already connected
   - Find and select your `immersivemuseum-vr` repository
4. **Configure the service:**
   - **Name:** `immersive-museum-vr` (or your preferred name)
   - **Environment:** `Node`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** Leave empty (uses root)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Click "Create Web Service"**

### Step 4: Wait for Deployment

- Render will automatically build and deploy your application
- This usually takes 2-5 minutes
- You'll see build logs in real-time
- Once complete, you'll get a URL like: `https://immersive-museum-vr.onrender.com`

## 🎮 Testing Your Deployment

Once deployed, test your VR experience:

1. **Open the Render URL** in your browser
2. **Test on different devices:**
   - Desktop browser (Chrome, Firefox, Safari)
   - Mobile device (for mobile VR)
   - VR headset (if available)
3. **Verify VR functionality:**
   - Look around with mouse/touch
   - Check that hotspots work
   - Test audio playback
   - Verify all scenes load properly

## 🔧 Configuration Files Explained

### `server.js`
- Express server that serves your static files
- Includes health check endpoint for Render monitoring
- Automatically serves `index.html` as the main page

### `package.json`
- Updated with Express dependency
- `start` script runs the production server
- Specifies Node.js version requirement

### `render.yaml`
- Render-specific configuration
- Sets up free tier deployment
- Configures health check endpoint

## 🌐 Accessing Your VR Experience

Once deployed, your VR experience will be available at:
- **Main URL:** `https://your-app-name.onrender.com`
- **Health Check:** `https://your-app-name.onrender.com/health`

## 📱 VR Compatibility

Your experience works on:
- **Desktop:** Mouse controls for looking around
- **Mobile:** Touch controls and gyroscope
- **VR Headsets:** Oculus, HTC Vive, etc. (via WebXR)
- **AR:** Mobile AR via WebXR

## 🔄 Updating Your Deployment

To update your live site:

1. **Make changes** to your local files
2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
3. **Push to GitHub:**
   ```bash
   git push origin main
   ```
4. **Render automatically redeploys** (takes 2-5 minutes)

## 🆓 Free Tier Limitations

Render's free tier includes:
- ✅ 750 hours/month (enough for most projects)
- ✅ Automatic deployments from GitHub
- ✅ Custom domain support
- ⚠️ Service sleeps after 15 minutes of inactivity
- ⚠️ Cold start takes ~30 seconds when waking up

## 🚨 Troubleshooting

### Common Issues:

1. **Build fails:**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **App doesn't load:**
   - Check Render logs for errors
   - Verify `index.html` exists in root directory

3. **VR not working:**
   - Ensure you're using HTTPS (required for WebXR)
   - Test in Chrome/Firefox (best WebXR support)

4. **Service sleeping:**
   - This is normal for free tier
   - First visit after sleep takes ~30 seconds

### Getting Help:

- Check Render dashboard logs
- Verify GitHub repository is public
- Ensure all files are committed and pushed

## 🎉 Success!

Once deployed, you'll have:
- ✅ A live, shareable VR experience
- ✅ Automatic updates from GitHub
- ✅ Professional URL for sharing
- ✅ Works on all devices and VR headsets

**Share your VR museum with the world!** 🌍🎮

---

*Need help? Check the Render documentation or GitHub issues for your repository.*
