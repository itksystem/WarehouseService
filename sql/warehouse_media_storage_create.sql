CREATE TABLE warehouse_media_storage (
  id bigint NOT NULL AUTO_INCREMENT,
  product_id varchar(36) NOT NULL,
  media_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  storage varchar(36) NOT NULL,
  bucket varchar(36) NOT NULL,
  key varchar(1024) NOT NULL,
  mime_type varchar(36) NOT NULL,
  size int NOT NULL,
  is_default int NOT NULL DEFAULT '0',
  created_at datetime DEFAULT NULL,
  blocked_at datetime DEFAULT NULL,
  deleted_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY warehouse_media_storage_created_at_IDX (created_at) USING BTREE,
  KEY warehouse_media_storage_blocked_at_IDX (blocked_at) USING BTREE,
  KEY warehouse_media_storage_deleted_at_IDX (deleted_at) USING BTREE,
  KEY warehouse_media_storage_product_id_IDX (product_id) USING BTREE,
  KEY warehouse_media_storage_media_id_IDX (media_id) USING BTREE,
  KEY warehouse_media_storage_storage_IDX (storage) USING BTREE,
  KEY warehouse_media_storage_bucket_IDX (bucket) USING BTREE,
  KEY warehouse_media_storage_mime_type_IDX (mime_type) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='��������� �������������';
