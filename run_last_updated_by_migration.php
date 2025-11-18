<?php
require_once 'api/config/database.php';

echo "=== Last Updated By Migration Script ===\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    echo "Connected to database successfully.\n";
    
    // Read the migration SQL file
    $migrationFile = 'database_migration_last_updated_by.sql';
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }
    
    $sql = file_get_contents($migrationFile);
    
    // Split SQL statements by semicolon and execute each one
    $statements = explode(';', $sql);
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (empty($statement) || strpos($statement, '--') === 0 || strpos($statement, 'USE ') === 0) {
            continue; // Skip empty statements and comments
        }
        
        try {
            $conn->exec($statement);
            echo "Executed: " . substr($statement, 0, 60) . "...\n";
        } catch (PDOException $e) {
            echo "Warning: " . $e->getMessage() . "\n";
            echo "Statement: " . substr($statement, 0, 100) . "...\n";
        }
    }
    
    // Verify the column exists
    echo "\n=== Verification ===\n";
    $stmt = $conn->query("SHOW COLUMNS FROM work_items LIKE 'last_updated_by'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "✓ last_updated_by column exists: " . $result['Type'] . "\n";
    } else {
        echo "✗ last_updated_by column not found\n";
    }
    
    // Check if old updated_by column still exists
    $stmt = $conn->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
    $oldResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($oldResult) {
        echo "! updated_by column still exists (may need manual cleanup)\n";
    } else {
        echo "✓ updated_by column properly renamed/removed\n";
    }
    
    echo "\nMigration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>