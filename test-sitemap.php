<?php
// Simple test to see what's actually happening with the sitemap request
error_log("=== SITEMAP TEST START ===");
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
error_log("GET parameters: " . print_r($_GET, true));

if (isset($_GET['route']) && $_GET['route'] === 'sitemap') {
    error_log("SITEMAP: Route matched!");
    echo "SITEMAP ROUTE MATCHED!";
} else {
    error_log("SITEMAP: Route NOT matched");
    echo "ROUTE NOT MATCHED - GET route = " . ($_GET['route'] ?? 'NOT SET');
}

error_log("=== SITEMAP TEST END ===");
?>