<?php
// Simple debug script to see what's happening with sitemap requests
error_log("=== SITEMAP DEBUG START ===");
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
error_log("SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME']);
error_log("QUERY_STRING: " . $_SERVER['QUERY_STRING']);
error_log("GET params: " . print_r($_GET, true));
error_log("POST params: " . print_r($_POST, true));
error_log("SERVER: " . print_r($_SERVER, true));
error_log("=== SITEMAP DEBUG END ===");

// Output something visible
header('Content-Type: text/plain');
echo "SITEMAP DEBUG SCRIPT\n";
echo "===================\n";
echo "REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "QUERY_STRING: " . $_SERVER['QUERY_STRING'] . "\n";
echo "GET route param: " . ($_GET['route'] ?? 'NOT SET') . "\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";

if (isset($_GET['route']) && $_GET['route'] === 'sitemap') {
    echo "\n*** SITEMAP ROUTE DETECTED! ***\n";
} else {
    echo "\n*** SITEMAP ROUTE NOT DETECTED ***\n";
}
?>