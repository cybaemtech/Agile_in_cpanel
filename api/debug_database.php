<?php
// Database structure verification script
require_once 'config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        echo "❌ Failed to connect to database\n";
        exit;
    }
    
    // Check if tags column exists in work_items table
    $stmt = $pdo->query("DESCRIBE work_items");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== work_items table structure ===\n";
    $tagsColumnExists = false;
    foreach ($columns as $column) {
        echo $column['Field'] . " - " . $column['Type'] . "\n";
        if ($column['Field'] === 'tags') {
            $tagsColumnExists = true;
        }
    }
    
    if ($tagsColumnExists) {
        echo "\n✅ Tags column exists in database\n";
        
        // Test data retrieval
        $stmt = $pdo->query("SELECT id, external_id, title, tags FROM work_items LIMIT 5");
        $workItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\n=== Sample work items with tags ===\n";
        foreach ($workItems as $item) {
            echo "ID: {$item['id']} | External ID: {$item['external_id']} | Title: {$item['title']} | Tags: " . ($item['tags'] ?? 'NULL') . "\n";
        }
    } else {
        echo "\n❌ Tags column does NOT exist in database\n";
        echo "Please run the migration: database_migration_add_tags.sql\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>