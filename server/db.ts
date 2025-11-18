import dotenv from 'dotenv';
dotenv.config(); // Load .env file first

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '@shared/schema';

// Get MySQL database URL from environment
const MYSQL_DATABASE_URL = process.env.MYSQL_DATABASE_URL;

if (!MYSQL_DATABASE_URL) {
  console.warn('⚠️  No MYSQL_DATABASE_URL found. Database operations will not be available.');
  console.warn('📝 Note: The application will run with limited functionality');
} else {
  console.log('✅ MySQL database connection configured');
  console.log('📊 Database URL (masked):', MYSQL_DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
}

// Create MySQL database connection
let db: ReturnType<typeof drizzle> | null = null;

if (MYSQL_DATABASE_URL) {
  try {
    const connection = mysql.createPool(MYSQL_DATABASE_URL);
    db = drizzle(connection, { schema, mode: "default" });
    console.log('✅ Using MySQL database for data storage');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    console.log('⚠️  Falling back to in-memory storage');
  }
} else {
  console.log('⚠️  Using in-memory storage (data will not persist between restarts)');
}

export { db };