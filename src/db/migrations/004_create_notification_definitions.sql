-- Migration: 004_create_notification_definitions
-- Internal notification event keys per product (e.g. ORDER_SHIPPED, PAYMENT_RECEIVED)

CREATE TABLE IF NOT EXISTS notification_definitions (
    id          VARCHAR(36)   NOT NULL,
    product_id  VARCHAR(36)   NOT NULL,
    `key`       VARCHAR(100)  NOT NULL,
    name        VARCHAR(255)  NOT NULL,
    description TEXT          NULL,
    channels    JSON          NOT NULL DEFAULT (JSON_ARRAY()),
    status      ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_definitions_product_key (product_id, `key`),
    KEY idx_definitions_product (product_id),
    KEY idx_definitions_status (status),
    CONSTRAINT fk_definitions_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
