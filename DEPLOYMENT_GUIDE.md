# WizzyBug Quick Start & Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally OR MongoDB Atlas account
- npm or yarn package manager

### Setup Steps

#### 1. Install Dependencies
```bash
cd c:\WizzyBugTrack

# Install root dependencies
npm install

# Install backend dependencies
cd wizzybug-backend
npm install

# Install frontend dependencies
cd ../wizzybug-frontend
npm install

# Go back to root
cd ..
```

#### 2. Configure Environment Variables

**Backend** - Update `wizzybug-backend/.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/wizzybug
JWT_SECRET=dev_secret_key_change_for_production
PORT=5000
FRONTEND_URL=http://localhost:5173
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

**Frontend** - `wizzybug-frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

#### 3. Start MongoDB (if running locally)
```bash
mongod
```

#### 4. Run the Application
From project root:
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173 (React + Vite)
- **Backend**: http://localhost:5000 (Express API)

#### 5. Access the App
1. Open browser → http://localhost:5173
2. You'll see **Login/Sign Up Page**
3. Click "Create Account" to register
4. After signup, login with your credentials
5. You'll see the **Dashboard** ✅

---

## 📦 Production Deployment

### Option 1: Deploy to Render (Easy)

#### Deploy Backend to Render

1. Go to https://render.com and create account
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `wizzybug-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev` (or create npm script)
   - **Region**: Choose closest to you

5. Add Environment Variables (in Render dashboard):
```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=generate_strong_random_secret
FRONTEND_URL=https://your-frontend-url.com (add later after deploying frontend)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
PORT=5000
NODE_ENV=production
```

6. Deploy! You'll get a URL like: `https://wizzybug-backend.onrender.com`

#### Deploy Frontend to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variable:
```
VITE_API_URL=https://wizzybug-backend.onrender.com/api
```

6. Deploy! You'll get a URL like: `https://wizzybug-frontend.vercel.app`

7. Update Backend's FRONTEND_URL in Render:
   - Go back to Render dashboard
   - Edit `wizzybug-backend` environment variable
   - Set `FRONTEND_URL=https://wizzybug-frontend.vercel.app`
   - Redeploy

---

### Option 2: Deploy Backend to Railway

1. Go to https://railway.app
2. Create new project → "Deploy from GitHub"
3. Select your repository
4. Railway will auto-detect Node.js app
5. Add Variables (Railway dashboard):
```
MONGO_URI=your_connection_string
JWT_SECRET=generate_strong_secret
FRONTEND_URL=https://your-frontend-url.com
... other variables
```
6. Railway auto-deploys on push

---

### Option 3: Deploy to AWS (More Complex)

**For Backend (EC2)**:
1. Create EC2 instance (Ubuntu)
2. Install Node.js and MongoDB/connect to Atlas
3. Clone repo, install dependencies
4. Set environment variables
5. Use PM2 to keep app running

**For Frontend (S3 + CloudFront)**:
1. Run `npm run build` locally
2. Upload `dist/` folder to S3
3. Set up CloudFront for CDN
4. Update `VITE_API_URL` environment variable

---

## ✅ Deployment Checklist

### Before Deploying Frontend
- [ ] `VITE_API_URL` points to deployed backend URL
- [ ] Backend is deployed and running
- [ ] Test backend API is accessible: `https://backend-url.com/api/health`

### Before Deploying Backend
- [ ] MongoDB Atlas cluster is set up
- [ ] MongoDB URI is correct (test connection locally first)
- [ ] JWT_SECRET is a strong random string (NOT "secret")
- [ ] FRONTEND_URL is set correctly (update after frontend deployment)
- [ ] Email provider configured (Gmail or Resend)
- [ ] Cloudinary credentials added

### After Deployment
- [ ] Visit deployed frontend URL
- [ ] See **Login/Sign Up page** ✓
- [ ] Create new account ✓
- [ ] Login ✓
- [ ] See **Dashboard** with projects/bugs ✓
- [ ] Test creating a bug ✓
- [ ] Test uploading image (Cloudinary) ✓

---

## 🔒 Security Tips for Production

1. **JWT_SECRET**: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **HTTPS Only**: Always use HTTPS in production (Vercel, Render handle this)
3. **Database**: Use MongoDB Atlas (managed, secure) not local
4. **Email**: Don't commit Gmail passwords, use environment variables
5. **CORS**: Already configured to accept from FRONTEND_URL
6. **Password Hashing**: Already using bcryptjs with salt rounds

---

## 📊 Expected Behavior After Deployment

### First Visit
```
User visits https://your-app.com
↓
App loads React app + checks localStorage
↓
No token found
↓
LOGIN/SIGN UP page appears
```

### Sign Up Flow
```
1. User fills: Name, Email, Password, Role
2. Clicks "Create Account"
3. Backend registers user in MongoDB
4. Success message: "Account created successfully. Please sign in."
5. User fills email + password
6. Clicks "Sign In"
7. Backend validates credentials
8. JWT token returned
9. Token stored in localStorage
10. Dashboard appears with projects & bugs
```

### Login Flow
```
1. User fills: Email, Password
2. Clicks "Sign In"
3. Backend validates against hashed password
4. JWT token returned
5. Dashboard loads immediately
```

---

## 🐛 Troubleshooting Deployment

### Frontend shows blank page / 404
- Check browser console for errors
- Verify `VITE_API_URL` environment variable is set
- Check backend is running (visit `{backend-url}/api/health`)

### Login fails after deployment
- Backend might be down - check deployment service
- Check JWT_SECRET is set in backend `.env`
- Verify MONGO_URI is correct (test with MongoDB Compass)

### Can't send emails
- Check GMAIL_USER and GMAIL_APP_PASSWORD are set
- Verify Gmail App Password is 16 characters
- 2-Step Verification must be enabled on Gmail account

### Image uploads fail
- Check Cloudinary credentials
- Visit Cloudinary dashboard to verify API key

### CORS errors
- Backend already has CORS enabled
- Make sure FRONTEND_URL matches exactly (include protocol + no trailing slash)

---

## 🎯 Minimal Setup for Testing

If you just want to test without all integrations:

**Backend .env (minimal)**:
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/wizzybug
JWT_SECRET=test_secret_123456789
PORT=5000
FRONTEND_URL=http://localhost:5173
```

**Frontend .env (minimal)**:
```env
VITE_API_URL=http://localhost:5000/api
```

Then:
1. Run `npm run dev`
2. Sign up and login works ✓
3. Creating bugs works ✓
4. (Email/image upload optional)

---

## 📚 Useful Commands

```bash
# Root level
npm run dev              # Start both frontend + backend
npm run client          # Frontend only
npm run server          # Backend only
npm run build           # Build frontend for production

# Backend
cd wizzybug-backend
npm run dev             # Development with auto-reload
npm run build           # Build TypeScript
npm run seed            # Seed sample data
npm run reset-dev-data  # Clear and reset database

# Frontend  
cd wizzybug-frontend
npm run dev             # Dev server on 5173
npm run build           # Build for production
npm run preview         # Preview production build locally
```

---

## 🎉 You're Done!

Your WizzyBug app will:
1. ✅ Show login/sign up on first visit
2. ✅ Allow users to create accounts
3. ✅ Log them in securely
4. ✅ Show dashboard after login
5. ✅ Let them manage projects and bugs

**That's the authentication flow working perfectly!** 🚀
