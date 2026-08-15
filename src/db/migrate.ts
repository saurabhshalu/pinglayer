import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getConnection(): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: process.env['MYSQL_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
    database: process.env['MYSQL_DATABASE'] ?? 'pinglayer',
    user: process.env['MYSQL_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? '',
    multipleStatements: true,
  });
}

async function ensureMigrationsTable(conn: mysql.Connection): Promise<void> {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute('SELECT filename FROM schema_migrations');
  const applied = new Set<string>();
  for (const row of rows as { filename: string }[]) {
    applied.add(row.filename);
  }
  return applied;
}

async function runMigrations(): Promise<void> {
  const conn = await getConnection();

  try {
    await ensureMigrationsTable(conn);
    const applied = await getAppliedMigrations(conn);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && f !== '008_create_migrations_table.sql')
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  → Applying ${file}...`);
      await conn.query(sql);
      await conn.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      console.log(`  ✓ ${file}`);
      ran++;
    }

    if (ran === 0) {
      console.log('Database is up to date.');
    } else {
      console.log(`\n${ran} migration(s) applied.`);
    }
  } finally {
    await conn.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
