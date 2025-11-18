<?php
require_once 'api/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check the actual structure of work_items table
    echo "=== Work Items Table Structure ===\n";
    $stmt = $conn->prepare("DESCRIBE work_items");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo $column['Field'] . " - " . $column['Type'] . " - " . $column['Null'] . " - " . $column['Key'] . " - " . $column['Default'] . "\n";
    }
    
    // Specifically check for updated_by and last_updated_by fields
    echo "\n=== Checking for update tracking fields ===\n";
    $stmt = $conn->query("SHOW COLUMNS FROM work_items LIKE '%updated%'");
    $updateFields = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($updateFields)) {
        echo "No update tracking fields found!\n";
    } else {
        foreach ($updateFields as $field) {
            echo "Found: " . $field['Field'] . " - " . $field['Type'] . "\n";
        }
    }
    
    // Check a sample record to see what data we have
    echo "\n=== Sample work item data ===\n";
    $stmt = $conn->prepare("SELECT id, title, updated_at, reporter_id FROM work_items LIMIT 1");
    $stmt->execute();
    $sample = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($sample) {
        foreach ($sample as $key => $value) {
            echo "$key: $value\n";
        }
    } else {
        echo "No work items found in database\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>