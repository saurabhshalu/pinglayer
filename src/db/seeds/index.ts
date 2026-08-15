/**
 * Seed data for development/testing.
 * Creates a sample product and API key.
 */
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

async function seed(): Promise<void> {
  const conn = await mysql.createConnection({
    host: process.env['MYSQL_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
    database: process.env['MYSQL_DATABASE'] ?? 'pinglayer',
    user: process.env['MYSQL_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? '',
  });

  try {
    // Create demo product
    const productId = uuidv4();
    await conn.execute(
      "INSERT IGNORE INTO products (id, name, slug, status) VALUES (?, ?, ?, 'active')",
      [productId, 'Demo Inventory SaaS', 'demo-inventory-saas']
    );
    console.log(`Product created: ${productId} (slug: demo-inventory-saas)`);

    // Create API key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);
    const keyId = uuidv4();

    await conn.execute(
      "INSERT IGNORE INTO product_api_keys (id, product_id, key_hash, key_prefix, status) VALUES (?, ?, ?, ?, 'active')",
      [keyId, productId, keyHash, keyPrefix]
    );

    console.log('\n=== SEED COMPLETE ===');
    console.log(`Product ID: ${productId}`);
    console.log(`API Key ID: ${keyId}`);
    console.log(`API Key:    ${rawKey}`);
    console.log('\nStore the API key securely — it will not be shown again.');

    // Create sample notification definitions
    const defs = [
      { id: uuidv4(), key: 'ORDER_SHIPPED', name: 'Order Shipped' },
      { id: uuidv4(), key: 'ORDER_CONFIRMED', name: 'Order Confirmed' },
      { id: uuidv4(), key: 'PAYMENT_RECEIVED', name: 'Payment Received' },
      { id: uuidv4(), key: 'LOW_STOCK', name: 'Low Stock Alert' },
    ];

    for (const def of defs) {
      await conn.execute(
        `INSERT IGNORE INTO notification_definitions
           (id, product_id, \`key\`, name, channels, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [def.id, productId, def.key, def.name, JSON.stringify(['whatsapp'])]
      );
    }

    console.log(`\nCreated ${defs.length} sample notification definitions.`);
  } finally {
    await conn.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
