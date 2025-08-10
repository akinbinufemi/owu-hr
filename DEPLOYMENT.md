# Deployment Guide

## Frontend Deployment (Netlify)

### Prerequisites
- GitHub account with the repository
- Netlify account

### Steps

1. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select this repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
   - Base directory: `frontend`

3. **Environment Variables**
   - Add `REACT_APP_API_URL` with your backend URL
   - For example: `https://your-backend.herokuapp.com/api`

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