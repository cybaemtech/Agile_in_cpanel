<?php
require_once 'api/config/database.php';

// Get database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    echo "❌ Failed to connect to database\n";
    exit(1);
}

echo "✅ Connected to database successfully\n\n";

try {
    // Check current users and their roles
    echo "📋 Current users and roles:\n";
    echo "==========================\n";
    $stmt = $conn->prepare("SELECT id, username, email, full_name, user_role, is_active FROM users");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($users as $user) {
        echo sprintf("ID: %d | Username: %s | Email: %s | Role: %s | Active: %s\n", 
            $user['id'], 
            $user['username'], 
            $user['email'], 
            $user['user_role'] ?? 'NULL', 
            $user['is_active'] ? 'Yes' : 'No'
        );
    }
    
    echo "\n";
    
    // Update users with proper roles
    echo "🔧 Fixing user roles...\n";
    
    // Make the first user (admin) an ADMIN
    if (!empty($users)) {
        $adminUser = $users[0];
        $updateAdminStmt = $conn->prepare("UPDATE users SET user_role = 'ADMIN' WHERE id = ?");
        $updateAdminStmt->execute([$adminUser['id']]);
        echo "✅ Set {$adminUser['username']} as ADMIN\n";
        
        // Set second user as SCRUM_MASTER if exists
        if (count($users) > 1) {
            $scrumUser = $users[1];
            $updateScrumStmt = $conn->prepare("UPDATE users SET user_role = 'SCRUM_MASTER' WHERE id = ?");
            $updateScrumStmt->execute([$scrumUser['id']]);
            echo "✅ Set {$scrumUser['username']} as SCRUM_MASTER\n";
        }
        
        // Set remaining users as USER
        for ($i = 2; $i < count($users); $i++) {
            $regularUser = $users[$i];
            $updateUserStmt = $conn->prepare("UPDATE users SET user_role = 'USER' WHERE id = ?");
            $updateUserStmt->execute([$regularUser['id']]);
            echo "✅ Set {$regularUser['username']} as USER\n";
        }
    }
    
    echo "\n";
    
    // Verify the changes
    echo "📋 Updated users and roles:\n";
    echo "===========================\n";
    $verifyStmt = $conn->prepare("SELECT id, username, email, full_name, user_role, is_active FROM users ORDER BY id");
    $verifyStmt->execute();
    $updatedUsers = $verifyStmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($updatedUsers as $user) {
        echo sprintf("ID: %d | Username: %s | Email: %s | Role: %s | Active: %s\n", 
            $user['id'], 
            $user['username'], 
            $user['email'], 
            $user['user_role'] ?? 'NULL', 
            $user['is_active'] ? 'Yes' : 'No'
        );
    }
    
    echo "\n✅ User roles have been fixed successfully!\n";
    echo "💡 Now try logging in with any user to test access control.\n";

} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
}
?>