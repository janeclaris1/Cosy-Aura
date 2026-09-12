-- Allow sales journals linked to paid orders
ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'ORDER';
