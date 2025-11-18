<?php
// Fix creator data for work items and test the API response

require_once 'api/config/database.php';

echo "=== Creator Data Fix Script ===\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo "Failed to connect to database.\n";
        exit(1);
    }
    
    echo "Connected to database successfully.\n\n";
    
    // Check current state
    echo "=== Current State Analysis ===\n";
    
    // Count work items without reporter_id
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM work_items WHERE reporter_id IS NULL");
    $stmt->execute();
    $nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Work items without reporter_id: $nullCount\n";
    
    // Get first admin user
    $stmt = $conn->prepare("SELECT id, username, email, full_name FROM users WHERE user_role = 'ADMIN' AND is_active = 1 LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        // Fallback to first active user
        $stmt = $conn->prepare("SELECT id, username, email, full_name FROM users WHERE is_active = 1 LIMIT 1");
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$admin) {
        echo "ERROR: No active users found in database!\n";
        exit(1);
    }
    
    echo "Using fallback user for orphaned items:\n";
    echo "  ID: " . $admin['id'] . "\n";
    echo "  Username: " . $admin['username'] . "\n";
    echo "  Email: " . $admin['email'] . "\n";
    echo "  Full Name: " . $admin['full_name'] . "\n\n";
    
    if ($nullCount > 0) {
        echo "=== Fixing Work Items ===\n";
        
        // Update work items without reporter_id
        $stmt = $conn->prepare("UPDATE work_items SET reporter_id = ? WHERE reporter_id IS NULL");
        $result = $stmt->execute([$admin['id']]);
        
        if ($result) {
            echo "✓ Updated $nullCount work items with reporter_id: " . $admin['id'] . "\n";
        } else {
            echo "✗ Failed to update work items\n";
        }
    } else {
        echo "✓ All work items already have reporter_id assigned\n";
    }
    
    // Test the API query
    echo "\n=== Testing API Query ===\n";
    
    $stmt = $conn->prepare("
        SELECT 
            wi.id,
            wi.title,
            wi.reporter_id,
            creator.full_name as createdByName,
            creator.email as createdByEmail,
            creator.username as createdByUsername
        FROM work_items wi
        LEFT JOIN users creator ON wi.reporter_id = creator.id
        ORDER BY wi.created_at DESC
        LIMIT 3
    ");
    $stmt->execute();
    $testItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($testItems)) {
        echo "No work items found for testing\n";
    } else {
        foreach ($testItems as $item) {
            echo "Work Item ID: " . $item['id'] . "\n";
            echo "  Title: " . $item['title'] . "\n";
            echo "  Reporter ID: " . ($item['reporter_id'] ?? 'NULL') . "\n";
            echo "  Created By Name: " . ($item['createdByName'] ?? 'NULL') . "\n";
            echo "  Created By Email: " . ($item['createdByEmail'] ?? 'NULL') . "\n";
            echo "  Created By Username: " . ($item['createdByUsername'] ?? 'NULL') . "\n";
            echo "  Status: " . (($item['createdByEmail'] || $item['createdByName']) ? 'OK' : 'PROBLEM') . "\n";
            echo "---\n";
        }
    }
    
    echo "\n=== Summary ===\n";
    // Final count check
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM work_items WHERE reporter_id IS NULL");
    $stmt->execute();
    $finalNullCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($finalNullCount == 0) {
        echo "✓ All work items now have valid reporter_id\n";
        echo "✓ Creator data fix completed successfully\n";
    } else {
        echo "✗ $finalNullCount work items still missing reporter_id\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>