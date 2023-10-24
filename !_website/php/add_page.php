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
    // check if path points to dir or file
    // check if file is md file
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
            // path is valid
            
            // split path into directories
            $dirPathArr = explode('/', $path);
            // pop filename from path
            array_pop($dirPathArr);
            // reconstruct folder path 
            $dirPath = implode('/', $dirPathArr);

            // check if path already exists
            if(!is_dir($dirPath)){
                // path does not exist yet => create folder structure => create file
                if(!mkdir($dirPath, 0777, true)){
                    http_response_code(400);
                    $response['status'] = 'error';
                    $response['message'] = "Cannot create directory path.";
                } else {
                    touch($path);
                    file_put_contents($path, path2TOC($path));
                    http_response_code(200);
                    $response['status'] = 'success';
                    $response['message'] = "File was created!";
                }
            } else {
                // path exists already => create file
                touch($path);
                file_put_contents($path, path2TOC($path));
                http_response_code(200);
                $response['status'] = 'success';
                $response['message'] = "File was created!";
            }
        }
    } else {
        // file is not md file
        http_response_code(400);
        $response['status'] = 'error';
        $response['message'] = "Invalid file name. File needs to end with '.md'";
    }
    
    // return error/success
    echo json_encode($response);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // cd into dir containing docs
    chdir("../../");

    // get user specified path
    $path = $_POST['path'];

    createFileOrFolder($path);
}
?>
