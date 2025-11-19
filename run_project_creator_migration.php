<?php
require_once 'api/config/database.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Database connection failed");
    }
    
    echo "Connected to database successfully.\n\n";
    
    // Check if columns already exist
    $checkColumns = $pdo->query("SHOW COLUMNS FROM projects LIKE 'createdByName'");
    if ($checkColumns->rowCount() > 0) {
        echo "Columns already exist. Skipping creation.\n";
    } else {
        echo "Adding createdByName and createdByEmail columns to projects table...\n";
        
        // Add the new columns
        $pdo->exec("ALTER TABLE `projects` 
                   ADD COLUMN `createdByName` VARCHAR(255) NULL AFTER `created_by`,
                   ADD COLUMN `createdByEmail` VARCHAR(255) NULL AFTER `createdByName`");
        
        echo "Columns added successfully.\n";
    }
    
    // Update existing projects with creator info
    echo "\nUpdating existing projects with creator information...\n";
    
    $updateStmt = $pdo->prepare("
        UPDATE `projects` p 
        JOIN `users` u ON p.created_by = u.id 
        SET 
            p.createdByName = COALESCE(u.full_name, u.username, 'Unknown User'),
            p.createdByEmail = COALESCE(u.email, 'unknown@example.com')
        WHERE (p.createdByName IS NULL OR p.createdByEmail IS NULL)
    ");
    
    $result = $updateStmt->execute();
    $affectedRows = $updateStmt->rowCount();
    
    if ($result) {
        echo "Updated {$affectedRows} projects with creator information.\n";
    } else {
        echo "No projects needed updating.\n";
    }
    
    // Verify the migration
    echo "\nVerifying migration...\n";
    $verifyStmt = $pdo->query("SELECT COUNT(*) as total, 
                               COUNT(createdByName) as with_name, 
                               COUNT(createdByEmail) as with_email 
                               FROM projects");
    $result = $verifyStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Total projects: {$result['total']}\n";
    echo "Projects with creator name: {$result['with_name']}\n";
    echo "Projects with creator email: {$result['with_email']}\n";
    
    echo "\nMigration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>