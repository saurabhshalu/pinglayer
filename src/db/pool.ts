import mysql from 'mysql2/promise';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      connectionLimit: config.db.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '+00:00',
      dateStrings: false,
    });

    logger.info('MySQL connection pool created', {
      host: config.db.host,
      database: config.db.database,
    });
  }
  return pool;
}

export async function testConnection(): Promise<void> {
  const conn = await getPool().getConnection();
  await conn.ping();
  conn.release();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}

export type QueryResult<T> = T[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlParams = any[];

// Use pool.query() (text protocol, client-side escaping) instead of pool.execute()
// (server-side prepared statements). Both are safe with ? placeholders. The text
// protocol avoids "Incorrect arguments to mysqld_stmt_execute" errors that some
// MySQL versions raise when LIMIT/OFFSET are used as bound parameters.
export async function query<T>(
  sql: string,
  params?: SqlParams
): Promise<QueryResult<T>> {
  const [rows] = await getPool().query(sql, params);
  return rows as QueryResult<T>;
}

export async function queryOne<T>(
  sql: string,
  params?: SqlParams
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params?: SqlParams
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().query(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
