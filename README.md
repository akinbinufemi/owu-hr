# Owu Palace Staff - HRMS

A comprehensive Human Resources Management System designed for efficient staff management with a mobile-first, minimalist design.

## Features

- 📊 Admin Dashboard with key metrics and visualizations
- 👥 Comprehensive Staff Profile Management
- 💰 Salary & Payroll Management (including external payments)
- 🏦 Loan Management with automatic deductions
- 🏢 Dynamic Organizational Chart Generation
- 🎫 Staff Issues & Grievance Reporting
- 📈 Reporting & Analytics with data export

## Tech Stack

**Frontend:**
- React.js 18+ with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Chart.js for data visualizations

**Backend:**
- Node.js with Express.js
- PostgreSQL with Prisma ORM
- JWT authentication
- PDF generation with pdf-lib

**Infrastructure:**
- Docker for containerization
- Environment-based configuration

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd owu-palace-hrms
```

2. Install dependencies
```bash
npm run install:all
```

3. Set up environment variables
```bash
cp backend/.env.example backend/.env
# Update the database URL and other configurations
```

4. Start the development servers
```bash
npm run dev
```

### Using Docker

1. Start all services with Docker Compose
```bash
docker-compose up -d
```

2. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## Project Structure

```
owu-palace-hrms/
├── frontend/          # React.js frontend application
├── backend/           # Express.js backend API
├── .kiro/            # Kiro spec files
├── docker-compose.yml # Docker configuration
└── README.md
```

## Development

- Frontend runs on port 3000
- Backend API runs on port 5000
- PostgreSQL runs on port 5432

## License

MIT License