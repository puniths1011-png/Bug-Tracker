# WizzyBug Authentication Flow Guide

## Overview
Your WizzyBug project already has a complete authentication system implemented. When users visit the app (whether locally or after deployment), they will automatically see the **Sign Up / Login page first**, and after successful authentication, they'll be redirected to the **main dashboard/project area**.

---

## Current Authentication Architecture

### Frontend (`wizzybug-frontend`)
The app uses **React Router** with state management to handle authentication:

1. **Entry Point**: [src/main.jsx](src/main.jsx)
   - `AppRouter` component manages all routes
   - Two routes:
     - `/admin` - Admin version of the app
     - `/*` - Regular user view
     - `/accept-invite` - For accepting project invitations

2. **App Component** (in [src/main.jsx](src/main.jsx))
   - Checks if user is logged in by looking at:
     - `localStorage.getItem("isLogged")`
     - JWT token in `localStorage.getItem("token")`
   
3. **Authentication Check**:
   ```javascript
   const [logged, setLogged] = useState(() => {
     if (typeof window === "undefined") return false;
     const storedIsLogged = localStorage.getItem("isLogged");
     if (storedIsLogged === "true") return true;
     return Boolean(getToken());
   });

   if (!logged) {
     return <Login ... />  // Show login page if not logged in
   }
   ```

4. **Login Component** (in [src/main.jsx](src/main.jsx))
   - Handles both **Sign Up** and **Login**
   - Toggle between modes with `isRegister` state
   - Sign Up: Creates account via `/auth/register` endpoint
   - Login: Authenticates via `/auth/login` endpoint

---

### Backend (`wizzybug-backend`)
The backend provides authentication endpoints:

1. **Routes**: [src/routes/authRoutes.ts](wizzybug-backend/src/routes/authRoutes.ts)
   - `POST /auth/register` - Create new account
   - `POST /auth/login` - Login existing user
   - `POST /auth/accept-invite` - Accept project invitations

2. **Controller**: [src/controllers/authController.ts](wizzybug-backend/src/controllers/authController.ts)
   - Handles user registration with hashed passwords (bcryptjs)
   - Validates email and password
   - Generates JWT tokens for sessions
   - Sends invitation emails via Gmail/Resend

3. **Database**: MongoDB
   - Stores user accounts in `User` collection
   - Fields: name, email, password (hashed), role, status

---

## User Flow: How It Works

### 1️⃣ **User Visits App**
```
User opens app (localhost:5173 or deployed URL)
         ↓
App loads, checks localStorage for token & isLogged flag
         ↓
No token found
         ↓
Shows LOGIN PAGE with two options:
  - Sign In (existing users)
  - Sign Up (new users)
```

### 2️⃣ **New User: Sign Up**
```
User fills: Name, Email, Password, Role (admin/developer/tester)
         ↓
Frontend POST to /api/auth/register
         ↓
Backend validates email is unique
         ↓
Backend hashes password with bcryptjs
         ↓
User created in MongoDB
         ↓
Success message shown: "Account created successfully. Please sign in."
         ↓
User returns to LOGIN form (not auto-logged in for security)
         ↓
User enters email & password
         ↓
Backend authenticates with bcryptjs.compare()
         ↓
JWT token generated
         ↓
Token saved to localStorage
         ↓
User data saved to localStorage
         ↓
App state updates: logged = true
         ↓
DASHBOARD appears with:
  - Project overview
  - Bug list
  - Team members
  - Quick stats
```

### 3️⃣ **Returning User: Login**
```
User enters email & password
         ↓
Backend authenticates (bcryptjs.compare with hashed password)
         ↓
Backend generates JWT token
         ↓
Frontend stores token: localStorage.setItem("token", token)
         ↓
Frontend stores user: localStorage.setItem("user", JSON.stringify(user))
         ↓
Frontend updates state: setLogged(true)
         ↓
App re-renders DASHBOARD
         ↓
Sidebar loads with navigation to:
  - Dashboard (bug stats & overview)
  - Bug Management (list & create bugs/tickets)
  - Projects (view & create projects)
  - Users (team members & permissions)
  - My Profile (user settings)
```

