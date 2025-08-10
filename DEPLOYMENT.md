# 🚀 Complete HRMS Deployment Guide

## ❗ Important: Frontend and Backend Must Be Deployed Separately

**Netlify only hosts static sites** (your React frontend). Your Node.js backend needs a different service that supports server-side applications.

## 🎯 Recommended: Split Deployment Strategy

### Why Split Frontend and Backend?

- **Netlify**: Optimized for static sites (React frontend) - FREE
- **Railway/Render**: Optimized for server applications (Node.js backend) - FREE tier
- **Better Performance**: Each service optimized for its purpose
- **Cost Effective**: Use free tiers of both services
- **Scalability**: Scale frontend and backend independently

---

## 🚀 Method 1: Netlify (Frontend) + Render (Backend) - RECOMMENDED & FREE

### Step 1: Deploy Backend to Render

1. **Go to [Render](https://render.com)**
2. **Sign up/Login** with GitHub
3. **New** → **Web Service** → **Connect GitHub**
4. **Select your repository**: `akinbinufemi/owu-hr`
5. **Configure Service**:
   - **Name**: `owu-palace-backend`
   - **Root Directory**: `backend` ⚠️ **CRITICAL: Must specify this**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

6. **Create PostgreSQL Database**:
   - **New** → **PostgreSQL** → **Name**: `owu-palace-db` → **Plan**: Free
   - **Copy the Internal Database URL**

7. **Add Environment Variables to Web Service**:
   ```
   DATABASE_URL=postgresql://owu_palace_user:xxx@dpg-xxx.oregon-postgres.render.com/owu_palace_db
   JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-chars
   PORT=10000
   FRONTEND_URL=https://your-netlify-app.netlify.app
   NODE_ENV=production
   ```

8. **Deploy**: Render will give you a URL like `https://owu-palace-backend.onrender.com`

### Step 2: Deploy Frontend to Netlify

1. **Go to [Netlify](https://netlify.com)**
2. **New site from Git** → **GitHub** → **Select your repo**
3. **Configure Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`

4. **Add Environment Variable**:
   ```
   REACT_APP_API_URL=https://owu-palace-backend.onrender.com/api
   ```

5. **Deploy**: Netlify will give you a URL like `https://owu-palace-hrms.netlify.app`

### Step 3: Initialize Database

1. **In Render dashboard**, open your backend service **Shell**
2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
3. **Seed database**:
   ```bash
   npx prisma db seed
   ```

### Step 4: Update CORS Settings

1. **Go back to Render** and update the `FRONTEND_URL` environment variable
2. **Set it to your actual Netlify URL**: `https://owu-palace-hrms.netlify.app`
3. **Redeploy** the backend service

### Backend Deployment Options

#### Option 1: Railway
1. Go to [Railway](https://railway.app)
2. Connect your GitHub repository
3. Select the backend folder
4. Add environment variables from `backend/.env`

#### Option 2: Render
1. Go to [Render](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables

#### Option 3: Heroku
1. Install Heroku CLI
2. Create new app: `heroku create your-app-name`
3. Add PostgreSQL addon: `heroku addons:create heroku-postgresql:hobby-dev`
4. Set environment variables: `heroku config:set KEY=value`
5. Deploy: `git push heroku main`

### Environment Variables Needed

#### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Port number (usually set by hosting provider)
- `FRONTEND_URL` - Frontend URL for CORS

#### Frontend
- `REACT_APP_API_URL` - Backend API URL

### Database Setup
1. Run migrations: `npx prisma migrate deploy`
2. Seed database: `npx prisma db seed`

### Demo Credentials
- Email: admin@owupalace.com
- Password: admin123