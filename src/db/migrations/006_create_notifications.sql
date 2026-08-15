-- Migration: 006_create_notifications
-- Notification history — one row per send attempt initiated by a SaaS product

CREATE TABLE IF NOT EXISTS notifications (
    id                  VARCHAR(36)   NOT NULL,
    product_id          VARCHAR(36)   NOT NULL,
    tenant_id           VARCHAR(255)  NOT NULL,
    connection_id       VARCHAR(36)   NULL,
    channel             ENUM('whatsapp', 'email', 'sms', 'push') NOT NULL,
    provider            ENUM('meta', 'twilio', 'sendgrid', 'smtp', 'fcm') NULL,
    event               VARCHAR(100)  NOT NULL,
    recipient           VARCHAR(255)  NOT NULL,
    provider_message_id VARCHAR(255)  NULL,
    status              ENUM('queued', 'processing', 'sent', 'delivered', 'read', 'failed') NOT NULL DEFAULT 'queued',
    request_metadata    JSON          NOT NULL DEFAULT (JSON_OBJECT()),
    response_metadata   JSON          NULL,
    error_code          VARCHAR(100)  NULL,
    error_message       TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_notifications_product (product_id),
    KEY idx_notifications_tenant (product_id, tenant_id),
    KEY idx_notifications_status (status),
    KEY idx_notifications_event (event),
    KEY idx_notifications_connection (connection_id),
    KEY idx_notifications_provider_msg (provider_message_id),
    KEY idx_notifications_created (created_at),
    CONSTRAINT fk_notifications_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_notifications_connection FOREIGN KEY (connection_id)
        REFERENCES connections (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delivery attempt log for retry tracking
CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
    id               VARCHAR(36) NOT NULL,
    notification_id  VARCHAR(36) NOT NULL,
    attempt_number   INT         NOT NULL DEFAULT 1,
    status           ENUM('queued', 'processing', 'sent', 'delivered', 'read', 'failed') NOT NULL,
    provider_response JSON       NULL,
    error_code       VARCHAR(100) NULL,
    error_message    TEXT        NULL,
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_attempts_notification (notification_id),
    KEY idx_attempts_created (created_at),
    CONSTRAINT fk_attempts_notification FOREIGN KEY (notification_id)
        REFERENCES notifications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
