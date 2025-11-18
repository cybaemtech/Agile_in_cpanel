<?php
// Simple test to create a work item with dates
require_once 'api/config/database.php';

session_start();

// Simulate being logged in
$_SESSION['user_id'] = 1; // Assuming user ID 1 exists

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Test data
    $testData = [
        'title' => 'Test Story with Dates',
        'description' => 'This is a test story to verify date storage',
        'type' => 'STORY',
        'status' => 'TODO',
        'priority' => 'MEDIUM',
        'projectId' => 1, // Assuming project ID 1 exists
        'startDate' => '2024-12-01',
        'endDate' => '2024-12-31'
    ];
    
    echo "=== Testing Date Storage ===\n";
    echo "Test data: " . json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";
    
    // Simulate the date processing logic from the API
    $startDate = null;
    $endDate = null;
    
    if (isset($testData['startDate']) && !empty($testData['startDate']) && $testData['startDate'] !== null) {
        echo "Processing startDate: " . $testData['startDate'] . "\n";
        if (strlen($testData['startDate']) === 10) {
            $startDate = $testData['startDate'] . ' 00:00:00';
        } else {
            $startDate = date('Y-m-d H:i:s', strtotime($testData['startDate']));
        }
        echo "Processed startDate: " . $startDate . "\n";
    }
    
    if (isset($testData['endDate']) && !empty($testData['endDate']) && $testData['endDate'] !== null) {
        echo "Processing endDate: " . $testData['endDate'] . "\n";
        if (strlen($testData['endDate']) === 10) {
            $endDate = $testData['endDate'] . ' 23:59:59';
        } else {
            $endDate = date('Y-m-d H:i:s', strtotime($testData['endDate']));
        }
        echo "Processed endDate: " . $endDate . "\n";
    }
    
    // Check if project exists
    $projectCheck = $conn->prepare("SELECT id, name FROM projects WHERE id = ?");
    $projectCheck->execute([1]);
    $project = $projectCheck->fetch();
    
    if (!$project) {
        echo "Error: Project with ID 1 not found\n";
        exit(1);
    }
    
    echo "\nProject found: " . $project['name'] . "\n";
    
    // Generate external ID
    $externalId = 'TEST-' . time();
    echo "External ID: " . $externalId . "\n\n";
    
    // Insert the test work item
    $stmt = $conn->prepare("
        INSERT INTO work_items (
            external_id, title, description, type, status, priority,
            project_id, reporter_id, estimate,
            start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $params = [
        $externalId, 
        $testData['title'], 
        $testData['description'], 
        $testData['type'], 
        $testData['status'], 
        $testData['priority'],
        $testData['projectId'], 
        $_SESSION['user_id'], 
        null,  // estimate
        $startDate, 
        $endDate
    ];
    
    echo "Insert parameters: " . json_encode($params, JSON_PRETTY_PRINT) . "\n\n";
    
    $success = $stmt->execute($params);
    
    if ($success) {
        $workItemId = $conn->lastInsertId();
        echo "✓ Work item created successfully with ID: $workItemId\n\n";
        
        // Verify the data was stored correctly
        $verifyStmt = $conn->prepare("
            SELECT id, external_id, title, start_date, end_date, created_at 
            FROM work_items 
            WHERE id = ?
        ");
        $verifyStmt->execute([$workItemId]);
        $stored = $verifyStmt->fetch();
        
        echo "=== Verification ===\n";
        echo "Stored data:\n";
        echo "ID: " . $stored['id'] . "\n";
        echo "External ID: " . $stored['external_id'] . "\n";
        echo "Title: " . $stored['title'] . "\n";
        echo "Start Date: " . ($stored['start_date'] ?? 'NULL') . "\n";
        echo "End Date: " . ($stored['end_date'] ?? 'NULL') . "\n";
        echo "Created: " . $stored['created_at'] . "\n";
        
        // Check if dates were stored correctly
        if ($stored['start_date'] === $startDate) {
            echo "✓ Start date stored correctly\n";
        } else {
            echo "✗ Start date mismatch: expected '$startDate', got '" . ($stored['start_date'] ?? 'NULL') . "'\n";
        }
        
        if ($stored['end_date'] === $endDate) {
            echo "✓ End date stored correctly\n";
        } else {
            echo "✗ End date mismatch: expected '$endDate', got '" . ($stored['end_date'] ?? 'NULL') . "'\n";
        }
        
    } else {
        echo "✗ Failed to create work item\n";
        echo "SQL Error: " . json_encode($stmt->errorInfo()) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>