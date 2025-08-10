# Requirements Document

## Introduction

The Owu Palace Staff platform is a closed Human Resources Management System (HRMS) designed for a single administrator to efficiently manage all staff data and processes. The platform centralizes staff records, automates key HR tasks, and provides a clean, simple, and secure management experience with a mobile-first, minimalist design inspired by Google and Stripe interfaces.

## Requirements

### Requirement 1: Admin Authentication and Dashboard

**User Story:** As an administrator, I want to securely log into the system and view a centralized dashboard, so that I can quickly access key information and navigate to major HR functions.

#### Acceptance Criteria

1. WHEN the admin accesses the platform THEN the system SHALL require secure authentication
2. WHEN the admin successfully logs in THEN the system SHALL display a dashboard with total staff count, recent hires, and open staff issues
3. WHEN the admin views the dashboard THEN the system SHALL provide quick links to major modules like "Add New Staff" and "Generate Salary Schedule"
4. WHEN the admin views the dashboard THEN the system SHALL display notifications for upcoming events such as staff birthdays and work anniversaries
5. WHEN the admin views the dashboard THEN the system SHALL show data visualizations including charts for headcount by department

### Requirement 2: Staff Profile Management

**User Story:** As an administrator, I want to create and manage comprehensive staff profiles, so that I can maintain accurate employee records with full audit trails.

#### Acceptance Criteria

1. WHEN the admin creates a new staff profile THEN the system SHALL capture personal information including full name, employee ID, date of birth, gender, marital status, nationality, and photo
2. WHEN the admin creates a staff profile THEN the system SHALL capture contact information including address, personal email, work email, and phone numbers
3. WHEN the admin creates a staff profile THEN the system SHALL capture job information including job title, department, reporting manager, date of joining, employment type, and work location
4. WHEN the admin uploads documents THEN the system SHALL store essential documents like CVs, offer letters, contracts, and identification
5. WHEN the admin adds emergency contact information THEN the system SHALL store name, relationship, and phone number
6. WHEN any changes are made to a staff profile THEN the system SHALL automatically track all changes in an audit trail for accountability

### Requirement 3: Salary and Payroll Management

**User Story:** As an administrator, I want to manage employee compensation and generate payroll schedules, so that I can handle both internal and external payment processes efficiently.

#### Acceptance Criteria

1. WHEN the admin defines salary structures THEN the system SHALL support components like Basic, Housing Allowance, and Transport Allowance
2. WHEN the admin manages deductions THEN the system SHALL handle statutory deductions like Tax and Pension, plus other deductions like loan repayments
3. WHEN the admin flags a staff member as externally paid THEN the system SHALL exclude them from internal payroll runs while storing their salary details for records
4. WHEN the admin uploads payment confirmation for externally managed staff THEN the system SHALL store the confirmation documents
5. WHEN the admin generates a monthly salary schedule THEN the system SHALL create a professional, bank-ready PDF clearly itemizing earnings and deductions for all internally paid staff

### Requirement 4: Loan Management

**User Story:** As an administrator, I want to manage employee loans and track repayments, so that I can maintain accurate loan records and automate salary deductions.

#### Acceptance Criteria

1. WHEN the admin registers a new loan THEN the system SHALL capture the amount, reason, and repayment terms
2. WHEN the admin updates loan status THEN the system SHALL support statuses including Pending, Approved, and Rejected
3. WHEN payroll is processed THEN the system SHALL automatically deduct loan repayments from monthly salary
4. WHEN loan repayments are processed THEN the system SHALL track outstanding balance, installments paid, and remaining installments
5. WHEN the admin views loan information THEN the system SHALL provide a clear loan ledger showing history of all loans and repayments for each staff member

### Requirement 5: Organizational Chart Generation

**User Story:** As an administrator, I want to generate and export organizational charts, so that I can visualize the company structure and share it with stakeholders.

#### Acceptance Criteria

1. WHEN the admin requests an organogram THEN the system SHALL dynamically generate a visual representation based on the "Reporting Manager" field in staff profiles
2. WHEN the admin views the organogram THEN the system SHALL provide an interactive chart allowing clicks on profiles for basic details
3. WHEN the admin exports the organogram THEN the system SHALL support export as PDF or image file formats

### Requirement 6: Staff Issues and Grievance Management

**User Story:** As an administrator, I want to log and track employee-related issues, so that I can manage workplace conflicts and maintain proper documentation.

#### Acceptance Criteria

1. WHEN the admin creates a new issue record THEN the system SHALL allow categorization such as Workplace Conflict or Payroll Discrepancy with detailed descriptions
2. WHEN an issue is created THEN the system SHALL assign a unique ticket number for tracking
3. WHEN the admin manages issue resolution THEN the system SHALL allow adding comments and updating status including Open, In Progress, Resolved, and Closed

### Requirement 7: Reporting and Analytics

**User Story:** As an administrator, I want to generate reports and export data, so that I can analyze workforce information and share insights with stakeholders.

#### Acceptance Criteria

1. WHEN the admin generates reports THEN the system SHALL provide standard reports including Headcount Report, Salary Report, and Loan Summary Report
2. WHEN the admin exports data THEN the system SHALL support export to Excel or CSV formats for further analysis

### Requirement 8: Mobile-First Responsive Design

**User Story:** As an administrator, I want to access the system from any device, so that I can manage HR tasks efficiently whether on mobile, tablet, or desktop.

#### Acceptance Criteria

1. WHEN the admin accesses the platform on any device THEN the system SHALL provide optimal experience on mobile devices first, scaling gracefully to tablets and desktops
2. WHEN the admin uses the interface THEN the system SHALL display a clean, minimalist aesthetic with generous white space and clear typography
3. WHEN the admin accesses the platform THEN the system SHALL be fully responsive and functional across all major browsers and screen sizes

### Requirement 9: Security and Performance

**User Story:** As an administrator, I want the system to be secure and performant, so that sensitive HR data is protected and the system remains fast as it grows.

#### Acceptance Criteria

1. WHEN data is stored or transmitted THEN the system SHALL encrypt data at rest and in transit
2. WHEN the admin uses the system THEN the system SHALL provide secure authentication and session management
3. WHEN the number of employee records grows THEN the system SHALL remain fast and responsive
4. WHEN the system operates THEN the system SHALL maintain high uptime and availability with regular data backups