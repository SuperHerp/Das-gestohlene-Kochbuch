<?php
function generateTreeView($dir, $class = '', $hidden = true, $dirTreeHTML) {
    $displayStyle = $hidden ? 'none' : 'block';
    $dirTreeHTML = $dirTreeHTML . '<ul class="' . $class . '" style="display: ' . $displayStyle . ';">';
    // echo '<ul class="' . $class . '" style="display: ' . $displayStyle . ';">';

    $files = scandir($dir);

    foreach ($files as $file) {
        if ($file != '.' && $file != '..' && $file != "!_website" && $file != ".git" && $file != "Template") {
            $path = $dir . '/' . $file;
            // $dirTreeHTML = $dirTreeHTML . '<li>';
            // echo '<li>';
            if (is_dir($path)) {
                $dirTreeHTML = $dirTreeHTML . '<li>';
                $subClass = $class !== '' ? $class . '-' . $file : $file;
                $dirTreeHTML = $dirTreeHTML . '<a href="" class="' . $subClass . '" onclick="toggleFolder(event)">' . $file . '</a>';
                // echo '<a href="#" class="' . $subClass . '" onclick="toggleFolder(event)">' . $file . '</a>';
                $dirTreeHTML = generateTreeView($path, $subClass, true, $dirTreeHTML);
                $dirTreeHTML = $dirTreeHTML . '</li>';
            } else {
                if(substr($file, -3) == ".md"){
                    $dirTreeHTML = $dirTreeHTML . '<li>';
                    $subClass = $class !== '' ? $class . '-' . $file : $file;
                    $dirTreeHTML = $dirTreeHTML . '<a href="" class="' . $subClass . '" onclick="fileLink(event)" style="text-decoration: none;color: #98ff58;">' . $file . '</a>';
                    // echo $file;
                    $dirTreeHTML = $dirTreeHTML . '</li>';
                }
            }
            // $dirTreeHTML = $dirTreeHTML . '</li>';
            // echo '</li>';
        }
    }
    $dirTreeHTML = $dirTreeHTML . '</ul>';
    // echo '</ul>';
    return $dirTreeHTML;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rootDir = '.';
    $dirTreeHTML = '';
    $dirTreeHTML = generateTreeView($rootDir, '.', false, $dirTreeHTML);
    $toRet = array('html' => $dirTreeHTML);
    echo json_encode($toRet);
}
?>