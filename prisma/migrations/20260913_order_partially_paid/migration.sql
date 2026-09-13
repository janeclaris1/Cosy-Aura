-- AlterEnum (must be committed before using the new value in DML)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
