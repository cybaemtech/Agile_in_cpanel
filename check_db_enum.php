<?php
require_once 'api/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo "❌ Database connection failed\n";
        exit(1);
    }
    
    echo "✅ Database connection successful\n";
    
    // Check the exact enum values in the database
    $stmt = $conn->prepare("SHOW COLUMNS FROM team_members WHERE Field = 'role'");
    $stmt->execute();
    $roleColumn = $stmt->fetch();
    
    echo "\n📋 Current 'role' column definition:\n";
    echo "Type: " . $roleColumn['Type'] . "\n";
    echo "Default: " . $roleColumn['Default'] . "\n";
    
    // Extract enum values from the type definition
    if (preg_match("/^enum\((.+)\)$/", $roleColumn['Type'], $matches)) {
        $enumValues = str_getcsv($matches[1], ',', "'");
        echo "\n🎭 Valid enum values:\n";
        foreach ($enumValues as $value) {
            echo "  - '$value'\n";
        }
    }
    
    // Check current team members and their roles
    $stmt = $conn->prepare("SELECT DISTINCT role, COUNT(*) as count FROM team_members GROUP BY role");
    $stmt->execute();
    $roleCounts = $stmt->fetchAll();
    
    echo "\n👥 Current roles in use:\n";
    foreach ($roleCounts as $role) {
        echo "  - '{$role['role']}' ({$role['count']} members)\n";
    }
    
    // Test inserting each valid enum value
    echo "\n🧪 Testing enum value insertion:\n";
    $testEnumValues = ['ADMIN', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER'];
    
    foreach ($testEnumValues as $testRole) {
        try {
            // Try to insert a test record (we'll roll it back)
            $conn->beginTransaction();
            
            $stmt = $conn->prepare("INSERT INTO team_members (team_id, user_id, role) VALUES (999, 999, ?)");
            $result = $stmt->execute([$testRole]);
            
            if ($result) {
                echo "  ✅ '$testRole' - Valid\n";
            } else {
                echo "  ❌ '$testRole' - Invalid\n";
            }
            
            $conn->rollBack(); // Always rollback the test insert
            
        } catch (PDOException $e) {
            $conn->rollBack();
            echo "  ❌ '$testRole' - Error: " . $e->getMessage() . "\n";
        }
    }
    
    // Also test SCRUM_MASTER to see what happens
    try {
        $conn->beginTransaction();
        $stmt = $conn->prepare("INSERT INTO team_members (team_id, user_id, role) VALUES (999, 999, ?)");
        $result = $stmt->execute(['SCRUM_MASTER']);
        if ($result) {
            echo "  ✅ 'SCRUM_MASTER' - Valid\n";
        } else {
            echo "  ❌ 'SCRUM_MASTER' - Invalid\n";
        }
        $conn->rollBack();
    } catch (PDOException $e) {
        $conn->rollBack();
        echo "  ❌ 'SCRUM_MASTER' - Error: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>