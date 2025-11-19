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
    
    echo "=== TEAM MEMBERS DEBUG ===\n\n";
    
    // Get all teams
    echo "1. ALL TEAMS:\n";
    $teams = $pdo->query("SELECT id, name FROM teams ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($teams as $team) {
        echo "   Team ID: {$team['id']} - {$team['name']}\n";
    }
    echo "\n";
    
    // Get all team members
    echo "2. ALL TEAM MEMBERS:\n";
    $stmt = $pdo->query("
        SELECT tm.*, u.email, u.full_name, t.name as team_name
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        JOIN teams t ON tm.team_id = t.id
        ORDER BY t.name, u.full_name
    ");
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($members)) {
        echo "   No team members found in database!\n\n";
    } else {
        foreach ($members as $member) {
            echo "   Team: {$member['team_name']} | User: {$member['full_name']} ({$member['email']}) | Role: {$member['role']} | Joined: {$member['joined_at']}\n";
        }
        echo "\n";
    }
    
    // Get all projects and their teams
    echo "3. PROJECTS AND THEIR TEAMS:\n";
    $stmt = $pdo->query("
        SELECT p.id, p.name, p.team_id, t.name as team_name
        FROM projects p
        LEFT JOIN teams t ON p.team_id = t.id
        ORDER BY p.name
    ");
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($projects as $project) {
        echo "   Project: {$project['name']} | Team ID: " . ($project['team_id'] ?: 'NULL') . " | Team: " . ($project['team_name'] ?: 'No team assigned') . "\n";
        
        if ($project['team_id']) {
            // Get members for this project's team
            $stmt = $pdo->prepare("
                SELECT u.full_name, u.email, tm.role
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ?
                ORDER BY u.full_name
            ");
            $stmt->execute([$project['team_id']]);
            $projectMembers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($projectMembers)) {
                echo "     - No members in team\n";
            } else {
                foreach ($projectMembers as $member) {
                    echo "     - {$member['full_name']} ({$member['email']}) - {$member['role']}\n";
                }
            }
        }
        echo "\n";
    }
    
    // Check for any orphaned team_members records
    echo "4. ORPHANED RECORDS CHECK:\n";
    $stmt = $pdo->query("
        SELECT tm.id, tm.team_id, tm.user_id 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        LEFT JOIN users u ON tm.user_id = u.id 
        WHERE t.id IS NULL OR u.id IS NULL
    ");
    $orphaned = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($orphaned)) {
        echo "   No orphaned records found - database integrity is good!\n\n";
    } else {
        echo "   Found orphaned team_members records:\n";
        foreach ($orphaned as $record) {
            echo "     - ID: {$record['id']}, Team: {$record['team_id']}, User: {$record['user_id']}\n";
        }
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>