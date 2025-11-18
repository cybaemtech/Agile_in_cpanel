<?php
// Simple test to check if the API works without the updated_by column
$servername = 'localhost';
$username = 'root';
$password = '';
$dbname = 'agile';

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Testing API compatibility...\n";
    
    // Test if updated_by column exists
    $checkColumn = $pdo->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
    if ($checkColumn->rowCount() > 0) {
        echo "✅ updated_by column exists in database\n";
        $hasUpdatedBy = true;
    } else {
        echo "⚠️  updated_by column does not exist yet\n";
        $hasUpdatedBy = false;
    }
    
    // Test a basic SELECT query
    $stmt = $pdo->prepare("SELECT id, title, updated_at, reporter_id FROM work_items LIMIT 1");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result) {
        echo "✅ Basic query works\n";
        echo "   Sample item: " . $result['title'] . "\n";
        echo "   Updated at: " . $result['updated_at'] . "\n";
        
        if ($hasUpdatedBy) {
            echo "✅ Ready for full updated_by tracking\n";
        } else {
            echo "⚠️  Currently using fallback (reporter as updater)\n";
            echo "   Run database migration to enable full tracking\n";
        }
    } else {
        echo "⚠️  No work items found in database\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "   Trying production database...\n";
    
    try {
        $pdo = new PDO("mysql:host=localhost;dbname=cybaemtechin_agile", 'cybaemtechin_agile', 'Agile@9090$');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "✅ Production database connected\n";
        
        // Test if updated_by column exists
        $checkColumn = $pdo->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
        if ($checkColumn->rowCount() > 0) {
            echo "✅ updated_by column exists in production database\n";
        } else {
            echo "⚠️  updated_by column does not exist in production yet\n";
        }
        
    } catch (PDOException $prodE) {
        echo "❌ Production database also failed: " . $prodE->getMessage() . "\n";
    }
}
?>