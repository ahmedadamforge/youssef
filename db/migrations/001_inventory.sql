CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  image VARCHAR(255) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  available INT UNSIGNED NOT NULL DEFAULT 0,
  unit VARCHAR(40) NOT NULL,
  specs JSON NOT NULL,
  accent VARCHAR(20) NOT NULL DEFAULT 'cyan',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT inventory_available_range CHECK (available <= stock),
  KEY inventory_category_idx (category),
  KEY inventory_stock_idx (available, stock)
);
