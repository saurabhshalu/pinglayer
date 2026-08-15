-- Migration: 003_create_connections
-- Tenant-scoped channel/provider configurations.
-- Logical tenant identity = (product_id, tenant_id).

CREATE TABLE IF NOT EXISTS connections (
    id          VARCHAR(36)   NOT NULL,
    product_id  VARCHAR(36)   NOT NULL,
    tenant_id   VARCHAR(255)  NOT NULL,
    channel     ENUM('whatsapp', 'email', 'sms', 'push') NOT NULL,
    provider    ENUM('meta', 'twilio', 'sendgrid', 'smtp', 'fcm') NOT NULL,
    auth_method ENUM('manual', 'embedded_signup', 'oauth') NOT NULL DEFAULT 'manual',
    status      ENUM('active', 'inactive', 'invalid', 'pending') NOT NULL DEFAULT 'pending',
    config      JSON          NOT NULL DEFAULT (JSON_OBJECT()),
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    -- One active connection per product/tenant/channel/provider
    UNIQUE KEY uq_connections_identity (product_id, tenant_id, channel, provider),
    KEY idx_connections_product (product_id),
    KEY idx_connections_tenant (product_id, tenant_id),
    KEY idx_connections_status (status),
    KEY idx_connections_channel (channel),
    CONSTRAINT fk_connections_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Separate table for sensitive credentials (always encrypted at rest)
CREATE TABLE IF NOT EXISTS connection_credentials (
    id            VARCHAR(36) NOT NULL,
    connection_id VARCHAR(36) NOT NULL,
    -- encrypted_data stores the JSON-serialised + AES-256-GCM encrypted blob
    encrypted_data TEXT        NOT NULL,
    iv             VARCHAR(32) NOT NULL,
    tag            VARCHAR(32) NOT NULL,
    created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_credentials_connection (connection_id),
    CONSTRAINT fk_credentials_connection FOREIGN KEY (connection_id)
        REFERENCES connections (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
