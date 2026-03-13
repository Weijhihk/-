import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 建立 PostgreSQL 連線池
// 建議透過 Google Cloud SQL Auth Proxy 連線，或是設定許可清單 IP
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT || '5432'),
  ssl: {
    rejectUnauthorized: false // Cloud SQL 通常需要 SSL，但在測試環境可視情況調整
  }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
