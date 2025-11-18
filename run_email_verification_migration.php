<?php
// Email Verification Migration Runner
require_once __DIR__ . '/api/config/database.php';

echo "Starting Email Verification System Migration...\n";

$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    die("Database connection failed!\n");
}

try {
    $conn->beginTransaction();
    
    // Read and execute migration file
    $migrationSQL = file_get_contents(__DIR__ . '/database_email_verification_migration.sql');
    
    if ($migrationSQL === false) {
        throw new Exception("Could not read migration file");
    }
    
    // Split SQL statements
    $statements = explode(';', $migrationSQL);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (empty($statement) || strpos($statement, '--') === 0 || strpos($statement, 'USE') === 0) {
            continue;
        }
        
        echo "Executing: " . substr($statement, 0, 50) . "...\n";
        $conn->exec($statement);
    }
    
    $conn->commit();
    echo "✅ Email verification system migration completed successfully!\n";
    echo "\nNew features added:\n";
    echo "- Email verification required for login\n";
    echo "- OTP system for email verification\n";
    echo "- Rate limiting for OTP requests\n";
    echo "- Secure verification process\n";
    echo "\nAPI endpoints available:\n";
    echo "- POST /api/email-verification/send-otp\n";
    echo "- POST /api/email-verification/verify-otp\n";
    echo "- POST /api/email-verification/resend-otp\n";
    echo "- GET /api/email-verification/status\n";
    
} catch (Exception $e) {
    $conn->rollback();
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>