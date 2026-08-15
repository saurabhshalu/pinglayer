-- Migration: 005_create_template_mappings
-- Maps internal notification definitions to provider-specific templates per connection/tenant.
-- Allows the same ORDER_SHIPPED event to map to different WhatsApp templates per tenant.

CREATE TABLE IF NOT EXISTS notification_template_mappings (
    id                         VARCHAR(36)  NOT NULL,
    notification_definition_id VARCHAR(36)  NOT NULL,
    connection_id              VARCHAR(36)  NOT NULL,
    channel                    ENUM('whatsapp', 'email', 'sms', 'push') NOT NULL,
    provider                   ENUM('meta', 'twilio', 'sendgrid', 'smtp', 'fcm') NOT NULL,
    provider_template_name     VARCHAR(255) NOT NULL,
    provider_template_language VARCHAR(20)  NOT NULL DEFAULT 'en',
    -- Maps template position/key -> notification data field
    -- e.g. {"1": "customerName", "2": "orderId", "3": "trackingNumber"}
    variable_mapping           JSON         NOT NULL DEFAULT (JSON_OBJECT()),
    status                     ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_mappings_def_connection (notification_definition_id, connection_id),
    KEY idx_mappings_definition (notification_definition_id),
    KEY idx_mappings_connection (connection_id),
    KEY idx_mappings_status (status),
    CONSTRAINT fk_mappings_definition FOREIGN KEY (notification_definition_id)
        REFERENCES notification_definitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_mappings_connection FOREIGN KEY (connection_id)
        REFERENCES connections (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
