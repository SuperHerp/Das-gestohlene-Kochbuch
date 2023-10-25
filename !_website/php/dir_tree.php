<?php
function generateDirectoryOptions($dir) {
    $directories = scandir($dir);
    $options = [];

    foreach ($directories as $directory) {
        if ($directory != '.' && $directory != '..' && $directory != '.git' && $directory != '!_website' && is_dir($dir . '/' . $directory)) {
            $options[] = $directory;
        }
    }

    return $options;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // cd into the root directory
    // chdir("/path/to/root/directory");
    $rootDir = '../../';
    $directoryOptions = generateDirectoryOptions($rootDir);

    // Create an HTML radio selection
    $radioOptions = '';
    $radioOptions .= '<input type="radio" name="selected_directory" value="" /><input id="customCat" type="text" placeholder="Neue Kategorie" /><br>';

    foreach ($directoryOptions as $directory) {
        $radioOptions .= '<input type="radio" name="selected_directory" value="' . $directory . '">' . $directory . '<br>';
    }

    $toRet = array('html' => $radioOptions);
    echo json_encode($toRet);
}
?>
