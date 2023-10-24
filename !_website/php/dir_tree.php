<?php
function generateTreeView($dir, $class = '', $hidden = true, $dirTreeHTML) {

    // check if in sub-dir or first start
    $displayStyle = $hidden ? 'none' : 'block';

    // open html list
    $dirTreeHTML = $dirTreeHTML . '<ul class="' . $class . '" style="display: ' . $displayStyle . ';">';

    // get files form current dir
    $files = scandir($dir);

    foreach ($files as $file) {
        // skip specified folders
        if ($file != '.' && $file != '..' && $file != "!_website" && $file != ".git") {
            $path = $dir . '/' . $file;

            // check if folder or file
            if (is_dir($path)) {
                // create folder html code
                $dirTreeHTML = $dirTreeHTML . '<li>';
                $subClass = $class !== '' ? $class . '-' . $file : $file;
                $dirTreeHTML = $dirTreeHTML . '<a href="" class="' . $subClass . '" onclick="toggleFolder(event)">' . $file . '</a>';
                $dirTreeHTML = generateTreeView($path, $subClass, true, $dirTreeHTML);
                
                $dirTreeHTML = $dirTreeHTML . '</li>';
            } else {
                // check if file is md file
                if(substr($file, -3) == ".md"){
                    // create file html code
                    $dirTreeHTML = $dirTreeHTML . '<li>';
                    $subClass = $class !== '' ? $class . '-' . $file : $file;
                    $dirTreeHTML = $dirTreeHTML . '<a href="" class="' . $subClass . '" onclick="fileLink(event)" style="text-decoration: none;color: #98ff58;">' . $file . '</a>';
                    $dirTreeHTML = $dirTreeHTML . '</li>';
                }
            }
        }
    }
    // close html list
    $dirTreeHTML = $dirTreeHTML . '</ul>';
    
    return $dirTreeHTML;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // cd into dir containing docs
    chdir("../../");
    $rootDir = '.';
    $dirTreeHTML = '';

    // generate html representation
    $dirTreeHTML = generateTreeView($rootDir, '.', false, $dirTreeHTML);
    $toRet = array('html' => $dirTreeHTML);
    echo json_encode($toRet);
}
?>