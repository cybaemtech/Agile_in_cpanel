<?php
require_once 'config/cors.php';
require_once 'config/database.php';

session_start();

$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Handle OPTIONS preflight requests
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get path from centralized parsing in index.php or PATH_INFO fallback
$path = $_SERVER['AGILE_API_PATH'] ?? ($_SERVER['PATH_INFO'] ?? '/');
$path = rtrim($path, '/');
if ($path === '') $path = '/';

switch ($method . ':' . $path) {
    case 'GET:':
    case 'GET:/':
        getTeams($conn);
        break;
    
    case 'POST:':
    case 'POST:/':
        createTeam($conn);
        break;
    
    default:
        if (preg_match('/^\/(\d+)$/', $path, $matches)) {
            $teamId = $matches[1];
            if ($method === 'GET') {
                getTeam($conn, $teamId);
            } elseif ($method === 'DELETE') {
                deleteTeam($conn, $teamId);
            }
        } elseif (preg_match('/^\/(\d+)\/members$/', $path, $matches)) {
            $teamId = $matches[1];
            if ($method === 'GET') {
                getTeamMembers($conn, $teamId);
            } elseif ($method === 'POST') {
                addTeamMember($conn, $teamId);
            }
        } elseif (preg_match('/^\/(\d+)\/members\/(\d+)$/', $path, $matches)) {
            $teamId = $matches[1];
            $userId = $matches[2];
            if ($method === 'DELETE') {
                removeTeamMember($conn, $teamId, $userId);
            } elseif ($method === 'PATCH') {
                updateTeamMemberRole($conn, $teamId, $userId);
            }
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Endpoint not found']);
        }
        break;
}

