-- Migration: 010_create_opt_outs
-- Stores opt-out records for recipients who sent STOP (or equivalent).
-- Scoped to (product_id, tenant_id, channel, recipient) so:
--   - Reconnecting a WhatsApp connection (new connection_id) doesn't reset opt-outs
--   - Opting out of WhatsApp does not affect email or SMS for the same tenant
--   - recipient is a phone number for WhatsApp/SMS, email address for email

CREATE TABLE IF NOT EXISTS opt_outs (
    id           VARCHAR(36)                                       NOT NULL,
    product_id   VARCHAR(36)                                       NOT NULL,
    tenant_id    VARCHAR(255)                                      NOT NULL,
    channel      ENUM('whatsapp', 'email', 'sms', 'push')         NOT NULL,
    recipient    VARCHAR(255)                                      NOT NULL,
    opted_out_at DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source       ENUM('inbound_message', 'api', 'admin')          NOT NULL DEFAULT 'inbound_message',

    PRIMARY KEY (id),
    UNIQUE KEY uq_opt_out (product_id, tenant_id, channel, recipient),
    KEY idx_opt_outs_product (product_id),
    KEY idx_opt_outs_tenant  (product_id, tenant_id),

    CONSTRAINT fk_opt_outs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
