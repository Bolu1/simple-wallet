-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'NGN',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on userId for faster user wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets("userId");

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fromWalletId" UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  "toWalletId" UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" VARCHAR(255) UNIQUE NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions("fromWalletId");
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions("toWalletId");
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions("idempotencyKey");

-- Create transaction_logs table for audit trail
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "transactionId" UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for transaction log queries
CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON transaction_logs("transactionId");

-- Create interest_accruals table
CREATE TABLE IF NOT EXISTS interest_accruals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "walletId" UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL,
  "calculatedDate" DATE NOT NULL,
  "annualRate" DECIMAL(10, 8) NOT NULL,
  "daysInYear" INTEGER NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("walletId", "calculatedDate")
);

-- Create indexes for interest accrual queries
CREATE INDEX IF NOT EXISTS idx_interest_accruals_wallet_id ON interest_accruals("walletId");
CREATE INDEX IF NOT EXISTS idx_interest_accruals_calculated_date ON interest_accruals("calculatedDate");
