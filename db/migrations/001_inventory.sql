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

CREATE TABLE IF NOT EXISTS inventory_loans (
  id VARCHAR(80) PRIMARY KEY,
  item_id VARCHAR(80) NOT NULL,
  member_name VARCHAR(120) NOT NULL,
  member_user_id VARCHAR(80) NULL,
  project_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  initial_state VARCHAR(40) NOT NULL DEFAULT 'Testé OK',
  loan_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  returned_at TIMESTAMP NULL DEFAULT NULL,
  KEY loan_status_idx (status),
  KEY loan_item_idx (item_id),
  CONSTRAINT fk_loan_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id VARCHAR(80) PRIMARY KEY,
  item_id VARCHAR(80) NOT NULL,
  error_detail TEXT NOT NULL,
  reported_by VARCHAR(120) NOT NULL DEFAULT 'Circuit Tester Web',
  status VARCHAR(40) NOT NULL DEFAULT 'En quarantaine',
  reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY maint_item_idx (item_id),
  CONSTRAINT fk_maint_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_auth_state (
  id TINYINT PRIMARY KEY,
  state JSON NOT NULL
);
