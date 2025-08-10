# Owu Palace HRMS

A comprehensive Human Resource Management System for Owu Palace, built with React.js, Node.js, and PostgreSQL.

## 🚀 Live Demo

- **Frontend**: [Deploy on Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/akinbinufemi/owu-hr)
- **Demo Credentials**: admin@owupalace.com / admin123

## 🎯 Complete HRMS Features

### 🏠 Admin Dashboard
- Real-time staff metrics and KPIs
- Recent hires and staff statistics
- Quick access to major HR functions
- Data visualizations with charts
- Upcoming events (birthdays, anniversaries)

### 👥 Staff Management
- Complete employee profiles with personal, contact, and job information
- Document management (CVs, contracts, IDs)
- Emergency contact information
- Reporting hierarchy management
- Staff search and filtering
- Audit trails for all profile changes

### 💰 Payroll & Salary Management
- Flexible salary structures with allowances and deductions
- Support for both internal and external payments
- Monthly payroll generation with PDF export
- Bank-ready salary schedules
- Tax and pension calculations
- External payment confirmation uploads

### 🏦 Enhanced Loan Management
- Employee loan applications and approvals
- **NEW**: Pause/resume loan repayments with admin comments
- **NEW**: Detailed payment tracking (amount paid, remaining, completion dates)
- **NEW**: Custom month-year date pickers
- Automatic salary deductions based on start dates
- Loan ledger and repayment history
- Status management with mandatory comments

### 🏢 Organizational Structure
- Dynamic organogram generation based on reporting relationships
- Interactive organizational charts
- Export capabilities (PDF/Image)
- Visual hierarchy representation

### 🎫 Issues & Grievance Management
- Ticket-based issue tracking system
- Categorized issues (workplace conflicts, payroll discrepancies, etc.)
- Priority levels and status management
- Comment system for issue resolution
- Unique ticket number generation

### 📊 Reports & Analytics
- Comprehensive reporting suite
- Headcount reports by department
- Salary and payroll reports
- Loan summary reports
- Excel/CSV export capabilities
- Data filtering and date range selection

### 🔐 Security & Administration
- JWT-based authentication system
- Role-based access control
- Input sanitization and validation
- Rate limiting for API protection
- Audit trails for accountability
- Session management

### 📱 User Experience
- Mobile-first responsive design
- Clean, minimalist interface inspired by Google/Stripe
- Real-time notifications and feedback
- Loading states and error handling
- Intuitive navigation and workflows

## 🛠️ Technology Stack

### Frontend
- **React.js 18+** with TypeScript for type safety
- **Tailwind CSS** for responsive, mobile-first styling
- **React Router** for client-side navigation
- **Axios** for API communication
- **Chart.js/Recharts** for data visualizations
- **React Hook Form** for form management
- **Custom Components**: DatePicker, MonthYearPicker, DataTable, Modal

### Backend
- **Node.js** with **Express.js** framework
- **PostgreSQL 14+** as primary database
- **Prisma ORM** for database operations and migrations
- **JWT** for authentication and session management
- **bcrypt** for password hashing
- **pdf-lib** for PDF generation
- **Multer** for file upload handling
- **Helmet** for security headers

### Security & Performance
- Input sanitization and validation
- Rate limiting and CORS protection
- SQL injection prevention
- XSS protection with Content Security Policy
- Database indexing for performance
- Connection pooling
- Error handling and logging

### Development & Deployment
- **TypeScript** for both frontend and backend
- **Docker** support for containerization
- **Prisma** migrations for database versioning
- **Environment-based** configuration
- **Git** version control with comprehensive commit history

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+**
- **npm** or **yarn**

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/akinbinufemi/owu-hr.git
   cd owu-hr
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database URL and other configurations
   
   # Run database migrations and seed data
   npx prisma migrate dev
   npx prisma db seed
   
   # Start backend server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your API URL (default: http://localhost:5001/api)
   
   # Start frontend development server
   npm start
   ```

4. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5001
   - **Login**: admin@owupalace.com / admin123

### 🐳 Docker Setup (Alternative)

```bash
# Start all services with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

## 📁 Project Structure

```
owu-hr/
├── frontend/                 # React.js Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
│
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── prisma/             # Database schema & migrations
│   └── package.json
│
├── .kiro/                  # Kiro IDE specifications
├── netlify.toml           # Netlify deployment config
├── DEPLOYMENT.md          # Deployment guide
└── README.md
```

## 🌐 Deployment Strategy

### ⚠️ Important: Split Deployment Required

**Netlify only hosts static sites** (React frontend). Your Node.js backend needs a separate service.

### 🎯 Recommended Approach: Netlify + Railway

| Component | Platform | Cost | Purpose |
|-----------|----------|------|---------|
| **Frontend** | Netlify | FREE | React app, CDN, SSL |
| **Backend + Database** | Railway | FREE tier | Node.js API, PostgreSQL |

### 🚀 Quick Deploy Links

**Step 1: Deploy Backend**
- Go to [Railway](https://railway.app) → Deploy from GitHub → Select this repo
- Set root directory to `backend`
- Add environment variables (see [deploy-guide.md](deploy-guide.md))

**Step 2: Deploy Frontend**
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/akinbinufemi/owu-hr)
- Set base directory to `frontend`
- Add `REACT_APP_API_URL` pointing to your Railway backend

### 📋 Complete Guides
- **Quick Start**: [deploy-guide.md](deploy-guide.md) (10 minutes total)
- **Detailed Instructions**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Alternative Platforms**: Render, Vercel, Heroku options included

## 🔐 Demo System

The system comes pre-configured with demo data:

**Admin Login:**
- Email: `admin@owupalace.com`
- Password: `admin123`

**Sample Data Includes:**
- 4 staff members with complete profiles
- 2 loan applications (1 approved, 1 pending)
- Sample salary structures
- Demo issues and tickets
- Organizational hierarchy

## License

MIT License