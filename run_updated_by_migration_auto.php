<?php
// Run updated_by tracking migration for local XAMPP
$servername = 'localhost';
$username = 'root';
$password = '';
$dbname = 'agile';

try {
    echo "Attempting to connect to local database: $dbname\n";
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected successfully! Running updated_by tracking migration...\n";
    
    // First, check if the column already exists
    $checkColumn = $pdo->query("DESCRIBE work_items");
    $columns = $checkColumn->fetchAll();
    $updatedByExists = false;
    
    foreach ($columns as $column) {
        if ($column['Field'] === 'updated_by') {
            $updatedByExists = true;
            break;
        }
    }
    
    if ($updatedByExists) {
        echo "Column 'updated_by' already exists. Skipping migration.\n";
    } else {
        echo "Adding updated_by column...\n";
        
        // Add the column
        $pdo->exec("ALTER TABLE work_items ADD COLUMN updated_by int(11) DEFAULT NULL COMMENT 'User who last updated this work item' AFTER reporter_id");
        
        // Add index
        $pdo->exec("ALTER TABLE work_items ADD INDEX idx_work_items_updated_by (updated_by)");
        
        // Add foreign key constraint
        $pdo->exec("ALTER TABLE work_items ADD CONSTRAINT fk_work_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL");
        
        // Update existing records
        $pdo->exec("UPDATE work_items SET updated_by = reporter_id WHERE updated_by IS NULL AND reporter_id IS NOT NULL");
        
        echo "Migration completed successfully!\n";
    }
    
} catch(PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    echo "Trying production database...\n";
    
    // Try production settings
    try {
        $servername = 'localhost';
        $username = 'cybaemtechin_agile';
        $password = 'Agile@9090$';
        $dbname = 'cybaemtechin_agile';
        
        $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "Connected to production database! Running migration...\n";
        
        // Check if column exists
        $checkColumn = $pdo->query("DESCRIBE work_items");
        $columns = $checkColumn->fetchAll();
        $updatedByExists = false;
        
        foreach ($columns as $column) {
            if ($column['Field'] === 'updated_by') {
                $updatedByExists = true;
                break;
            }
        }
        
        if ($updatedByExists) {
            echo "Column 'updated_by' already exists. Skipping migration.\n";
        } else {
            // Add the column
            $pdo->exec("ALTER TABLE work_items ADD COLUMN updated_by int(11) DEFAULT NULL COMMENT 'User who last updated this work item' AFTER reporter_id");
            
            // Add index  
            $pdo->exec("ALTER TABLE work_items ADD INDEX idx_work_items_updated_by (updated_by)");
            
            // Add foreign key constraint
            $pdo->exec("ALTER TABLE work_items ADD CONSTRAINT fk_work_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL");
            
            // Update existing records
            $pdo->exec("UPDATE work_items SET updated_by = reporter_id WHERE updated_by IS NULL AND reporter_id IS NOT NULL");
            
            echo "Production migration completed successfully!\n";
        }
        
    } catch(PDOException $prodE) {
        echo "Production Database Error: " . $prodE->getMessage() . "\n";
    }
} catch(Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>