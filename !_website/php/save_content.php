<?php
chdir("../../");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Path to the file
    $path = $_POST['path'];
    
    // Edited content
    $content = $_POST['content'];

    // Save the content to the specified path
    if (file_put_contents($path, $content) !== false) {
        // Content saved successfully
        http_response_code(200); // Successful response
        echo 'Content saved successfully';
    } else {
        // Error saving content
        http_response_code(500); // Internal Server Error
        echo 'Error saving content';
    }
}
?>
