<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $path = $_POST['path']; // Path to the file
    if(substr($path, 0, 1) == '/'){
        $path = substr($path, 1, strlen($path)-1);
    }
    $content = $_POST['content']; // Edited content

    echo ">>> " . $path. "\n";
    if(file_exists($path)){
        echo "file exists!\n";
    }else{
        echo "file doesnt exist!\n";
    }

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
