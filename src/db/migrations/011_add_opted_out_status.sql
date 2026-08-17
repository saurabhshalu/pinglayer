-- Migration: 011_add_opted_out_status
-- Adds 'opted_out' as a valid status for notifications and delivery attempts
-- so we can record skipped sends without losing the audit trail.

ALTER TABLE notifications
    MODIFY COLUMN status
        ENUM('queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'opted_out')
        NOT NULL DEFAULT 'queued';

ALTER TABLE notification_delivery_attempts
    MODIFY COLUMN status
        ENUM('queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'opted_out')
        NOT NULL;
