<?php
require_once 'api/config/database.php';

echo "=== Work Items Creator Analysis ===\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    echo "Connected to database successfully.\n\n";
    
    // Check work_items table structure
    echo "=== Work Items Table Structure ===\n";
    $stmt = $conn->prepare("DESCRIBE work_items");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo $column['Field'] . " - " . $column['Type'] . " - " . $column['Null'] . " - " . $column['Default'] . "\n";
    }
    
    // Check users table structure
    echo "\n=== Users Table Structure ===\n";
    $stmt = $conn->prepare("DESCRIBE users");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo $column['Field'] . " - " . $column['Type'] . " - " . $column['Null'] . " - " . $column['Default'] . "\n";
    }
    
    // Sample work items data with creator info
    echo "\n=== Sample Work Items with Creator Info ===\n";
    $stmt = $conn->prepare("
        SELECT 
            wi.id, 
            wi.title, 
            wi.reporter_id,
            wi.created_at,
            u.username,
            u.email,
            u.full_name
        FROM work_items wi
        LEFT JOIN users u ON wi.reporter_id = u.id
        ORDER BY wi.created_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($items)) {
        echo "No work items found in database\n";
    } else {
        foreach ($items as $item) {
            echo "ID: " . $item['id'] . "\n";
            echo "Title: " . $item['title'] . "\n";
            echo "Reporter ID: " . ($item['reporter_id'] ?? 'NULL') . "\n";
            echo "Username: " . ($item['username'] ?? 'NULL') . "\n";
            echo "Email: " . ($item['email'] ?? 'NULL') . "\n";
            echo "Full Name: " . ($item['full_name'] ?? 'NULL') . "\n";
            echo "Created At: " . $item['created_at'] . "\n";
            echo "---\n";
        }
    }
    
    // Check if there are work items without reporter_id
    echo "\n=== Work Items without Reporter ID ===\n";
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM work_items WHERE reporter_id IS NULL");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Work items without reporter_id: " . $result['count'] . "\n";
    
    // Check total users count
    echo "\n=== Users Count ===\n";
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Active users: " . $result['count'] . "\n";
    
    // Show first admin user for fallback
    echo "\n=== First Admin User ===\n";
    $stmt = $conn->prepare("SELECT id, username, email, full_name FROM users WHERE user_role = 'ADMIN' AND is_active = 1 LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        echo "Admin ID: " . $admin['id'] . "\n";
        echo "Admin Username: " . $admin['username'] . "\n";
        echo "Admin Email: " . $admin['email'] . "\n";
        echo "Admin Full Name: " . $admin['full_name'] . "\n";
    } else {
        echo "No admin user found!\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>