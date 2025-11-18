<?php
require_once 'config/cors.php';
require_once 'config/database.php';

session_start();

$database = new Database();
$conn = $database->getConnection();

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
        getAllWorkItems($conn);
        break;
    
    case 'POST:':
    case 'POST:/':
        createWorkItem($conn);
        break;
    
    default:
        if (preg_match('/^\/(\d+)$/', $path, $matches)) {
            $workItemId = $matches[1];
            if ($method === 'GET') {
                getWorkItem($conn, $workItemId);
            } elseif ($method === 'PATCH') {
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input === null) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid JSON data']);
                    exit;
                }
                $success = updateWorkItem($conn, $workItemId, $input);
                if ($success) {
                    // Fetch and return the updated work item
                    getWorkItem($conn, $workItemId);
                } else {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to update work item']);
                }
            } elseif ($method === 'DELETE') {
                deleteWorkItem($conn, $workItemId);
            }
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Endpoint not found']);
        }
        break;
}

function getAllWorkItems($conn) {
    try {
        // Check if updated_by column exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
        $hasUpdatedBy = $checkColumn->rowCount() > 0;
        
        if ($hasUpdatedBy) {
            // Use updated_by column if it exists
            $stmt = $conn->prepare("
                SELECT 
                    wi.id,
                    wi.external_id as externalId,
                    wi.title,
                    wi.description,
                    wi.tags,
                    wi.type,
                    wi.status,
                    wi.priority,
                    wi.project_id as projectId,
                    wi.parent_id as parentId,
                    wi.assignee_id as assigneeId,
                    wi.reporter_id as reporterId,
                    wi.updated_by as updatedBy,
                    wi.estimate,
                    wi.start_date as startDate,
                    wi.end_date as endDate,
                    wi.completed_at as completedAt,
                    wi.created_at as createdAt,
                    wi.updated_at as updatedAt,
                    p.name as projectName,
                    p.`key` as projectKey,
                    assignee.full_name as assigneeName,
                    reporter.full_name as reporterName,
                    creator.full_name as createdByName,
                    updater.full_name as updatedByName
                FROM work_items wi
                LEFT JOIN projects p ON wi.project_id = p.id
                LEFT JOIN users assignee ON wi.assignee_id = assignee.id
                LEFT JOIN users reporter ON wi.reporter_id = reporter.id
                LEFT JOIN users creator ON wi.reporter_id = creator.id
                LEFT JOIN users updater ON wi.updated_by = updater.id
                ORDER BY wi.updated_at DESC
            ");
        } else {
            // Fallback to using reporter_id as updater if updated_by doesn't exist
            $stmt = $conn->prepare("
                SELECT 
                    wi.id,
                    wi.external_id as externalId,
                    wi.title,
                    wi.description,
                    wi.tags,
                    wi.type,
                    wi.status,
                    wi.priority,
                    wi.project_id as projectId,
                    wi.parent_id as parentId,
                    wi.assignee_id as assigneeId,
                    wi.reporter_id as reporterId,
                    wi.reporter_id as updatedBy,
                    wi.estimate,
                    wi.start_date as startDate,
                    wi.end_date as endDate,
                    wi.completed_at as completedAt,
                    wi.created_at as createdAt,
                    wi.updated_at as updatedAt,
                    p.name as projectName,
                    p.`key` as projectKey,
                    assignee.full_name as assigneeName,
                    reporter.full_name as reporterName,
                    creator.full_name as createdByName,
                    reporter.full_name as updatedByName
                FROM work_items wi
                LEFT JOIN projects p ON wi.project_id = p.id
                LEFT JOIN users assignee ON wi.assignee_id = assignee.id
                LEFT JOIN users reporter ON wi.reporter_id = reporter.id
                LEFT JOIN users creator ON wi.reporter_id = creator.id
                ORDER BY wi.updated_at DESC
            ");
        }
        
        $stmt->execute();
        $workItems = $stmt->fetchAll();
        
        // Format response for frontend
        $workItems = array_map(function($item) {
            return [
                'id' => (int)$item['id'],
                'externalId' => $item['externalId'],
                'title' => $item['title'],
                'description' => $item['description'],
                'tags' => $item['tags'],
                'type' => $item['type'],
                'status' => $item['status'],
                'priority' => $item['priority'],
                'projectId' => (int)$item['projectId'],
                'parentId' => $item['parentId'] ? (int)$item['parentId'] : null,
                'assigneeId' => $item['assigneeId'] ? (int)$item['assigneeId'] : null,
                'reporterId' => $item['reporterId'] ? (int)$item['reporterId'] : null,
                'updatedBy' => $item['updatedBy'] ? (int)$item['updatedBy'] : null,
                'estimate' => $item['estimate'] ? (int)$item['estimate'] : null,
                'startDate' => $item['startDate'],
                'endDate' => $item['endDate'],
                'completedAt' => $item['completedAt'],
                'createdAt' => $item['createdAt'],
                'updatedAt' => $item['updatedAt'],
                'projectName' => $item['projectName'],
                'projectKey' => $item['projectKey'],
                'assigneeName' => $item['assigneeName'],
                'reporterName' => $item['reporterName'],
                'createdByName' => $item['createdByName'],
                'updatedByName' => $item['updatedByName']
            ];
        }, $workItems);
        
        echo json_encode($workItems);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function getWorkItem($conn, $workItemId) {
    try {
        $stmt = $conn->prepare("
            SELECT 
                wi.id,
                wi.external_id as externalId,
                wi.title,
                wi.description,
                wi.tags,
                wi.type,
                wi.status,
                wi.priority,
                wi.project_id as projectId,
                wi.parent_id as parentId,
                wi.assignee_id as assigneeId,
                wi.reporter_id as reporterId,
                wi.updated_by as updatedBy,
                wi.estimate,
                wi.start_date as startDate,
                wi.end_date as endDate,
                wi.completed_at as completedAt,
                wi.created_at as createdAt,
                wi.updated_at as updatedAt,
                updater.full_name as updatedByName
            FROM work_items wi
            LEFT JOIN users updater ON wi.updated_by = updater.id
            WHERE wi.id = ?
        ");
        $stmt->execute([$workItemId]);
        $item = $stmt->fetch();
        
        if (!$item) {
            http_response_code(404);
            echo json_encode(['message' => 'Work item not found']);
            return;
        }
        
        $workItem = [
            'id' => (int)$item['id'],
            'externalId' => $item['externalId'],
            'title' => $item['title'],
            'description' => $item['description'],
            'tags' => $item['tags'],
            'type' => $item['type'],
            'status' => $item['status'],
            'priority' => $item['priority'],
            'projectId' => (int)$item['projectId'],
            'parentId' => $item['parentId'] ? (int)$item['parentId'] : null,
            'assigneeId' => $item['assigneeId'] ? (int)$item['assigneeId'] : null,
            'reporterId' => $item['reporterId'] ? (int)$item['reporterId'] : null,
            'updatedBy' => $item['updatedBy'] ? (int)$item['updatedBy'] : null,
            'estimate' => $item['estimate'] ? (int)$item['estimate'] : null,
            'startDate' => $item['startDate'],
            'endDate' => $item['endDate'],
            'completedAt' => $item['completedAt'],
            'createdAt' => $item['createdAt'],
            'updatedAt' => $item['updatedAt'],
            'updatedByName' => $item['updatedByName']
        ];
        
        echo json_encode($workItem);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}

function createWorkItem($conn) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Debug logging
    error_log("=== CREATE WORK ITEM DEBUG ===");
    error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'NOT SET'));
    error_log("Raw input: " . json_encode($input));
    
    // Validate required fields
    if (!isset($input['title']) || !isset($input['type']) || !isset($input['projectId'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Title, type, and projectId are required']);
        return;
    }
    
    $title = trim($input['title']);
    $type = trim($input['type']);
    $projectId = (int)$input['projectId'];
    
    if (empty($title) || empty($type) || $projectId <= 0) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid input data']);
        return;
    }
    
    try {
        // Debug logging
        error_log("=== CREATE WORK ITEM DEBUG ===");
        error_log("Session user_id: " . $_SESSION['user_id']);
        error_log("Project ID: " . $projectId);
        error_log("Title: " . $title);
        error_log("Type: " . $type);
        
        // Get project key for external ID generation
        $stmt = $conn->prepare("SELECT `key` FROM projects WHERE id = ?");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();
        
        if (!$project) {
            http_response_code(404);
            echo json_encode(['message' => 'Project not found']);
            return;
        }
        
        // Generate unique external ID (e.g., PROJ-001)
        // Get the highest existing number for this project key
        $stmt = $conn->prepare("
            SELECT external_id 
            FROM work_items 
            WHERE project_id = ? 
            AND external_id LIKE CONCAT(?, '-%')
            ORDER BY 
                CAST(SUBSTRING(external_id, LENGTH(?) + 2) AS UNSIGNED) DESC 
            LIMIT 1
        ");
        $stmt->execute([$projectId, $project['key'], $project['key']]);
        $lastItem = $stmt->fetch();
        
        if ($lastItem) {
            // Extract number from last external ID and increment
            $lastExternalId = $lastItem['external_id'];
            $lastNumber = (int)substr($lastExternalId, strlen($project['key']) + 1);
            $nextNumber = $lastNumber + 1;
        } else {
            // First item for this project
            $nextNumber = 1;
        }
        
        // Generate external ID with zero padding
        $externalId = $project['key'] . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        
        // Double-check uniqueness (in case of race conditions)
        $stmt = $conn->prepare("SELECT id FROM work_items WHERE external_id = ?");
        $stmt->execute([$externalId]);
        if ($stmt->fetch()) {
            // If still duplicate, use timestamp-based fallback
            $externalId = $project['key'] . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT) . '-' . time();
        }
        
        error_log("Generated external ID: " . $externalId);
        
        // Prepare optional fields
        $description = isset($input['description']) ? trim($input['description']) : null;
        $tags = isset($input['tags']) ? trim($input['tags']) : null;
        $status = isset($input['status']) ? trim($input['status']) : 'TODO';
        $priority = isset($input['priority']) ? trim($input['priority']) : 'MEDIUM';
        $parentId = isset($input['parentId']) && $input['parentId'] > 0 ? (int)$input['parentId'] : null;
        $assigneeId = isset($input['assigneeId']) && $input['assigneeId'] > 0 ? (int)$input['assigneeId'] : null;
        $reporterId = isset($input['reporterId']) && $input['reporterId'] > 0 ? (int)$input['reporterId'] : $_SESSION['user_id'];
        $estimate = isset($input['estimate']) && $input['estimate'] > 0 ? (int)$input['estimate'] : null;
        $startDate = null;
        $endDate = null;
        
        // Handle dates
        if (isset($input['startDate']) && !empty($input['startDate'])) {
            $startDate = date('Y-m-d H:i:s', strtotime($input['startDate']));
        }
        if (isset($input['endDate']) && !empty($input['endDate'])) {
            $endDate = date('Y-m-d H:i:s', strtotime($input['endDate']));
        }
        
        // Insert work item with proper updated_by tracking
        error_log("Preparing to insert work item with data:");
        error_log("External ID: " . $externalId);
        error_log("Title: " . $title);
        error_log("Description: " . $description);
        error_log("Tags: " . $tags);
        error_log("Type: " . $type);
        error_log("Status: " . $status);
        error_log("Priority: " . $priority);
        error_log("Project ID: " . $projectId);
        error_log("Parent ID: " . $parentId);
        error_log("Assignee ID: " . $assigneeId);
        error_log("Reporter ID: " . $reporterId);
        error_log("Estimate: " . $estimate);
        error_log("Start Date: " . $startDate);
        error_log("End Date: " . $endDate);
        
        // Check if updated_by column exists
        try {
            $checkColumn = $conn->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
            $hasUpdatedBy = $checkColumn->rowCount() > 0;
        } catch (PDOException $e) {
            $hasUpdatedBy = false;
        }
        
        if ($hasUpdatedBy) {
            // Include updated_by if column exists
            $stmt = $conn->prepare("
                INSERT INTO work_items (
                    external_id, title, description, tags, type, status, priority,
                    project_id, parent_id, assignee_id, reporter_id, updated_by, estimate,
                    start_date, end_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $success = $stmt->execute([
                $externalId, $title, $description, $tags, $type, $status, $priority,
                $projectId, $parentId, $assigneeId, $reporterId, $reporterId, $estimate,
                $startDate, $endDate
            ]);
        } else {
            // Skip updated_by if column doesn't exist
            $stmt = $conn->prepare("
                INSERT INTO work_items (
                    external_id, title, description, tags, type, status, priority,
                    project_id, parent_id, assignee_id, reporter_id, estimate,
                    start_date, end_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $success = $stmt->execute([
                $externalId, $title, $description, $tags, $type, $status, $priority,
                $projectId, $parentId, $assigneeId, $reporterId, $estimate,
                $startDate, $endDate
            ]);
        }
        
        if (!$success) {
            error_log("SQL execution failed: " . json_encode($stmt->errorInfo()));
            throw new PDOException("Failed to execute INSERT statement");
        }
        
        $workItemId = $conn->lastInsertId();
        
        // Return the created work item
        $stmt = $conn->prepare("
            SELECT 
                wi.id,
                wi.external_id as externalId,
                wi.title,
                wi.description,
                wi.tags,
                wi.type,
                wi.status,
                wi.priority,
                wi.project_id as projectId,
                wi.parent_id as parentId,
                wi.assignee_id as assigneeId,
                wi.reporter_id as reporterId,
                wi.estimate,
                wi.start_date as startDate,
                wi.end_date as endDate,
                wi.completed_at as completedAt,
                wi.created_at as createdAt,
                wi.updated_at as updatedAt
            FROM work_items wi
            WHERE wi.id = ?
        ");
        $stmt->execute([$workItemId]);
        $item = $stmt->fetch();
        
        if ($item) {
            $workItem = [
                'id' => (int)$item['id'],
                'externalId' => $item['externalId'],
                'title' => $item['title'],
                'description' => $item['description'],
                'tags' => $item['tags'],
                'type' => $item['type'],
                'status' => $item['status'],
                'priority' => $item['priority'],
                'projectId' => (int)$item['projectId'],
                'parentId' => $item['parentId'] ? (int)$item['parentId'] : null,
                'assigneeId' => $item['assigneeId'] ? (int)$item['assigneeId'] : null,
                'reporterId' => $item['reporterId'] ? (int)$item['reporterId'] : null,
                'estimate' => $item['estimate'] ? (int)$item['estimate'] : null,
                'startDate' => $item['startDate'],
                'endDate' => $item['endDate'],
                'completedAt' => $item['completedAt'],
                'createdAt' => $item['createdAt'],
                'updatedAt' => $item['updatedAt']
            ];
            
            http_response_code(201);
            echo json_encode($workItem);
        } else {
            http_response_code(201);
            echo json_encode(['message' => 'Work item created successfully', 'id' => $workItemId]);
        }
        
    } catch (PDOException $e) {
        error_log("Work Items API Error: " . $e->getMessage());
        error_log("SQL Error Info: " . print_r($e->errorInfo, true));
        http_response_code(500);
        echo json_encode([
            'message' => 'Internal server error',
            'error' => $e->getMessage(),
            'debug' => $e->errorInfo
        ]);
    }
}

function updateWorkItem($pdo, $id, $data) {
    // Debug logging
    error_log("=== UPDATE WORK ITEM DEBUG ===");
    error_log("Work item ID: " . $id);
    error_log("Raw input data: " . json_encode($data));
    
    // Map frontend camelCase fields to backend snake_case fields
    $fieldMapping = [
        'parentId' => 'parent_id',
        'assigneeId' => 'assignee_id',
        'startDate' => 'start_date',
        'endDate' => 'end_date'
    ];
    
    // Convert camelCase to snake_case
    $convertedData = [];
    foreach ($data as $key => $value) {
        $dbField = isset($fieldMapping[$key]) ? $fieldMapping[$key] : $key;
        $convertedData[$dbField] = $value;
    }
    
    error_log("Converted data: " . json_encode($convertedData));
    
    $allowedFields = ['title', 'description', 'tags', 'status', 'priority', 'assignee_id', 'estimate', 'start_date', 'end_date', 'parent_id'];
    
    $updateFields = [];
    $params = [':id' => $id];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $convertedData)) {
            error_log("Processing field: " . $field . " = " . json_encode($convertedData[$field]));
            $updateFields[] = "$field = :$field";
            $params[":$field"] = $convertedData[$field];
        }
    }
    
    if (empty($updateFields)) {
        error_log("No valid fields to update");
        throw new Exception('No valid fields to update');
    }

    // Check if updated_by column exists and add tracking if possible
    try {
        $checkColumn = $pdo->query("SHOW COLUMNS FROM work_items LIKE 'updated_by'");
        if ($checkColumn->rowCount() > 0 && isset($_SESSION['user_id'])) {
            $updateFields[] = "updated_by = :updated_by";
            $params[':updated_by'] = $_SESSION['user_id'];
        }
    } catch (PDOException $e) {
        // Ignore if we can't check the column
        error_log("Could not check for updated_by column: " . $e->getMessage());
    }
    
    $sql = "UPDATE work_items SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
    error_log("SQL Query: " . $sql);
    error_log("SQL Parameters: " . json_encode($params));
    
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute($params);
    
    error_log("SQL execution result: " . ($result ? 'SUCCESS' : 'FAILED'));
    if (!$result) {
        error_log("SQL Error: " . json_encode($stmt->errorInfo()));
    }
    error_log("=== UPDATE WORK ITEM DEBUG END ===");
    
    return $result;
}

function deleteWorkItem($conn, $workItemId) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Not authenticated']);
        return;
    }
    
    // Check user role - only ADMIN and SCRUM_MASTER can delete work items
    $userStmt = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
    $userStmt->execute([$_SESSION['user_id']]);
    $userRole = $userStmt->fetch()['user_role'] ?? null;
    
    if (!in_array($userRole, ['ADMIN', 'SCRUM_MASTER'])) {
        http_response_code(403);
        echo json_encode(['message' => 'Access denied. Only administrators and scrum masters can delete work items.']);
        return;
    }
    
    try {
        // Check if work item exists and get info
        $stmt = $conn->prepare("SELECT id FROM work_items WHERE id = ?");
        $stmt->execute([$workItemId]);
        
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['message' => 'Work item not found']);
            return;
        }
        
        // Check if there are child work items
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM work_items WHERE parent_id = ?");
        $stmt->execute([$workItemId]);
        $childCount = $stmt->fetch()['count'];
        
        if ($childCount > 0) {
            http_response_code(409);
            echo json_encode(['message' => 'Cannot delete work item with child items']);
            return;
        }
        
        // Delete work item
        $stmt = $conn->prepare("DELETE FROM work_items WHERE id = ?");
        $stmt->execute([$workItemId]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Work item deleted successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Work item not found']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Internal server error']);
    }
}
?>