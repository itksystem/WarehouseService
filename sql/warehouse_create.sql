CREATE TABLE warehouse (
  id bigint NOT NULL AUTO_INCREMENT,
  product_id varchar(36) NOT NULL,
  product_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT '0.00',
  description text,
  quantity int DEFAULT '0',
  reserved_quantity int DEFAULT '0',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_product_id (product_id) USING BTREE,
  KEY idx_warehouse_product_id (product_id),
  KEY warehouse_price_IDX (price) USING BTREE,
  KEY warehouse_reserved_quantity_IDX (reserved_quantity) USING BTREE,
  KEY warehouse_quantity_IDX (quantity) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=77