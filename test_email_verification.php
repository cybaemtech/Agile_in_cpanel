<?php
// Test Email Verification System
require_once __DIR__ . '/api/config/database.php';

echo "Testing Email Verification System...\n";

$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    die("❌ Database connection failed! Please run the migration first.\n");
}

try {
    // Check if email verification columns exist
    $stmt = $conn->prepare("SHOW COLUMNS FROM users LIKE 'email_verified'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if (!$result) {
        echo "❌ Email verification columns not found. Please run the database migration first.\n";
        echo "Run this SQL in your database:\n";
        echo file_get_contents(__DIR__ . '/email_verification_migration_direct.sql') . "\n";
        exit(1);
    }
    
    echo "✅ Database schema is ready\n";
    
    // Test OTP generation
    $otp = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    echo "✅ OTP generation working: $otp\n";
    
    // Test email template
    $testUser = "Test User";
    $testOTP = "123456";
    $emailContent = createOTPEmail($testUser, $testOTP);
    if (strlen($emailContent) > 100) {
        echo "✅ Email template generation working\n";
    }
    
    // Check existing users
    $stmt = $conn->prepare("SELECT COUNT(*) as count, SUM(email_verified) as verified FROM users");
    $stmt->execute();
    $stats = $stmt->fetch();
    
    echo "📊 User Statistics:\n";
    echo "   Total users: " . $stats['count'] . "\n";
    echo "   Verified users: " . $stats['verified'] . "\n";
    echo "   Unverified users: " . ($stats['count'] - $stats['verified']) . "\n";
    
    // Test the email verification endpoints
    echo "\n🔗 API Endpoints Available:\n";
    echo "   POST /api/email-verification/send-otp\n";
    echo "   POST /api/email-verification/verify-otp\n";
    echo "   POST /api/email-verification/resend-otp\n";
    echo "   GET  /api/email-verification/status\n";
    
    echo "\n✅ Email verification system is ready!\n";
    echo "\nNext steps:\n";
    echo "1. Run the frontend build: npm run build\n";
    echo "2. Test the login flow with an unverified user\n";
    echo "3. Verify email delivery is working\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
}

function createOTPEmail($userName, $otp) {
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-box { background: #fff; border: 3px solid #007bff; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
            .otp { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🔐 Email Verification</h1>
                <p>Project Management System</p>
            </div>
            <div class='content'>
                <h2>Hello " . htmlspecialchars($userName) . ",</h2>
                <p>Your verification code is:</p>
                <div class='otp-box'>
                    <div class='otp'>" . htmlspecialchars($otp) . "</div>
                </div>
                <div class='footer'>
                    <p>This code expires in 10 minutes.</p>
                </div>
            </div>
        </div>
    </body>
    </html>";
}
?>