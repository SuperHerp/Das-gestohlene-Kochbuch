<?php
function check_dir($path){
    return substr($path, -1) === '/' ? true : false;
}
function check_file($path){
    return substr($path, -3) === '.md' ? true : false;
}

function path2TOC($path){
    $pathArray = explode("/", $path);
    $relPath = '';
    for ($i=0; $i < count($pathArray)-2; $i++) { 
        $relPath = $relPath . '../';
    }
    $title = array_pop($pathArray);
    $tocLink = "[Inhaltsverzeichnis](" . $relPath . "README.md" . ")\n\n# " . substr($title, 0, strlen($title)-3) . "\n\n## Zutaten\n\n- ...\n- ...\n\n## Allgemein\n\n**x-Zeit: XX**\n\n**y-Zeit: YY**\n\n## Zubereitung\n\n1. Schritt1\n2. Schritt2\n\t- unterschritt";

    return $tocLink;
}

function createFileOrFolder($path) {
    $isDirectory = check_dir($path);
    $isFile = check_file($path);
    $response = array();

    if ($isDirectory && !$isFile) {
        http_response_code(400);
        $response['status'] = 'error';
        $response['message'] = "The provided path points to a directory.";
    } elseif (!$isDirectory && $isFile) {
        if(file_exists($path)){
            http_response_code(400);
            $response['status'] = 'error';
            $response['message'] = "The provided path points to an existing file.";
        } else {
            $dirPathArr = explode('/', $path);
            array_pop($dirPathArr);
            $dirPath = implode('/', $dirPathArr);
            if(!is_dir($dirPath)){
                if(!mkdir($dirPath, 0777, true)){
                    http_response_code(400);
                    $response['status'] = 'error';
                    $response['message'] = "Cannot create directory path.";
                } else {
                    touch($path);
                    file_put_contents($path, path2TOC($path));
                    chmod($path, 0777);
                    http_response_code(200);
                    $response['status'] = 'success';
                    $response['message'] = "File was created!";
                }
            } else {
                touch($path);
                file_put_contents($path, path2TOC($path));
                chmod($path, 0777);
                http_response_code(200);
                $response['status'] = 'success';
                $response['message'] = "File was created!";
            }
        }
    } else {
        http_response_code(400);
        $response['status'] = 'error';
        $response['message'] = "Invalid file name. File needs to end with '.md'";
    }
    
    echo json_encode($response);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $path = $_POST['path']; // Make sure to validate/sanitize this input
    createFileOrFolder($path);
}
?>
