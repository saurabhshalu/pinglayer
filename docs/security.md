# PingLayer Security Documentation

## Sensitive Data Handling

### WhatsApp Access Tokens

Access tokens are the most sensitive data in the system.

**Storage:**
- Encrypted with AES-256-GCM before being written to MySQL
- Stored in a separate `connection_credentials` table (not the `connections` table)
- IV and GCM auth tag stored alongside ciphertext
- Encryption key sourced exclusively from `CREDENTIAL_ENCRYPTION_KEY` env var

**Access:**
- Decrypted in-memory only at the moment of provider API call
- Never returned in any API response
- Never included in log output
- Never stored in `notifications` history
- Never included in error messages or stack traces

**Rotation:**
- Credentials can be updated via `PUT /api/v1/connections/:id`
- Old encrypted blob is replaced atomically

### API Keys (Product → PingLayer)

- Generated with `crypto.randomBytes(32)` = 64 hex chars
- Only the SHA-256 hash is stored in MySQL (`product_api_keys.key_hash`)
- Raw key is returned once (at creation/rotation) and never again
- Key prefix (8 chars) stored for display purposes only
- Comparison uses `crypto.timingSafeEqual` to prevent timing attacks
- Keys can be revoked or rotated at any time

### Admin Secret

- Compared using `crypto.timingSafeEqual`
- Sourced from `ADMIN_AUTH_SECRET` env var
- Not stored in the database

## Multi-Tenant Isolation

Tenant identity is always `(product_id, tenant_id)` — never `tenant_id` alone.

Every service function that fetches a resource verifies:
```
connection.product_id === authenticated_product.id
```

A product cannot:
- Read another product's connections
- Trigger notifications for another product's tenants
- Access another product's definitions or mappings

This check happens at the **service layer**, not the route layer, so it cannot be bypassed by adding routes.

## SQL Injection Prevention

All database queries use parameterized queries via `mysql2`'s `execute()`:
```ts
await execute('SELECT * FROM connections WHERE id = ? AND product_id = ?', [id, productId]);
```

String interpolation is never used to construct SQL.

## Input Validation

All API inputs are validated with Joi before reaching the service layer:
- `tenantId`: trimmed string, max 255 chars
- `event`: uppercase alphanumeric + underscore only
- `phone`: numeric digits only, 7–15 chars
- `channel`/`provider`: strict enum validation
- UUIDs: format validated

## Rate Limiting

Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
Default: 100 requests per 60 seconds per IP.

## What Is Never Logged

The Winston logger has a `redactSensitive` transform applied to all log entries. Keys matching these patterns are replaced with `[REDACTED]`:
- `access_token`, `accessToken`
- `token`, `password`, `secret`
- `api_key`, `apiKey`, `key_hash`
- `encrypted_data`, `credential`, `credentials`
- `waba_id`, `phone_number_id`

## HTTP Security Headers

Applied via `helmet`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)

## Webhook Verification

Meta webhook endpoint (`GET /webhooks/whatsapp/meta`) verifies the `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN` before acknowledging.

For production, also verify the `X-Hub-Signature-256` header using `META_APP_SECRET` — extend the webhook handler to add HMAC verification.

## Known Limitations / Recommendations for Production

1. **Replace admin auth** with a proper identity provider (Keycloak, Auth0, etc.)
2. **Rotate `CREDENTIAL_ENCRYPTION_KEY`** requires re-encrypting all stored credentials
3. **Add webhook signature verification** for Meta (HMAC-SHA256 of raw body)
4. **Enable TLS** — never deploy without HTTPS
5. **Restrict CORS** — set specific allowed origins in production
6. **Move to secrets manager** — `CREDENTIAL_ENCRYPTION_KEY` and `ADMIN_AUTH_SECRET` should come from AWS Secrets Manager / Vault, not a `.env` file
