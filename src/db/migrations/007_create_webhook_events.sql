-- Migration: 007_create_webhook_events
-- Stores raw incoming webhook payloads from providers for auditing and reprocessing

CREATE TABLE IF NOT EXISTS webhook_events (
    id           VARCHAR(36)  NOT NULL,
    provider     ENUM('meta', 'twilio', 'sendgrid', 'smtp', 'fcm') NOT NULL,
    channel      ENUM('whatsapp', 'email', 'sms', 'push') NOT NULL,
    raw_payload  JSON         NOT NULL,
    processed    TINYINT(1)   NOT NULL DEFAULT 0,
    processed_at DATETIME     NULL,
    error        TEXT         NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_webhook_provider (provider),
    KEY idx_webhook_processed (processed),
    KEY idx_webhook_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
