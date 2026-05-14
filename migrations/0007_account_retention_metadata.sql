ALTER TABLE payment_orders ADD COLUMN account_retention_reason TEXT;
ALTER TABLE payment_orders ADD COLUMN account_retention_until TEXT;
ALTER TABLE payment_orders ADD COLUMN personal_data_erased_at TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_retention_until
  ON payment_orders (account_retention_until);

ALTER TABLE credit_transactions ADD COLUMN account_retention_reason TEXT;
ALTER TABLE credit_transactions ADD COLUMN account_retention_until TEXT;
ALTER TABLE credit_transactions ADD COLUMN personal_data_erased_at TEXT;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_retention_until
  ON credit_transactions (account_retention_until);
