# PingLayer — Multi-Tenant Notification Manager

A centralized, provider-agnostic Notification Manager for multiple SaaS products. WhatsApp (via Meta Cloud API) is the first channel. Email, SMS, and Push can be added without changing any SaaS integration code.

## Architecture

```
SaaS Products  →  PingLayer API  →  Provider Adapters  →  Meta / Twilio / etc.
```

Tenant identity: `(product_id, tenant_id)` — never `tenant_id` alone.

```
              PingLayer
                 │
     ┌───────────┼───────────┐
     │           │           │
  SaaS A      SaaS B      SaaS C
  Tenant 1    Tenant 1    Tenant 1
  Tenant 2    Tenant 2    Tenant 2
```

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MySQL 8+ (raw SQL, no ORM)
- **Language:** TypeScript

## Project Structure

```
src/
  config/          Environment configuration
  controllers/     Thin HTTP handlers (v1/ + admin/)
  services/        Business logic
  repositories/    SQL queries
  providers/       Provider adapters (whatsapp/meta/)
  middleware/      Auth, error handling, request ID
  routes/          Route definitions
  validators/      Joi schemas
  crypto/          AES-256-GCM credential encryption, key hashing
  db/              Pool, migration runner, migrations/, seeds/
  webhooks/        Provider webhook handlers
  types/           Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env — see comments for each variable
```

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Create Database

```sql
CREATE DATABASE pinglayer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Run Migrations

```bash
npm run migrate
```

### Seed (development)

```bash
npm run seed
# Outputs a sample product ID and API key
```

### Start

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Product API (`/api/v1`) — requires `Authorization: Bearer <api_key>`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/notifications/send` | Send a notification |
| GET | `/api/v1/notifications` | List notifications |
| GET | `/api/v1/notifications/:id` | Get notification |
| GET | `/api/v1/notifications/:id/attempts` | Delivery attempts |
| POST | `/api/v1/connections` | Create connection |
| GET | `/api/v1/connections` | List connections |
| GET | `/api/v1/connections/:id` | Get connection |
| PUT | `/api/v1/connections/:id` | Update connection |
| DELETE | `/api/v1/connections/:id` | Delete connection |
| POST | `/api/v1/connections/:id/validate` | Validate credentials |
| POST | `/api/v1/connections/:id/test` | Live status check |
| POST | `/api/v1/definitions` | Create notification definition |
| GET | `/api/v1/definitions` | List definitions |
| PUT | `/api/v1/definitions/:id` | Update definition |
| DELETE | `/api/v1/definitions/:id` | Delete definition |
| POST | `/api/v1/mappings` | Create template mapping |
| PUT | `/api/v1/mappings/:id` | Update mapping |
| DELETE | `/api/v1/mappings/:id` | Delete mapping |

### Admin API (`/admin/api`) — requires `Authorization: Bearer <ADMIN_AUTH_SECRET>`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/api/products` | Create product |
| GET | `/admin/api/products` | List products |
| PUT | `/admin/api/products/:id` | Update product |
| POST | `/admin/api/products/:id/api-keys` | Generate API key |
| GET | `/admin/api/products/:id/api-keys` | List API keys |
| POST | `/admin/api/products/:id/api-keys/:keyId/rotate` | Rotate key |
| DELETE | `/admin/api/products/:id/api-keys/:keyId` | Revoke key |
| GET | `/admin/api/connections` | List all connections |
| GET | `/admin/api/notifications` | List notifications |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhooks/whatsapp/meta` | Meta endpoint verification |
| POST | `/webhooks/whatsapp/meta` | Receive Meta status updates |

## Quick Start — SaaS Integration

```ts
// In your SaaS backend:
await fetch('https://pinglayer.yourcompany.com/api/v1/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PINGLAYER_API_KEY}`,
  },
  body: JSON.stringify({
    tenantId: 'merchant-123',
    event: 'ORDER_SHIPPED',
    recipient: { phone: '919876543210' },
    data: {
      customerName: 'Rahul',
      orderId: 'ORD-123',
      trackingNumber: 'TRK-456',
    },
  }),
});
```

The SaaS never knows about WhatsApp, Meta, or template names.

## Tests

```bash
npm test           # all tests
npm run test:unit  # unit tests only (no DB required)
```

## Extend with a New Provider

1. Implement `NotificationProvider` interface in `src/providers/<channel>/<provider>/`
2. Register in `src/providers/registry.ts`
3. No changes required in any SaaS integration

## Security

See [`docs/security.md`](docs/security.md) for full details.

- Credentials encrypted with AES-256-GCM before MySQL storage
- API keys stored as SHA-256 hashes only
- Raw key displayed once (at creation/rotation)
- Parameterized SQL everywhere
- Credentials never returned via API, never logged
