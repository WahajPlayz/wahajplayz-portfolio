-- polar_subscriptions: tracks Polar subscription state (mirrors stripe_subscriptions)
CREATE TABLE IF NOT EXISTS polar_subscriptions (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  billing TEXT NOT NULL,
  customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  order_id TEXT,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS polar_subscriptions_uid_idx ON polar_subscriptions(uid);

-- Add polar_order_id to commission_requests for Polar-originated commissions
ALTER TABLE commission_requests ADD COLUMN IF NOT EXISTS polar_order_id TEXT;
