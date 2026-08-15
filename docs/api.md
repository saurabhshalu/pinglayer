# PingLayer API Reference

## Base URL

```
https://your-domain.com
```

## Authentication

All Product API endpoints require:
```
Authorization: Bearer <api_key>
```

All Admin API endpoints require:
```
Authorization: Bearer <admin_secret>
```

API keys are generated via the Admin API and scoped to a single SaaS product.

---

## Product API — `/api/v1`

### Send Notification

Send a notification to a tenant's recipient. The SaaS product does not specify a channel or provider — the Notification Manager resolves the correct connection and template.

```
POST /api/v1/notifications/send
Authorization: Bearer <product_api_key>
```

**Request body:**
```json
{
  "tenantId": "tenant-123",
  "event": "ORDER_SHIPPED",
  "recipient": {
    "phone": "919876543210"
  },
  "data": {
    "customerName": "Rahul",
    "orderId": "ORD-123",
    "trackingNumber": "TRK-456"
  },
  "channel": "whatsapp"
}
```

`channel` is optional. Defaults to `whatsapp`.

**Response (200 — sent synchronously):**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "status": "sent",
    "providerMessageId": "wamid.abc123",
    "channel": "whatsapp"
  }
}
```

**Response (failed):**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "status": "failed",
    "channel": "whatsapp",
    "error": {
      "code": "PROVIDER_AUTH_FAILED",
      "message": "WhatsApp access token is invalid or expired"
    }
  }
}
```

**Error responses:**

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `DEFINITION_NOT_FOUND` | 404 | Event not configured for this product |
| `CONNECTION_NOT_FOUND` | 404 | No active WhatsApp connection for tenant |
| `TEMPLATE_NOT_CONFIGURED` | 404 | No template mapping for this event/tenant |
| `TEMPLATE_VARIABLE_MISSING` | 422 | `data` is missing a required field |
| `VALIDATION_ERROR` | 422 | Invalid request body |

---

### List Notifications

```
GET /api/v1/notifications
Authorization: Bearer <product_api_key>
```

**Query params:** `tenantId`, `status`, `event`, `channel`, `fromDate`, `toDate`, `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Notification

```
GET /api/v1/notifications/:id
```

---

### Get Delivery Attempts

```
GET /api/v1/notifications/:id/attempts
```

---

### Create Connection

```
POST /api/v1/connections
Authorization: Bearer <product_api_key>
```

**Request body (WhatsApp/Meta manual):**
```json
{
  "tenantId": "tenant-123",
  "channel": "whatsapp",
  "provider": "meta",
  "authMethod": "manual",
  "credentials": {
    "waba_id": "1234567890",
    "phone_number_id": "9876543210",
    "access_token": "EAAGxxxxx..."
  },
  "config": {}
}
```

`credentials` are encrypted at rest. They are never returned by any API.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "product_id": "prod-uuid",
    "tenant_id": "tenant-123",
    "channel": "whatsapp",
    "provider": "meta",
    "auth_method": "manual",
    "status": "pending",
    "config": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Validate Connection

Tests credentials against the provider and updates connection status.

```
POST /api/v1/connections/:id/validate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "phoneNumber": "+91 98765 43210",
    "displayName": "My Business",
    "businessAccountId": "1234567890"
  }
}
```

---

### Test Connection (live status check)

```
POST /api/v1/connections/:id/test
```

---

### Update Connection

```
PUT /api/v1/connections/:id
```

```json
{
  "credentials": {
    "waba_id": "...",
    "phone_number_id": "...",
    "access_token": "..."
  },
  "status": "active"
}
```

---

### Delete Connection

```
DELETE /api/v1/connections/:id
```

---

### Create Notification Definition

```
POST /api/v1/definitions
```

```json
{
  "key": "ORDER_SHIPPED",
  "name": "Order Shipped",
  "description": "Sent when an order ships",
  "channels": ["whatsapp"]
}
```

---

### List Definitions

```
GET /api/v1/definitions
```

---

### Create Template Mapping

Maps an internal notification definition to a provider-specific template for a tenant's connection.

```
POST /api/v1/mappings
```

```json
{
  "definition_id": "uuid",
  "connection_id": "uuid",
  "provider_template_name": "order_shipped",
  "provider_template_language": "en_US",
  "variable_mapping": {
    "1": "customerName",
    "2": "orderId",
    "3": "trackingNumber"
  }
}
```

`variable_mapping` keys are WhatsApp template parameter positions; values are keys from the notification `data` object.

---

## Admin API — `/admin/api`

### Create Product

```
POST /admin/api/products
Authorization: Bearer <admin_secret>
```

```json
{
  "name": "Inventory SaaS",
  "slug": "inventory-saas"
}
```

---

### Generate Product API Key

```
POST /admin/api/products/:id/api-keys
Authorization: Bearer <admin_secret>
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "key-uuid",
    "productId": "prod-uuid",
    "prefix": "abc12345",
    "apiKey": "abc12345...full64charkey...",
    "status": "active",
    "note": "Store this API key securely. It will not be shown again."
  }
}
```

---

### Rotate API Key

```
POST /admin/api/products/:id/api-keys/:keyId/rotate
```

---

### Revoke API Key

```
DELETE /admin/api/products/:id/api-keys/:keyId
```

---

### List All Connections (Admin)

```
GET /admin/api/connections?productId=&tenantId=&channel=&status=
```

---

### List All Notifications (Admin)

```
GET /admin/api/notifications?productId=&tenantId=&status=&event=
```

---

## Webhooks

### Meta/WhatsApp Webhook Verification

```
GET /webhooks/whatsapp/meta
  ?hub.mode=subscribe
  &hub.verify_token=<META_WEBHOOK_VERIFY_TOKEN>
  &hub.challenge=<challenge>
```

Returns the challenge string to verify endpoint ownership.

### Meta/WhatsApp Status Updates

```
POST /webhooks/whatsapp/meta
```

Receives delivery status updates (`sent`, `delivered`, `read`, `failed`) and incoming messages from Meta. Responds 200 immediately and processes asynchronously.

---

## Error Format

All errors follow:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": [...]
  },
  "requestId": "uuid"
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Authenticated but not permitted |
| `INVALID_API_KEY` | API key not found or revoked |
| `API_KEY_REVOKED` | Key explicitly revoked |
| `PRODUCT_INACTIVE` | Product is suspended/inactive |
| `PRODUCT_NOT_FOUND` | Product does not exist |
| `CONNECTION_NOT_FOUND` | Connection not found or wrong product |
| `CONNECTION_INVALID` | Connection credentials are invalid |
| `DEFINITION_NOT_FOUND` | Notification event not configured |
| `TEMPLATE_NOT_CONFIGURED` | No template mapping for event/tenant |
| `TEMPLATE_VARIABLE_MISSING` | Required `data` field missing |
| `PROVIDER_AUTH_FAILED` | Provider rejected credentials |
| `PROVIDER_RATE_LIMITED` | Provider rate limit hit |
| `MESSAGE_SEND_FAILED` | Provider failed to send message |
| `VALIDATION_ERROR` | Request body invalid |
| `CONFLICT` | Duplicate resource |
| `INTERNAL_ERROR` | Unexpected server error |