function getTeams($conn) {
    try {
        $stmt = $conn->prepare("SELECT * FROM teams ORDER BY created_at DESC");
        $stmt->execute();
        $teams = $stmt->fetchAll();
        
        $teams = array_map(function($team) {
            return [
                'id' => (int)$team['id'],
                'name' => $team['name'],
                'description' => $team['description'],
                'createdBy' => (int)$team['created_by'],
                'isActive' => (bool)$team['is_active'],
                'createdAt' => $team['created_at'],
                'updatedAt' => $team['updated_at']
            ];
        }, $teams);
        
        echo json_encode($teams);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function getTeam($conn, $teamId) {
    try {
        $stmt = $conn->prepare("SELECT * FROM teams WHERE id = ?");
        $stmt->execute([$teamId]);
        $team = $stmt->fetch();
        
        if (!$team) {
            http_response_code(404);
            echo json_encode(['message' => 'Team not found']);
            return;
        }
        
        $team = [
            'id' => (int)$team['id'],
            'name' => $team['name'],
            'description' => $team['description'],
            'createdBy' => (int)$team['created_by'],
            'isActive' => (bool)$team['is_active'],
            'createdAt' => $team['created_at'],
            'updatedAt' => $team['updated_at']
        ];
        
        echo json_encode($team);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function createTeam($conn) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Team name is required']);
        return;
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO teams (name, description, created_by, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([
            $input['name'],
            $input['description'] ?? null,
            $_SESSION['user_id'],
            1 // is_active
        ]);
        $teamId = $conn->lastInsertId();

        // Add creator as ADMIN in team_members
        $addMemberStmt = $conn->prepare("
            INSERT INTO team_members (team_id, user_id, role, joined_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        $addMemberStmt->execute([
            $teamId,
            $_SESSION['user_id'],
            'ADMIN'
        ]);

        // Return created team
        getTeam($conn, $teamId);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function getTeamMembers($conn, $teamId) {
    try {
        $stmt = $conn->prepare("
            SELECT tm.*, u.username, u.email, u.full_name, u.avatar_url 
            FROM team_members tm 
            JOIN users u ON tm.user_id = u.id 
            WHERE tm.team_id = ?
        ");
        $stmt->execute([$teamId]);
        $members = $stmt->fetchAll();
        
        $members = array_map(function($member) {
            return [
                'id' => (int)$member['id'],
                'teamId' => (int)$member['team_id'],
                'userId' => (int)$member['user_id'],
                'role' => $member['role'],
                'joinedAt' => $member['joined_at'],
                'updatedAt' => $member['updated_at'],
                'user' => [
                    'id' => (int)$member['user_id'],
                    'username' => $member['username'],
                    'email' => $member['email'],
                    'fullName' => $member['full_name'],
                    'avatarUrl' => $member['avatar_url']
                ]
            ];
        }, $members);
        
        echo json_encode($members);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function addTeamMember($conn, $teamId) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    // Check if user has admin or scrum master role
    $stmt = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || !in_array($user['user_role'], ['ADMIN', 'SCRUM_MASTER'])) {
        http_response_code(403);
        echo json_encode(['message' => 'Only administrators or scrum masters can add team members']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['userId'])) {
        http_response_code(400);
        echo json_encode(['message' => 'User ID is required']);
        return;
    }
    
    try {
        $role = isset($input['role']) ? trim($input['role']) : 'MEMBER';
        
        // Validate role matches database enum values
        $validRoles = ['ADMIN', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER', 'SCRUM_MASTER'];
        if (!in_array($role, $validRoles)) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid role: ' . $role . '. Valid roles: ' . implode(', ', $validRoles)]);
            return;
        }
        
        $stmt = $conn->prepare("
            INSERT INTO team_members (team_id, user_id, role, joined_at, updated_at) 
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([$teamId, $input['userId'], $role]);
        
        http_response_code(201);
        echo json_encode(['message' => 'Team member added successfully']);
        
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            http_response_code(409);
            echo json_encode(['message' => 'User is already a member of this team']);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Internal server error']);
        }
    }
}

function removeTeamMember($conn, $teamId, $userId) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    // Check if user has admin or scrum master role
    $stmt = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || !in_array($user['user_role'], ['ADMIN', 'SCRUM_MASTER'])) {
        http_response_code(403);
        echo json_encode(['message' => 'Only administrators or scrum masters can remove team members']);
        return;
    }
    
    try {
        // Check if team member exists
        $stmt = $conn->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        $member = $stmt->fetch();
        
        if (!$member) {
            http_response_code(404);
            echo json_encode(['message' => 'Team member not found']);
            return;
        }
        
        // Remove team member
        $stmt = $conn->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Team member removed successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Team member not found']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function updateTeamMemberRole($conn, $teamId, $userId) {
    // Log the incoming request
    error_log("=== updateTeamMemberRole START ===");
    error_log("teamId: $teamId, userId: $userId");
    
    if (!isset($_SESSION['user_id'])) {
        error_log("Not authenticated - no session user_id");
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    error_log("Session user_id: " . $_SESSION['user_id']);
    
    // Check if user has admin or scrum master role
    $stmt = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || !in_array($user['user_role'], ['ADMIN', 'SCRUM_MASTER'])) {
        error_log("Permission denied - user role: " . ($user['user_role'] ?? 'null'));
        http_response_code(403);
        echo json_encode(['message' => 'Only administrators or scrum masters can update member roles']);
        return;
    }
    
    error_log("User has permission: " . $user['user_role']);
    
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    error_log("Raw input: " . $rawInput);
    error_log("Parsed input: " . json_encode($input));
    
    if (!isset($input['role'])) {
        error_log("Role is missing from input");
        http_response_code(400);
        echo json_encode(['message' => 'Role is required']);
        return;
    }
    
    $role = trim($input['role']);
    error_log("Role received: '$role' (length: " . strlen($role) . ")");

    // Only accept exact database enum values - match database schema exactly
    $validRoles = ['ADMIN', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER', 'SCRUM_MASTER'];
    error_log("Valid roles: " . json_encode($validRoles));
    
    if (!in_array($role, $validRoles)) {
        error_log("Invalid role detected: '$role'");
        http_response_code(400);
        echo json_encode(['message' => 'Invalid role: ' . $role . '. Valid roles: ' . implode(', ', $validRoles)]);
        return;
    }
    
    error_log("Role is valid: '$role'");
    
    try {
        // Check if team member exists
        $stmt = $conn->prepare("SELECT id, role FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        $member = $stmt->fetch();
        
        if (!$member) {
            error_log("Team member not found - teamId: $teamId, userId: $userId");
            http_response_code(404);
            echo json_encode(['message' => 'Team member not found']);
            return;
        }
        
        error_log("Current member role: '" . $member['role'] . "'");
        error_log("New role: '$role'");
        
        // Check if the role is actually different
        if ($member['role'] === $role) {
            error_log("Role is already the same, returning success");
            echo json_encode(['message' => 'Team member role updated successfully', 'role' => $role]);
            return;
        }
        
        // Update team member role
        error_log("Executing UPDATE query...");
        $stmt = $conn->prepare("UPDATE team_members SET role = ?, updated_at = NOW() WHERE team_id = ? AND user_id = ?");
        $result = $stmt->execute([$role, $teamId, $userId]);
        
        error_log("Query executed. Result: " . ($result ? 'true' : 'false'));
        error_log("Rows affected: " . $stmt->rowCount());
        
        if ($result) {
            error_log("SUCCESS: Role updated successfully");
            echo json_encode(['message' => 'Team member role updated successfully', 'role' => $role]);
        } else {
            error_log("FAILURE: Query executed but returned false");
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update role']);
        }
        
    } catch (PDOException $e) {
        error_log("PDO Exception: " . $e->getMessage());
        error_log("Error Code: " . $e->getCode());
        error_log("SQL State: " . $e->errorInfo[0] ?? 'unknown');
        http_response_code(500);
        echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
    } catch (Exception $e) {
        error_log("General Exception: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
    }
    
    error_log("=== updateTeamMemberRole END ===");
}

function deleteTeam($conn, $teamId) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    // Check if user has admin role
    $stmt = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || $user['user_role'] !== 'ADMIN') {
        http_response_code(403);
        echo json_encode(['message' => 'Only administrators can delete teams']);
        return;
    }
    
    try {
        // Check if team exists
        $stmt = $conn->prepare("SELECT id, name FROM teams WHERE id = ?");
        $stmt->execute([$teamId]);
        $team = $stmt->fetch();
        
        if (!$team) {
            http_response_code(404);
            echo json_encode(['message' => 'Team not found']);
            return;
        }
        
        // Check if team has associated projects
        $stmt = $conn->prepare("SELECT COUNT(*) as project_count FROM projects WHERE team_id = ?");
        $stmt->execute([$teamId]);
        $projectCount = $stmt->fetch()['project_count'];
        
        if ($projectCount > 0) {
            http_response_code(400);
            echo json_encode([
                'message' => 'Cannot delete team with associated projects',
                'details' => "This team has {$projectCount} project(s). Please reassign or delete the projects first."
            ]);
            return;
        }
        
        // Begin transaction
        $conn->beginTransaction();
        
        try {
            // Delete team members first (foreign key constraint)
            $stmt = $conn->prepare("DELETE FROM team_members WHERE team_id = ?");
            $stmt->execute([$teamId]);
            
            // Delete the team
            $stmt = $conn->prepare("DELETE FROM teams WHERE id = ?");
            $stmt->execute([$teamId]);
            
            if ($stmt->rowCount() > 0) {
                $conn->commit();
                echo json_encode([
                    'message' => 'Team deleted successfully',
                    'teamName' => $team['name']
                ]);
            } else {
                $conn->rollback();
                http_response_code(404);
                echo json_encode(['message' => 'Team not found']);
            }
            
        } catch (PDOException $e) {
            $conn->rollback();
            throw $e;
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}
?>