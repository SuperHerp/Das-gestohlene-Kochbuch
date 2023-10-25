<?php

function dirWalker($startDir, &$jsonString) {
    $stack = array($startDir);
    $counter = 0;

    // iterate over dirs
    while (!empty($stack)) {
        $dir = array_pop($stack);

        // skip webiste related files
        if (basename($dir) === '!_website') {
            continue;
        }

        if ($handle = opendir($dir)) {
            while (false !== ($entry = readdir($handle))) {
                if ($entry != "." && $entry != "..") {
                    $path = $dir . '/' . $entry;
                    if (is_dir($path)) {
                        $stack[] = $path;
                    } else {
                        // check if current file is md file
                        if (pathinfo($path, PATHINFO_EXTENSION) === 'md') {
                            $output = array();
                            $retVal = -1;
                            
                            // convert md to plain text
                            $panCMD = "pandoc " . $path . " -f markdown -t plain";
                            exec($panCMD, $output, $retVal);
                            if($retVal != 0){
                                die("Error running pandoc!");
                            }

                            $title = "";
                            $body = "";

                            // get title from plaintext
                            if($entry === "Table_of_contents.md"){
                                $title = $output[0];
                                unset($output[0]);
                            }else{
                                $title = $output[2];
                                unset($output[0]);
                                unset($output[1]);
                                unset($output[2]);
                            }

                            // get body form plaintext
                            foreach ($output as $val) {
                                $val = $val . " ";
                                $val = str_replace('"', '\\"', $val);
                                $body = $body . $val;
                            }

                            $splitPath = explode("Das-gestohlene-Kochbuch", $path);
                            
                            // put title and body into nested json; add trailing ','
                            $jsonString = $jsonString . "{\"path\":\"" . substr(end($splitPath), 1) . "\",\"title\":\"" . $title . "\",\"body\":\"" . $body . "\"},";
                        }
                    }
                }
            }
            // done with dir
            closedir($handle);
        }
    }
}

// cd to directory containing docs
chdir("../../");

// get dir as string
$startDir = getcwd();

// windows only 
$startDir = str_replace('\\', '/', $startDir);

// array to hold markdownfiles
$markdownFiles = array();
$counter = 0;

// json start
$jsonString = "[";

dirWalker($startDir, $jsonString);

// remove trailing ',' and end json
$jsonString = substr($jsonString, 0, -1) . ']';

// save json
file_put_contents("./!_website/docs.php.json", $jsonString)

?>