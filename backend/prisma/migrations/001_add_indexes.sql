-- Add indexes for frequently queried fields

-- Staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff("employeeId");
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_reporting_manager ON staff("reportingManagerId");
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff("isActive");
CREATE INDEX IF NOT EXISTS idx_staff_externally_paid ON staff("isExternallyPaid");
CREATE INDEX IF NOT EXISTS idx_staff_date_joining ON staff("dateOfJoining");

-- Salary structures indexes
CREATE INDEX IF NOT EXISTS idx_salary_staff_id ON salary_structures("staffId");
CREATE INDEX IF NOT EXISTS idx_salary_active ON salary_structures("isActive");
CREATE INDEX IF NOT EXISTS idx_salary_effective_date ON salary_structures("effectiveDate");

-- Loans indexes
CREATE INDEX IF NOT EXISTS idx_loans_staff_id ON loans("staffId");
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans("createdAt");

-- Issues indexes
CREATE INDEX IF NOT EXISTS idx_issues_ticket_number ON issues("ticketNumber");
CREATE INDEX IF NOT EXISTS idx_issues_staff_id ON issues("staffId");
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues("assignedTo");
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues("createdAt");

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_staff_id ON documents("staffId");
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Audit trails indexes
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON audit_trails("entityType");
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_trails("entityId");
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_trails("performedBy");
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trails(timestamp);

-- Payroll schedules indexes
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll_schedules(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_generated_at ON payroll_schedules("generatedAt");