<?php
// API Proxy for DreamHost shared hosting
// This file proxies API requests to the Node.js backend

// Log the request for debugging
error_log("PHP Proxy: Handling request - " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);

// Check if this is a special memory route for social media bots
if (isset($_GET['route']) && $_GET['route'] === 'memory') {
    $username = $_GET['username'] ?? '';
    $slug = $_GET['slug'] ?? '';
    
    if ($username && $slug) {
        // Forward to Node.js backend memory route
        $backendUrl = "http://localhost:3001/u/{$username}/memory/{$slug}";
        error_log("PHP Proxy: Forwarding memory request to: " . $backendUrl);
        
        // Get user agent and forward it
        $headers = array(
            'User-Agent: ' . ($_SERVER['HTTP_USER_AGENT'] ?? 'PHP-Proxy')
        );
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $backendUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        http_response_code($httpCode);
        
        if ($response !== false) {
            // Set content type to HTML for meta tag responses
            header('Content-Type: text/html; charset=utf-8');
            echo $response;
        } else {
            error_log("PHP Proxy: cURL error for memory request");
            http_response_code(500);
            echo 'Proxy Error';
        }
        exit;
    }
}

// Only allow API requests
if (strpos($_SERVER['REQUEST_URI'], '/api/') !== 0) {
    error_log("PHP Proxy: Not an API request, returning 404");
    http_response_code(404);
    exit('Not Found');
}

// Get the API endpoint
$apiPath = substr($_SERVER['REQUEST_URI'], 4); // Remove '/api' prefix

// Backend URL - Production backend runs on port 3000
$backendUrl = 'http://localhost:3000/api' . $apiPath;
error_log("PHP Proxy: Forwarding to backend URL: " . $backendUrl);

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Forward headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward request body for POST/PUT requests
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);

if ($curlError) {
    error_log("PHP Proxy: cURL error: " . $curlError);
}

error_log("PHP Proxy: Backend response - HTTP " . $httpCode . " - Length: " . strlen($response));

curl_close($ch);

// Set response headers
http_response_code($httpCode);
header('Content-Type: ' . ($contentType ?: 'application/json'));
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS preflight requests
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Output response
echo $response;
?>
