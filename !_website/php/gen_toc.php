<?php

// Function to format the link text
function formatLinkText($text) {
    // Remove '.md' extension
    $text = str_replace('.md', '', $text);
    // Replace underscores with spaces
    $text = str_replace('_', ' ', $text);
    // Capitalize each word
    $text = ucwords($text);

    return $text;
}

// Define the root directory path and excluded directories
$rootDirectory = '../../';
$excludedDirectories = ['.git', '!_website'];

// Create an array to store the Markdown content
$markdownContent = [];

$markdownContent[] = "# Das gestohlene Kochbuch\n\n## Inhaltsverzeichnis\n";

// Open the root directory
if ($handle = opendir($rootDirectory)) {
    while (false !== ($entry = readdir($handle))) {
        // Skip dots (current directory and parent directory)
        if ($entry == "." || $entry == "..") {
            continue;
        }

        // Check if the entry is a directory and not in the exclusion list
        if (is_dir($rootDirectory . '/' . $entry) && !in_array($entry, $excludedDirectories)) {
            // Capitalize the first letter of the directory name
            $categoryName = ucfirst($entry);

            // Generate Markdown content for the category
            $markdownContent[] = "## $categoryName\n";

            // Open the category directory
            if ($categoryHandle = opendir($rootDirectory . '/' . $entry)) {
                while (false !== ($recipe = readdir($categoryHandle))) {
                    // Check if the entry is a Markdown file
                    if (pathinfo($recipe, PATHINFO_EXTENSION) == 'md') {
                        // // Generate Markdown content for the recipe
                        // $markdownContent[] = "- [$recipe]($entry/$recipe)";

                        // Format the link text
                        $formattedText = formatLinkText($recipe);

                        // Generate Markdown content for the recipe with formatted link text
                        $markdownContent[] = "- [$formattedText]($entry/$recipe)";
                    }
                }
                closedir($categoryHandle);
				$markdownContent[] = "\n";
            }
        }
    }
    closedir($handle);
}

// Save the Markdown content to README.md in the root directory
file_put_contents($rootDirectory . '/README.md', implode("\n", $markdownContent));
?>
