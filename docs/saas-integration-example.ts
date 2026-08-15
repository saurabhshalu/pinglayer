/**
 * Example: How a SaaS application integrates with PingLayer.
 *
 * The SaaS application never knows about:
 * - WhatsApp credentials
 * - Meta API
 * - Template names
 * - Provider-specific parameters
 *
 * It only calls: product key + tenant ID + event name + business data.
 */

const PINGLAYER_BASE_URL = 'https://pinglayer.yourcompany.com';
const PINGLAYER_API_KEY = process.env['PINGLAYER_API_KEY']!; // set per environment

async function notifyOrderShipped(
  tenantId: string,
  customerPhone: string,
  data: {
    customerName: string;
    orderId: string;
    trackingNumber: string;
  }
): Promise<void> {
  const response = await fetch(`${PINGLAYER_BASE_URL}/api/v1/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINGLAYER_API_KEY}`,
    },
    body: JSON.stringify({
      tenantId,
      event: 'ORDER_SHIPPED',
      recipient: { phone: customerPhone },
      data,
    }),
  });

  const result = await response.json() as {
    success: boolean;
    data: { notificationId: string; status: string; error?: { code: string; message: string } };
  };

  if (!result.success || result.data.status === 'failed') {
    console.error('Notification failed:', result.data.error);
    // Handle gracefully — notification failure should NOT fail the order shipping
  }
}

async function notifyPaymentReceived(
  tenantId: string,
  customerPhone: string,
  data: { customerName: string; amount: string; currency: string }
): Promise<void> {
  await fetch(`${PINGLAYER_BASE_URL}/api/v1/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINGLAYER_API_KEY}`,
    },
    body: JSON.stringify({
      tenantId,
      event: 'PAYMENT_RECEIVED',
      recipient: { phone: customerPhone },
      data,
    }),
  });
}

// Usage in order service:
async function processOrderShipped(orderId: string): Promise<void> {
  // ... your order shipping logic ...

  // Fire notification — completely decoupled from channel/provider
  await notifyOrderShipped(
    'tenant-abc-123', // the merchant's ID in your SaaS
    '919876543210',
    {
      customerName: 'Rahul Kumar',
      orderId,
      trackingNumber: 'TRK-789',
    }
  );
}

export { notifyOrderShipped, notifyPaymentReceived };
