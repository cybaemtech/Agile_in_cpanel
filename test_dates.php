<?php
require_once 'api/config/database.php';

echo "=== Date Processing Test ===\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Test different date formats
    $testDates = [
        '2024-12-25',
        '2024-12-25 14:30:00',
        '2024/12/25',
        'December 25, 2024',
        null,
        '',
        'invalid-date'
    ];
    
    echo "Testing date processing:\n";
    foreach ($testDates as $testDate) {
        echo "\nTesting: " . var_export($testDate, true) . "\n";
        
        if ($testDate === null || $testDate === '' || $testDate === 'null') {
            echo "Result: NULL (empty date)\n";
            continue;
        }
        
        try {
            if (strlen($testDate) === 10) {
                $processed = $testDate . ' 00:00:00';
                echo "Result (start): $processed\n";
                $processed = $testDate . ' 23:59:59';
                echo "Result (end): $processed\n";
            } else {
                $processed = date('Y-m-d H:i:s', strtotime($testDate));
                echo "Result: $processed\n";
            }
        } catch (Exception $e) {
            echo "Error: " . $e->getMessage() . "\n";
        }
    }
    
    // Check current work items with dates
    echo "\n=== Current work items with dates ===\n";
    $stmt = $conn->prepare("
        SELECT id, title, start_date, end_date, created_at
        FROM work_items 
        WHERE start_date IS NOT NULL OR end_date IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($items)) {
        echo "No work items found with dates\n";
    } else {
        foreach ($items as $item) {
            echo "ID: {$item['id']}, Title: {$item['title']}\n";
            echo "  Start: {$item['start_date']}\n";
            echo "  End: {$item['end_date']}\n";
            echo "  Created: {$item['created_at']}\n\n";
        }
    }
    
    // Check work items without dates
    echo "=== Count of work items without dates ===\n";
    $stmt = $conn->prepare("
        SELECT 
            COUNT(*) as total,
            COUNT(start_date) as with_start,
            COUNT(end_date) as with_end
        FROM work_items
    ");
    $stmt->execute();
    $counts = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Total work items: {$counts['total']}\n";
    echo "With start date: {$counts['with_start']}\n";
    echo "With end date: {$counts['with_end']}\n";
    echo "Without start date: " . ($counts['total'] - $counts['with_start']) . "\n";
    echo "Without end date: " . ($counts['total'] - $counts['with_end']) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>