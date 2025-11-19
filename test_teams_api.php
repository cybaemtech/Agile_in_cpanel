<?php
// Simple test script to debug teams API
session_start();

// Simulate being logged in as an admin user
$_SESSION['user_id'] = 1; // Assuming user ID 1 is an admin

echo "Testing Teams API endpoints...\n\n";

// Test database connection
require_once 'api/config/database.php';
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    echo "❌ Database connection failed\n";
    exit;
}
echo "✅ Database connection successful\n";

// Check if user exists and their role
$stmt = $conn->prepare("SELECT id, username, full_name, user_role FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if ($user) {
    echo "✅ User found: {$user['full_name']} ({$user['username']}) - Role: {$user['user_role']}\n";
} else {
    echo "❌ User not found\n";
    exit;
}

// Get list of teams to test against
$stmt = $conn->prepare("SELECT id, name FROM teams LIMIT 5");
$stmt->execute();
$teams = $stmt->fetchAll();

echo "📋 Available teams:\n";
foreach ($teams as $team) {
    echo "  - Team {$team['id']}: {$team['name']}\n";
}

// Check team members for first team
if (!empty($teams)) {
    $teamId = $teams[0]['id'];
    $stmt = $conn->prepare("
        SELECT tm.id, tm.user_id, u.full_name, u.email, tm.role 
        FROM team_members tm 
        JOIN users u ON tm.user_id = u.id 
        WHERE tm.team_id = ?
    ");
    $stmt->execute([$teamId]);
    $members = $stmt->fetchAll();
    
    echo "\n👥 Members in team {$teamId}:\n";
    foreach ($members as $member) {
        echo "  - User {$member['user_id']}: {$member['full_name']} ({$member['email']}) - Role: {$member['role']}\n";
    }
    
    // Test remove member simulation for first member if exists
    if (!empty($members)) {
        $testUserId = $members[0]['user_id'];
        echo "\n🧪 Testing member removal simulation for user {$testUserId}...\n";
        
        // Check if member exists before removal
        $stmt = $conn->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $testUserId]);
        $memberExists = $stmt->fetch();
        
        if ($memberExists) {
            echo "✅ Member exists in team_members table\n";
            echo "📋 Would remove member with DELETE query: DELETE FROM team_members WHERE team_id = {$teamId} AND user_id = {$testUserId}\n";
        } else {
            echo "❌ Member not found in team_members table\n";
        }
    }
}

echo "\n🔍 Session info:\n";
echo "  - Session ID: " . session_id() . "\n";
echo "  - User ID in session: " . ($_SESSION['user_id'] ?? 'NOT SET') . "\n";

echo "\n✅ Test completed successfully!\n";
?>