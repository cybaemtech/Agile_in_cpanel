<?php
// Pure PHP server to serve React frontend + PHP API
$host = '0.0.0.0';
$port = 5000;
$publicDir = __DIR__ . '/dist/public';
$apiDir = __DIR__ . '/api';

// Create simple PHP router
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle API requests
if (strpos($requestUri, '/api/') === 0) {
    // Remove /api from the path and route to appropriate PHP file
    $apiPath = str_replace('/api', '', $requestUri);
    
    // Set proper headers for API
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($requestMethod === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    // Route to appropriate API file
    if (strpos($apiPath, '/auth') === 0) {
        chdir($apiDir);
        include $apiDir . '/auth.php';
    } elseif (strpos($apiPath, '/users') === 0) {
        chdir($apiDir);
        include $apiDir . '/users.php';
    } elseif (strpos($apiPath, '/teams') === 0) {
        chdir($apiDir);
        include $apiDir . '/teams.php';
    } elseif (strpos($apiPath, '/projects') === 0) {
        chdir($apiDir);
        include $apiDir . '/projects.php';
    } else {
        http_response_code(404);
        echo json_encode(['message' => 'API endpoint not found']);
    }
    exit;
}

// Serve static files from dist/public
$requestPath = parse_url($requestUri, PHP_URL_PATH);
$filePath = $publicDir . $requestPath;

// Serve index.html for SPA routes
if ($requestPath === '/' || !file_exists($filePath)) {
    $filePath = $publicDir . '/index.html';
}

if (file_exists($filePath)) {
    $mimeType = mime_content_type($filePath) ?: 'text/plain';
    header('Content-Type: ' . $mimeType);
    readfile($filePath);
} else {
    http_response_code(404);
    echo 'File not found';
}
?>