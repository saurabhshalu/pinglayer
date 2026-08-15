-- Migration: 002_create_product_api_keys
-- Hashed API keys for product-to-PingLayer server-to-server auth

CREATE TABLE IF NOT EXISTS product_api_keys (
    id           VARCHAR(36)  NOT NULL,
    product_id   VARCHAR(36)  NOT NULL,
    key_hash     VARCHAR(64)  NOT NULL,
    key_prefix   VARCHAR(8)   NOT NULL,
    status       ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at   DATETIME     NULL,
    last_used_at DATETIME     NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_api_keys_hash (key_hash),
    KEY idx_api_keys_product_id (product_id),
    KEY idx_api_keys_status (status),
    CONSTRAINT fk_api_keys_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
