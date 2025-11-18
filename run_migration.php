<?php
// Run project access migration
$servername = 'localhost';
$username = 'cybaemtechin_agile';
$password = 'Agile@9090$';
$dbname = 'cybaemtechin_agile';

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Running project access migration...\n";
    
    $sql = file_get_contents('database_project_access_migration.sql');
    
    if ($sql === false) {
        throw new Exception('Could not read migration file');
    }
    
    // Split by semicolon and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            echo "Executing: " . substr($statement, 0, 50) . "...\n";
            $pdo->exec($statement);
        }
    }
    
    echo "Migration completed successfully!\n";
    
} catch(PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
} catch(Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>