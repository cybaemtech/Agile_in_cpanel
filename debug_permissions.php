<?php
require_once 'api/config/database.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session to get current user
session_start();

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Get current user from session
    if (!isset($_SESSION['user_id'])) {
        echo "No user in session. Please log in first.\n";
        exit;
    }
    
    $userId = $_SESSION['user_id'];
    echo "Current User ID: " . $userId . "\n";
    
    // Get user details
    $stmt = $pdo->prepare("SELECT id, email, role, user_role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "User Details:\n";
        echo "  ID: " . $user['id'] . "\n";
        echo "  Email: " . $user['email'] . "\n";
        echo "  Role: " . ($user['role'] ?? 'NULL') . "\n";
        echo "  User Role: " . ($user['user_role'] ?? 'NULL') . "\n\n";
    } else {
        echo "User not found in database!\n";
        exit;
    }
    
    // Get work items created by this user
    $stmt = $pdo->prepare("
        SELECT id, title, type, assignee_id, reporter_id 
        FROM work_items 
        WHERE reporter_id = ? 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $stmt->execute([$userId]);
    $workItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Work Items Created by User:\n";
    if (empty($workItems)) {
        echo "  No work items found created by this user.\n\n";
    } else {
        foreach ($workItems as $item) {
            echo "  ID: " . $item['id'] . "\n";
            echo "  Title: " . $item['title'] . "\n";
            echo "  Type: " . $item['type'] . "\n";
            echo "  Assignee ID: " . ($item['assignee_id'] ?? 'NULL') . "\n";
            echo "  Reporter ID: " . $item['reporter_id'] . "\n";
            echo "  ---\n";
        }
    }
    
    // Get work items assigned to this user
    $stmt = $pdo->prepare("
        SELECT id, title, type, assignee_id, reporter_id 
        FROM work_items 
        WHERE assignee_id = ? 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $stmt->execute([$userId]);
    $assignedItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nWork Items Assigned to User:\n";
    if (empty($assignedItems)) {
        echo "  No work items found assigned to this user.\n\n";
    } else {
        foreach ($assignedItems as $item) {
            echo "  ID: " . $item['id'] . "\n";
            echo "  Title: " . $item['title'] . "\n";
            echo "  Type: " . $item['type'] . "\n";
            echo "  Assignee ID: " . $item['assignee_id'] . "\n";
            echo "  Reporter ID: " . ($item['reporter_id'] ?? 'NULL') . "\n";
            echo "  ---\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>