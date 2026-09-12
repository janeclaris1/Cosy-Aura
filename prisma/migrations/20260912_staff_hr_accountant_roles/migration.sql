-- HR and Accountant staff roles (scoped permissions in application RBAC)

ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'HR';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
