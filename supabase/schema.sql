-- Panta PerpDEX — Supabase Schema
-- Run this in Supabase SQL editor to initialize all tables

-- ─────────────────────────────────────────────
-- Positions (source of truth is on-chain; this is an index for fast reads)
-- ─────────────────────────────────────────────
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  account text not null,
  collateral_token text not null default 'USDC',
  index_token text not null,        -- 'BTC' or 'ETH'
  is_long boolean not null,
  size numeric(30,8) not null default 0,
  collateral numeric(30,8) not null default 0,
  average_price numeric(30,8) not null default 0,
  entry_funding_rate numeric(30,8) not null default 0,
  status text not null default 'open',  -- 'open' | 'closed' | 'liquidated'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account, collateral_token, index_token, is_long)
);

create index if not exists positions_account_idx on positions(account);
create index if not exists positions_status_idx on positions(status);

-- ─────────────────────────────────────────────
-- Trades (trade history — never deleted)
-- ─────────────────────────────────────────────
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  account text not null,
  collateral_token text not null default 'USDC',
  index_token text not null,
  is_long boolean not null,
  action text not null,             -- 'open' | 'close' | 'increase' | 'decrease' | 'liquidate'
  size_delta numeric(30,8) not null default 0,
  collateral_delta numeric(30,8) not null default 0,
  price numeric(30,8) not null default 0,
  pnl numeric(30,8) not null default 0,
  fee numeric(30,8) not null default 0,
  tx_hash text,
  created_at timestamptz not null default now()
);

create index if not exists trades_account_idx on trades(account);
create index if not exists trades_created_at_idx on trades(created_at desc);

-- ─────────────────────────────────────────────
-- Price history (OHLCV snapshots from Pyth)
-- ─────────────────────────────────────────────
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,             -- 'BTC', 'ETH', 'FLOW'
  price numeric(30,8) not null,
  ts timestamptz not null default now()
);

create index if not exists price_history_symbol_ts_idx on price_history(symbol, ts desc);

-- ─────────────────────────────────────────────
-- Leaderboard view (PnL ranked)
-- ─────────────────────────────────────────────
create or replace view leaderboard as
select
  account,
  sum(pnl) as total_pnl,
  count(*) filter (where action = 'close') as trades_closed,
  count(*) filter (where pnl > 0 and action = 'close') as winning_trades
from trades
group by account
order by total_pnl desc;