### 4️⃣ **Inside the Project**
After login, user can:
- 📊 **Dashboard**: View bug statistics and recent activity
- 🐛 **Bugs**: View all bugs, filter by status/priority, create new bug reports
- 📁 **Projects**: View projects user is part of
- 👥 **Users**: See team members, invite new users via email
- ⚙️ **Profile**: Update personal settings

---

## Environment Variables for Deployment

### Frontend (`.env`)
```
VITE_API_URL=https://your-backend-url.com/api
```
**Important**: When deployed, this must point to your deployed backend URL

### Backend (`.env`)
```
# MongoDB connection
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_key_here

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend-url.com

# Email configuration
RESEND_API_KEY=re_your_api_key  # or use GMAIL_USER + GMAIL_APP_PASSWORD
MAIL_FROM="WizzyBug" <noreply@yourdomain.com>

# Image upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Server
PORT=5000
```

---

## Deployment Checklist ✅

### Local Testing
- [ ] MongoDB is running locally or connected via MongoDB Atlas
- [ ] Run `npm run dev` in root (starts frontend on 5173 + backend on 5000)
- [ ] Visit `http://localhost:5173`
- [ ] See Login/Sign Up page ✓
- [ ] Sign up new account
- [ ] Login with that account
- [ ] See Dashboard ✓

### Before Deployment
- [ ] Update `FRONTEND_URL` in backend `.env` to deployed frontend URL
- [ ] Update `VITE_API_URL` in frontend `.env` to deployed backend URL
- [ ] Generate a strong `JWT_SECRET` (not "secret" or test values)
- [ ] Set up MongoDB Atlas cluster (or other managed MongoDB)
- [ ] Configure Cloudinary account for image uploads
- [ ] Set up Resend or Gmail for emails

### Deployment Services (Popular options)
- **Frontend**: Vercel, Netlify, AWS Amplify
- **Backend**: Render, Railway, Heroku (paid), AWS EC2, DigitalOcean

---

## Key Files in Authentication Flow

| File | Purpose |
|------|---------|
| [wizzybug-frontend/src/main.jsx](wizzybug-frontend/src/main.jsx) | Auth state logic, Login component, App router |
| [wizzybug-backend/src/controllers/authController.ts](wizzybug-backend/src/controllers/authController.ts) | Register, login logic |
| [wizzybug-backend/src/models/User.ts](wizzybug-backend/src/models/User.ts) | User database schema |
| [wizzybug-backend/src/routes/authRoutes.ts](wizzybug-backend/src/routes/authRoutes.ts) | Auth endpoints |
| [wizzybug-backend/src/middleware/authMiddleware.ts](wizzybug-backend/src/middleware/authMiddleware.ts) | JWT token verification for protected routes |

---

## Troubleshooting

### Issue: Login page not appearing, seeing blank page
**Solution**: 
- Check browser console for errors
- Verify `VITE_API_URL` in frontend `.env`
- Check if backend is running on correct port

### Issue: "User already exists" on signup
**Solution**: 
- User email already registered
- Use different email or login with existing account

### Issue: Login fails, "Invalid credentials"
**Solution**:
- Check email and password spelling
- Verify user was successfully created during signup
- Check MongoDB is running

### Issue: After login, still see login page
**Solution**:
- Clear localStorage: Open DevTools → Application → LocalStorage → Clear All
- Refresh page
- Login again

### Issue: After deployment, can't login
**Solution**:
- Check backend is running on deployment platform
- Verify `VITE_API_URL` points to correct deployed backend URL
- Check CORS is enabled on backend (already configured)
- Check JWT_SECRET is set in backend `.env`

---

## How Token/Session Works

1. **After successful login**, backend sends JWT token
2. **Frontend stores** token in `localStorage`
3. **Every API request** includes token in header: `Authorization: Bearer {token}`
4. **Backend validates** token in `authMiddleware`
5. **If token expires/invalid**, user sees 401 error
6. **App clears localStorage** and shows login page again

---

## Summary

✅ **Your authentication system is complete and working!**

The flow is:
```
App Loads → No Token? → Show Login Page → User Signs Up/In → Token Saved → Dashboard Appears
```

Just ensure:
1. Environment variables are set correctly
2. Backend and Frontend URLs match in deployment
3. MongoDB and email services are configured
4. JWT_SECRET is strong for production

That's it! Users will automatically see the login page when they visit, and after authentication, they'll be inside your project dashboard. 🚀
