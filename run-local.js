// Simple script to create admin users in your cPanel database
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAdminUsers() {
  const connection = await mysql.createConnection({
    host: '103.48.43.49',
    port: 3306,
    user: 'cybaemtech_Agile', 
    password: 'Agile@9090$',
    database: 'cybaemtech_Agile'
  });

  try {
    console.log('✅ Connected to cPanel MySQL database');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const scrumPassword = await bcrypt.hash('scrum123', salt);

    // Create admin user
    const [adminResult] = await connection.execute(
      `INSERT INTO users (username, email, password, full_name, user_role, is_active) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['admin', 'admin@example.com', adminPassword, 'Admin User', 'ADMIN', true]
    );

    // Create scrum user  
    const [scrumResult] = await connection.execute(
      `INSERT INTO users (username, email, password, full_name, user_role, is_active) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['scrummaster', 'scrum@example.com', scrumPassword, 'Scrum Master', 'SCRUM_MASTER', true]
    );

    console.log('✅ Admin users created/updated:');
    console.log('   📧 admin@example.com / admin123');
    console.log('   📧 scrum@example.com / scrum123');

    // Check total users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total users in database: ${users[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

setupAdminUsers();