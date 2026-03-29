-- Add Stop Loss and Take Profit columns to positions table
-- Run this in Supabase SQL editor

alter table positions
  add column if not exists stop_loss numeric(30, 8),
  add column if not exists take_profit numeric(30, 8);
