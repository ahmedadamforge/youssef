CREATE TABLE IF NOT EXISTS hardware_test_runs (
  id VARCHAR(80) PRIMARY KEY,
  item_id VARCHAR(80) NULL,
  test_key VARCHAR(40) NOT NULL,
  test_label VARCHAR(160) NOT NULL,
  command VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL,
  measurements JSON NOT NULL,
  raw_response TEXT NULL,
  error_detail TEXT NULL,
  tested_by VARCHAR(120) NOT NULL,
  tested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY test_run_item_idx (item_id),
  KEY test_run_date_idx (tested_at),
  CONSTRAINT fk_test_run_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);
