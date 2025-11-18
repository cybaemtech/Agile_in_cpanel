<?php
/**
 * Database diagnostic script for production database
 * This script checks the enum values and tests role insertion
 */

echo "🔍 Testing Production Database Connection and Enum Values\n";
echo "================================================\n\n";

// Production database configuration from .env
$host = '103.48.43.49';
$port = '3306';
$dbname = 'cybaemtechin_agile';  
$username = 'cybaemtechin_agile';
$password = 'Agile@9090$';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    echo "✅ Connected to production database successfully!\n\n";
    
    // 1. Check table structure for team_members
    echo "📊 Checking team_members table structure:\n";
    $stmt = $pdo->prepare("DESCRIBE team_members");
    $stmt->execute();
    $columns = $stmt->fetchAll();
    
    foreach ($columns as $column) {
        if ($column['Field'] === 'role') {
            echo "   Role column: " . $column['Type'] . "\n";
            echo "   Default: " . ($column['Default'] ?? 'NULL') . "\n";
            echo "   Null: " . $column['Null'] . "\n";
        }
    }
    echo "\n";
    
    // 2. Extract enum values from the role column
    echo "🎭 Extracting enum values from role column:\n";
    $stmt = $pdo->prepare("SHOW COLUMNS FROM team_members LIKE 'role'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result && $result['Type']) {
        echo "   Raw type definition: " . $result['Type'] . "\n";
        
        // Parse enum values
        preg_match("/enum\((.+)\)/", $result['Type'], $matches);
        if (isset($matches[1])) {
            $enumValues = str_getcsv($matches[1], ',', "'");
            echo "   Parsed enum values: " . implode(', ', $enumValues) . "\n";
        }
    }
    echo "\n";
    
    // 3. Check current team members and their roles
    echo "👥 Current team members and their roles:\n";
    $stmt = $pdo->prepare("SELECT id, team_id, user_id, role, created_at FROM team_members ORDER BY created_at DESC LIMIT 10");
    $stmt->execute();
    $members = $stmt->fetchAll();
    
    if (empty($members)) {
        echo "   No team members found in database\n";
    } else {
        echo "   Recent team members:\n";
        foreach ($members as $member) {
            echo "   - ID: {$member['id']}, Team: {$member['team_id']}, User: {$member['user_id']}, Role: '{$member['role']}'\n";
        }
    }
    echo "\n";
    
    // 4. Test inserting different role values
    echo "🧪 Testing role value insertion:\n";
    $testRoles = ['ADMIN', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER', 'SCRUM_MASTER'];
    
    // First, let's find a test team and user to work with
    $stmt = $pdo->prepare("SELECT id FROM teams LIMIT 1");
    $stmt->execute();
    $testTeam = $stmt->fetch();
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE user_role IN ('ADMIN', 'SCRUM_MASTER') LIMIT 1");
    $stmt->execute();
    $testUser = $stmt->fetch();
    
    if (!$testTeam || !$testUser) {
        echo "   ❌ Cannot test - no test team or user found\n";
    } else {
        echo "   Using test team ID: {$testTeam['id']}, test user ID: {$testUser['id']}\n";
        
        foreach ($testRoles as $role) {
            echo "   Testing role: '$role' ... ";
            
            try {
                // First delete any existing test record
                $stmt = $pdo->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'TEST_ROLE'");
                $stmt->execute([$testTeam['id'], $testUser['id']]);
                
                // Try to insert with this role
                $stmt = $pdo->prepare("INSERT INTO team_members (team_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
                $result = $stmt->execute([$testTeam['id'], $testUser['id'], $role]);
                
                if ($result) {
                    echo "✅ SUCCESS\n";
                    
                    // Clean up - delete the test record
                    $stmt = $pdo->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?");
                    $stmt->execute([$testTeam['id'], $testUser['id'], $role]);
                } else {
                    echo "❌ FAILED\n";
                }
                
            } catch (PDOException $e) {
                echo "❌ ERROR: " . $e->getMessage() . "\n";
            }
        }
    }
    echo "\n";
    
    // 5. Test UPDATE operation with different roles
    echo "🔄 Testing UPDATE operation:\n";
    if ($testTeam && $testUser) {
        // Insert a test member first
        try {
            $stmt = $pdo->prepare("INSERT INTO team_members (team_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'MEMBER', NOW(), NOW())");
            $stmt->execute([$testTeam['id'], $testUser['id']]);
            echo "   Created test member with role 'MEMBER'\n";
            
            // Now try updating to different roles
            foreach (['ADMIN', 'MANAGER', 'LEAD', 'VIEWER'] as $newRole) {
                echo "   Updating to '$newRole' ... ";
                
                try {
                    $stmt = $pdo->prepare("UPDATE team_members SET role = ?, updated_at = NOW() WHERE team_id = ? AND user_id = ?");
                    $result = $stmt->execute([$newRole, $testTeam['id'], $testUser['id']]);
                    
                    if ($result && $stmt->rowCount() > 0) {
                        echo "✅ SUCCESS (rows affected: " . $stmt->rowCount() . ")\n";
                    } else {
                        echo "❌ FAILED (no rows affected)\n";
                    }
                } catch (PDOException $e) {
                    echo "❌ ERROR: " . $e->getMessage() . "\n";
                }
            }
            
            // Clean up
            $stmt = $pdo->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?");
            $stmt->execute([$testTeam['id'], $testUser['id']]);
            echo "   Cleaned up test records\n";
            
        } catch (PDOException $e) {
            echo "   ❌ Test setup failed: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n🎯 Summary: Database connection successful. Check the results above for enum compatibility.\n";
    
} catch (PDOException $e) {
    echo "❌ Database connection error: " . $e->getMessage() . "\n";
    echo "DSN used: $dsn\n";
    echo "Username: $username\n";
}
?>