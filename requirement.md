Project: Owu Palace Staff - Human Resources Management Platform
Version: 1.1

Date: July 30, 2025

1. Introduction
This document outlines the functional and non-functional requirements for the "Owu Palace Staff" platform. This is a closed Human Resources Management System (HRMS) designed for a single administrator to efficiently manage all staff data and processes. The platform aims to centralize staff records, automate key HR tasks, and provide a clean, simple, and secure management experience.

2. User Role: Administrator
The system is designed for a single user role:

Admin: Has complete access to all modules and functionalities. The Admin is responsible for creating and managing staff profiles, processing salaries, managing loans, generating reports, and overseeing all data within the platform.

3. Core Features
3.1. Admin Dashboard
A centralized dashboard will be the landing page upon login, displaying key information and quick actions at a glance.

Key Metrics: Total staff count, recent hires, open staff issues.

Quick Links: Navigate to major modules like "Add New Staff" or "Generate Salary Schedule".

Notifications: A summary of upcoming events, such as staff birthdays or work anniversaries.

Data Visualizations: Simple charts showing headcount by department or other key data points.

3.2. Staff Profile Management
This module is the core of the system, maintaining a comprehensive record for each employee.

Personal Information: Full Name, Employee ID, Date of Birth, Gender, Marital Status, Nationality, Photo.

Contact Information: Address, Personal Email, Work Email, Phone Number(s).

Job Information: Job Title, Department, Reporting Manager, Date of Joining, Employment Type (Full-time, Part-time, Contract), Work Location.

Document Management: Ability to upload and store essential documents like CVs, offer letters, contracts, and identification.

Emergency Contact: Name, Relationship, Phone Number.

Audit Trail: Automatically track all changes made to a staff profile for accountability.

3.3. Salary & Payroll Management
This module handles all aspects of employee compensation.

Salary Structure: Define salary components like Basic, Housing Allowance, Transport Allowance, etc.

Deductions: Manage statutory deductions (e.g., Tax, Pension) and other deductions (e.g., loan repayments).

External Payment Management:

A flag to indicate if a staff's payment is managed externally.

Externally paid staff will be excluded from the internal payroll run, but their salary details will be stored for record-keeping.

Ability to upload payment confirmation for externally managed staff.

Generate Monthly Salary Schedule (PDF):

The Admin can generate a comprehensive salary schedule for any given month.

The schedule will be a professional, bank-ready PDF, clearly itemizing earnings and deductions for all internally paid staff.

3.4. Loan Management
A streamlined process for managing employee loans.

Loan Registration: The Admin can log new loan requests, specifying the amount, reason, and repayment terms.

Status Tracking: The Admin can update the loan status (e.g., Pending, Approved, Rejected).

Loan Repayment:

Automatic deduction from the monthly salary during the payroll run.

The system will track the outstanding balance, installments paid, and remaining installments.

Loan Ledger: A clear history of all loans and repayments for each staff member.

3.5. Organizational Chart (Organogram)
Dynamically generate a visual representation of the organization's structure.

The organogram will be automatically created based on the "Reporting Manager" field in the staff profiles.

It will be an interactive chart, allowing the Admin to click on profiles for basic details.

Ability to export the organogram as a PDF or image file.

3.6. Staff Issues & Grievance Reporting
A formal system for the Admin to log and manage employee-related issues.

Issue Logging: The Admin can create a new issue record, categorizing it (e.g., Workplace Conflict, Payroll Discrepancy) and describing the details.

Ticket System: Each issue is assigned a unique ticket number for tracking.

Resolution Management: The Admin can add comments and update the status of the ticket (Open, In Progress, Resolved, Closed).

3.7. Reporting & Analytics
Provide insights into the workforce.

Standard Reports: Headcount Report, Salary Report, Loan Summary Report.

Data Export: All reports should be exportable to Excel or CSV for further analysis.

4. Non-Functional Requirements
4.1. User Interface & Experience (UI/UX)
Mobile-First Design: The layout and components must be designed for an optimal experience on mobile devices first, then scale up gracefully to tablets and desktops.

Minimalist Aesthetic: The design should be clean, uncluttered, and focused, inspired by the user interfaces of Google and Stripe.com. This means prioritizing content, using generous white space, clear typography, and intuitive navigation.

Responsiveness: The UI must be fully responsive and functional across all major browsers and screen sizes.

4.2. Security
The platform must be secure, with data encryption at rest and in transit.

Secure authentication and session management for the Admin user.

4.3. Performance & Scalability
The system must be fast and responsive, even as the number of employee records grows.

The architecture should be scalable to handle future data growth.

4.4. Reliability
The platform should have high uptime and availability, with regular data backups.

5. Proposed Tech Stack
This stack is chosen for its ability to deliver a modern, secure, and high-performance application that meets the specified UI/UX goals.

Frontend:

Framework: React.js (Ideal for building a fast, component-based, and mobile-first UI).

Styling: Tailwind CSS (For rapid development of a clean, minimalist, and responsive design).

Backend:

Framework: Node.js with Express.js (Excellent for building lightweight, efficient APIs).

API: RESTful API (To facilitate clean communication between the frontend and backend).

Database:

Primary: PostgreSQL (A powerful, reliable database for ensuring data integrity).

PDF Generation:

Libraries like pdf-lib (for Node.js).

Deployment:

Cloud Provider: AWS, Google Cloud Platform, or Vercel (for the frontend).

Containerization: Docker (To ensure consistency across environments).