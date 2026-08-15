-- Migration: 008_create_migrations_table
-- Internal tracking table for applied migrations (run first before others in bootstrap)

CREATE TABLE IF NOT EXISTS schema_migrations (
    id         INT          NOT NULL AUTO_INCREMENT,
    filename   VARCHAR(255) NOT NULL,
    applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_migrations_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
