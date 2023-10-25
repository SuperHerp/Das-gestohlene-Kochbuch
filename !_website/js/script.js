// --------------------------------------------------------------------------
// Global vars
// --------------------------------------------------------------------------
let curPath = "";
let curDoc = "README.md";
const BDIR = "/Das-gestohlene-Kochbuch/";
// const BDIR = "";
let prevVis = false;
let contVis = true;
let explVis = false;
let editVis = false;
let resVis = false;

var searchData = [];
var workers = [];
const nrOfWorkers = 1;
let curIdx = 0;
let curIdxMutex = Promise.resolve();


var editor = null;

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// General
// --------------------------------------------------------------------------

/**
 * @function pathTrim
 * 
 * @param {string} link 
 * 
 * @description
 * Removes file from full-path
 * Returns path without file
 */
function pathTrim(link) {
    const parts = link.split('/');
    curDoc = parts.pop();
    let retLink = parts.join('/') + '/';
    if (retLink === '../' || retLink === '/') {
        return "";
    }
    return parts.join('/') + '/';
}

/**
 * @function pathUp
 * 
 * @description
 * returns if passed path "goes upwards"
 */
function pathUp(link) {
    const parts = link.split('/');
    if (parts[0] === '..') {
        return true;
    } else {
        return false;
    }
}

/**
 * @function rel2absPath
 * 
 * @param {string} relativePath 
 * 
 * @description
 * Turns relative path into absolute path starting at document root
 */
function rel2absPath(relativePath) {
    const parts = curPath.split('/').filter(part => part !== '');
    const relativeParts = relativePath.split('/');

    while (relativeParts[0] === '..') {
        parts.pop();
        relativeParts.shift();
    }

    const absoluteParts = [...parts, ...relativeParts];
    return absoluteParts.join('/');
}


// --------------------------------------------------------------------------
// --------------------------------------------------------------------------



// --------------------------------------------------------------------------
// File
// --------------------------------------------------------------------------

/**
 * @function fetchContent
 * 
 * @param {string} url 
 * 
 * @description
 * "Interface" to fetch documents from server based on passed URL
 * Displays 404-Page when URL is invalid
 */
async function fetchContent(url) {

    if (url.charAt(0) == "/") {
        url = BDIR.substring(0, BDIR.length - 1) + url;
    } else {
        url = BDIR + url;
    }

    // window.history.pushState(null, "", "/");
    try {
        // const response = await fetch(url + '?cache=' + Date.now());
        const response = await fetch(url);
        if (!response.ok) {
            curDoc = "404.md";
            curPath = "";
            fetchAndDisplayDocument();
            throw new Error(`Failed to fetch content (${response.status} ${response.statusText})`);
        }
        return await response.text();
    } catch (error) {
        throw new Error(`Error fetching content: ${error.message}`);
    }
}

/**
 * @event fileLink
 * 
 * @origin user clicks on file link inside explorer
 * 
 * @description
 * Copies full path of clicked file into explorer path input
 */
function fileLink(event) {
    const filePath = document.getElementById("currentFP");
    let actualPath = event.target.className.split('-').join('/');

    filePath.value = actualPath.substring(2, actualPath.length);
}

/**
 * @function sanCurPath
 * 
 * @description
 * Makes sure that curPath never starts with '/'
 */
function sanCurPath() {
    if (curPath.charAt(0) === "/") {
        if (curPath.length == 1) {
            curPath = "";
        } else {
            curPath = curPath.substring(1, curPath.length);
        }
    }
}


/**
 * @event saveContent
 * 
 * @origin user clicks on button with id 'save-btn'
 * 
 * @description
 * Saves editor content to file
 * Shows notification on success/error
 */
async function saveContent(event) {
    const editedContent = editor.getValue();

    const formData = new URLSearchParams();
    sanCurPath();
    formData.append('path', curPath + curDoc);
    formData.append('content', editedContent);

    try {
        // window.history.pushState(null, "", "/");
        const response = await fetch(BDIR + '!_website/php/save_content.php', {
            method: 'POST',
            body: formData
        });
        genURL();

        if (response.ok) {
            showNotification('Content saved successfully', 'success');
        } else {
            showNotification('Failed to save content', 'error');
        }
    } catch (error) {
        showNotification('Error saving content' + error.message, 'error');
    }
}

/**
 * @function renderMDToHTML
 * 
 * @param {string} markdown file content to render as html
 * 
 * @description
 * renders passed markdown to html
 */
function renderMDToHTML(content) {
    const markedHTML = marked.parse(content);
    const sanHTML = DOMPurify.sanitize(markedHTML);
    return sanHTML;
}

/**
 * @function genURL
 * 
 * @description
 * generates browser URL based on curPath and curDoc
 */
function genURL() {
    const newPath = BDIR + `index.html?=${curPath}${curDoc}`;
    // const newPath = BDIR + `${curPath}${curDoc}`;
    window.history.pushState(null, "", newPath);
}


/**
 * @function displayContent
 * 
 * @param {html-Element} targetElement 
 * @param {string} html
 * 
 * @description
 * Displays passed html content in passed html-element
 * Adds event-listener to links to other docs
 */
function displayContent(targetElement, html) {
    targetElement.innerHTML = html;
    hljs.highlightAll();
    const tocLinks = targetElement.getElementsByTagName("a");
    for (const link of tocLinks) {
        if (link.getAttribute("href").includes(".md")) {
            link.addEventListener("click", handleLinkClick);
        }
    }

    const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(header => {
        if (!header.id) {
            header.id = header.textContent.toLowerCase().replace(/\s+/g, '-');
        }
    });
    // genURL();
}

/**
 * @function fetchAndDisplayDocument
 * 
 * @description
 * fetches curDoc then calles 'displayContent' to display
 */
async function fetchAndDisplayDocument() {
    const contDiv = document.getElementById("content");
    const fullPath = curPath + curDoc;
    const mdPlain = await fetchContent(fullPath);
    const genHTML = renderMDToHTML(mdPlain);
    displayContent(contDiv, genHTML);
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Editor
// --------------------------------------------------------------------------

/**
 * @event loadMonaco
 * 
 * @origin called from 'toggleMonaco' function depending on editor state
 * 
 * @description
 * Creates editor
 */
async function loadMonaco(event) {
    const fullPath = curPath + curDoc;
    const content = await fetchContent(fullPath);
    // genURL();
    require.config({ paths: { vs: '!_website/js/monaco/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: content,
            language: 'markdown',
            theme: "vs-dark",
            automaticLayout: true
        });
    });
}

/**
 * @event unloadMonaco
 * 
 * @origin called from 'toggleMonaco' function depending on editor state
 * 
 * @description
 * Destroys editor
 */
async function unloadMonaco(event) {
    editor.dispose();
    editor = null;
    const mdPlain = await fetchContent(curPath + curDoc);
    const genHTML = renderMDToHTML(mdPlain);
    displayContent(document.getElementById("content"), genHTML);
    // genURL();

}

/**
 * @function showNotification
 * 
 * @param {string} message text
 * @param {string} 'error' or 'success'
 * 
 * @description
 * Shows specified message as a notification
 * if 'error' => red background
 * if 'success' => green background
 */
function showNotification(message, type) {
    notification.textContent = message;
    notification.classList.add(type);
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
        notification.classList.remove(type);
    }, 2500);
}

/**
 * @event togglePreview
 * 
 * @origin user clicks button with id 'preview-btn'
 * 
 * @description
 * Shows/Hides current editor content rendered from markdown to html
 */
async function togglePreview(event) {
    const prevBtn = document.getElementById("preview-btn");
    const prevDiv = document.getElementById("preview");
    const editDiv = document.getElementById("editor");
    if (prevVis) {
        prevVis = false;
        prevDiv.style.display = 'none'
        prevBtn.innerHTML = "Show preview";
        editDiv.style.display = 'block';
    } else {
        prevVis = true;
        prevBtn.innerHTML = "Hide preview";
        // const previewDiv = document.getElementById("preview");

        displayContent(prevDiv, DOMPurify.sanitize(marked.parse(editor.getValue())));
        // genURL();

        prevDiv.style.display = 'block';
        editDiv.style.display = 'none';
    }
}

/**
 * @function sanitizeUserInput
 * 
 * @param {string} toSan 
 * @returns sanitized userinput
 * 
 * @description Removes special characters and umlaute from unserinput
 */
function sanitizeUserInput(toSan) {
    return toSan
        .replace(/[^\wäöüAÄÖÜß]+/g, '_')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/Ä/g, 'Ae')
        .replace(/Ö/g, 'Oe')
        .replace(/Ü/g, 'Ue');
}

/**
 * @event addPage
 * 
 * @origin user clicks on button with id 'createFile-btn'
 * 
 * @description
 * Sends request to server to create specified file at specified location
 * If user specification doesnt meed requirements it fails and shows notification
 */
async function addPage(event) {
    let fileName = document.getElementById("currentFP").value;
    
    if (fileName == "") {
        showNotification("Bitte Namen für das Rezept angeben!", "error");
        return;
    }

    fileName = sanitizeUserInput(fileName);

    document.getElementById("currentFP").value = fileName;
    
    fileName += ".md";


    const selectedCategory = document.getElementsByName("selected_directory");
    let filePath = "";
    let hasSelected = false;
    for (let idx = 0; idx < selectedCategory.length; idx++) {
        if (selectedCategory[idx].checked) {
            if (idx == 0) {
                filePath = document.getElementById("customCat").value;
                if (filePath == "") {
                    showNotification("Bitte Name für Kategorie angeben!", "error");
                    return;
                }
                filePath = sanitizeUserInput(filePath);
            } else {
                filePath = selectedCategory[idx].value;
            }
            hasSelected = true;
        }
    }
    if (!hasSelected) {
        showNotification("Bitte wähle eine Kategorie aus!", "error");
        return;
    }

    filePath = './' + filePath + "/" + fileName;

    const formData = new URLSearchParams();
    formData.append('path', filePath);

    try {
        // window.history.pushState(null, "", "/");
        const response = await fetch(BDIR + '!_website/php/add_page.php', {
            method: 'POST',
            body: formData
        });
        genURL();
        const responseMsg = await response.json();

        if (response.ok) {
            getDirTree(document.getElementById("dirTree"));
            generateTOC(event);
            showNotification(responseMsg.message, 'success');
        } else {
            showNotification(responseMsg.message, 'error');
        }
    } catch (error) {
        showNotification('Error saving content: ' + error.message, 'error');
    }
}


/**
 * @event openPage
 * 
 * @origin user clicks on button with id 'openPage-btn'
 * 
 * @description
 * Sends request to server to fetch clicked on file then displays it
 */
async function openPage(event) {
    let filePath = document.getElementById("currentFP").value;
    filePath = './' + filePath;
    if (filePath.substring(filePath.length - 3, filePath.length) === ".md") {
        toggleExplorer(event);
        let parts = filePath.split('/');
        parts.shift();
        curDoc = parts.pop();
        curPath = parts.join('/') + '/';
        sanCurPath();
        fetchAndDisplayDocument();
        genURL();
    } else {
        showNotification('Cant open non markdown files.', 'error')
    }
}

/**
 * @event toggleMonaco
 * 
 * @origin user clicks on button with id 'edit-btn'
 * 
 * @description
 * Shows/Hides text editor depending on current state
 * Also loads/unloads texteditor
 */
function toggleMonaco(event) {
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const prevBtn = document.getElementById("preview-btn");
    const editDiv = document.getElementById("editor");
    const contDiv = document.getElementById("content");
    const prevDiv = document.getElementById("preview");
    const explBtn = document.getElementById("explorer-btn");
    if (editVis) {
        explBtn.style.display = 'flex';
        editBtn.innerHTML = "Edit Page";

        editDiv.style.display = 'none';
        editVis = false;

        saveBtn.style.display = 'none';

        prevBtn.style.display = 'none';

        if (prevVis) {
            prevDiv.style.display = 'none';
            prevVis = false;
        }

        contDiv.style.display = 'block';
        contVis = true;

        unloadMonaco(event);
    } else {
        explBtn.style.display = 'none';
        editBtn.innerHTML = "Close editor";

        editDiv.style.display = 'flex';
        editVis = true;

        contDiv.style.display = 'none';
        contVis = false;

        saveBtn.style.display = 'flex';
        prevBtn.style.display = 'flex';

        loadMonaco(event);
    }
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------


// --------------------------------------------------------------------------
// Explorer
// --------------------------------------------------------------------------

/**
 * @event toggleFolder
 * 
 * @origin user clicks on folder inside explorer
 * 
 * @description
 * collapses/unfolds clicked on folder
 */
function toggleFolder(event) {
    const folder = event.target.nextElementSibling;
    if (folder) {
        folder.style.display = folder.style.display === "none" ? "block" : "none";
    }
    const filePath = document.getElementById("currentFP");
    let actualPath = event.target.className.split('-').join('/') + '/';

    filePath.value = actualPath.substring(2, actualPath.length)
}

/**
 * @event getDirTree
 * 
 * @origin explorer becomes visible (toggleExplorer function)
 * 
 * @description
 * gets directory lsit from server
 * 
 */
async function getDirTree(dirTrDiv) {
    dirTrDiv.innerHTML = '';
    try {
        const response = await fetch('!_website/php/dir_tree.php', {
            method: 'POST'
        });

        const responseMsg = await response.json();

        if (response.ok) {
            const dirTrDiv = document.getElementById("dirTree");
            dirTrDiv.innerHTML = responseMsg.html;

            const tocLinks = dirTrDiv.getElementsByTagName("a");
            for (const link of tocLinks) {
                link.addEventListener("click", handleExplLinks);
            }
        } else {
            showNotification('Error loading file tree.', 'error');
        }

    } catch (error) {
        showNotification('Error loading file tree.', 'error');
    }
}

/**
 * @event handleExplLinks
 * 
 * @origin click on link in explorer
 * 
 * @description
 * Prevents default link behaviour
 */
async function handleExplLinks(event) {
    event.preventDefault();
}

/**
 * @event toggleExplorer
 * 
 * @origin click on button with id 'explorer-btn'
 * 
 * @description
 * Toggles explorer visibility
 */
async function toggleExplorer(event) {
    const contDiv = document.getElementById("content");
    const explDiv = document.getElementById("explorer");
    const editBtn = document.getElementById("edit-btn");
    const explBtn = document.getElementById("explorer-btn");
    if (explVis && !contVis) {
        contDiv.style.display = 'block';
        contVis = true;
        explDiv.style.display = 'none';
        explVis = false;
        editBtn.style.display = 'block';
        explBtn.innerHTML = "Show explorer";
    } else {
        contDiv.style.display = 'none';
        contVis = false;
        const dirTrDiv = document.getElementById("dirTree");
        editBtn.style.display = 'none';
        explBtn.innerHTML = "Hide explorer";

        await getDirTree(dirTrDiv);


        explDiv.style.display = 'block';
        explVis = true;
    }
}
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Search
// --------------------------------------------------------------------------

/**
 * @function actSearch
 * 
 * @param {json-element} sdElement 
 * @param {string} searchTerm 
 * 
 * @description
 * Performs search on one json-Element from searchData array
 */
function actSearch(sdElement, searchTerm) {
    
    let stLen = searchTerm.length;
    let title = sdElement.title;
    let body = sdElement.body;
    const path = sdElement.path;
    
    let score = 0;
    const titlePerC = (stLen / title.length) * 100;

    let searchRegExp = new RegExp(searchTerm, 'gi');

    let titleMatches = [...title.matchAll(searchRegExp)];
    titleMatches.forEach(hit => {
        score = score + titlePerC - (hit.index * 0.5);
    });

    let matches = [...body.matchAll(new RegExp(searchTerm, 'gi'))];
    score = score + Math.min(matches.length, 20);
    let _fbody = body.replace(new RegExp(searchTerm, 'gi'), match => `<mark>${match}</mark>`);

    return {score, title, path, _fbody};
}


/**
 * @event startSearch
 * 
 * @origin text-input 'search-field' (click/input)
 * 
 * @description
 * Starts search on search index based on input provided
 * 
 */
async function startSearch(params) {
    if (!resVis) {
        document.getElementById('search-results').style.display = 'flex';
        resVis = true;
    }
    let searchTerm = document.getElementById("search-field").value;
    if (searchTerm == '') {
        let searchList = document.getElementById('results-list');
        while (searchList.firstChild) {
            searchList.removeChild(searchList.firstChild);
        }
        searchList.innerHTML = 'No searchterm provided!';
        return;
    }
    curIdx = 0;
    document.getElementById('results-list').innerHTML = '';

    // for (curIdx; curIdx < nrOfWorkers; await incrCurIdx()) {
    for (curIdx; curIdx < searchData.length; curIdx++) {
        const { score, title, path, _fbody } = actSearch(searchData[curIdx], searchTerm);

        if (score < 0.2) {
            continue;
        }
    
        const listItem = document.createElement('li');
    
        const titleHeading = document.createElement('h4');
        titleHeading.textContent = title;
        listItem.appendChild(titleHeading);
    
        const pathLink = document.createElement('a');
        // pathLink.addEventListener('click', handleSearchLinkClick);
        pathLink.addEventListener('click', handleLinkClick);
        // pathLink.setAttribute('class', 'file-link')
        pathLink.textContent = `Path: ${path}`;
        pathLink.href = path;
        listItem.appendChild(pathLink);
    
        const bodyParagraph = document.createElement('p');
        bodyParagraph.innerHTML = _fbody;
        listItem.appendChild(bodyParagraph);
    
        listItem.setAttribute('data-score', score);
    
        const searchResults = document.getElementById('results-list');
        const existingItems = searchResults.querySelectorAll('li');
    
        // insert result based on score
        let inserted = false;
        for (let i = 0; i < existingItems.length; i++) {
            const existingScore = parseFloat(existingItems[i].getAttribute('data-score'));
            if (score > existingScore) {
                searchResults.insertBefore(listItem, existingItems[i]);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            searchResults.appendChild(listItem);
        }
    
        if (!resVis) {
            document.getElementById('search-results').style.display = 'flex';
            resVis = true;
        }
    }
}


/**
 * @event hideSearchResults
 * 
 * @origin pointer leaves search results window
 * 
 * @description
 * Event for when pointer leaves search results window
 * 
 */
function hideSearchResults() {
    const searchResultsDiv = document.getElementById('search-results');
    searchResultsDiv.style.display = 'none';
    resVis = false;
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------


/**
 * @event handleLinkClick
 * 
 * @origin click on link to other document
 * 
 * @description
 * Event for when link is clicked by user
 * Replaces default link behaviour with SPA approach
 * 
 */
async function handleLinkClick(event) {
    const contentDiv = document.getElementById("content");
    event.preventDefault();
    const link = event.target;
    const hash = event.target.hash;
    let mdPath = link.getAttribute("href");
    if (mdPath.charAt(0) !== '/') {
        if (!pathUp(mdPath)) {
            // mdPath = curPath + mdPath;
            mdPath = curPath + (mdPath.startsWith('/') ? mdPath.substring(1) : mdPath);
        } else {
            mdPath = rel2absPath(mdPath);
        }
    }

    const mdPlain = await fetchContent(mdPath);
    curPath = pathTrim(mdPath);
    sanCurPath();
    const genHTML = renderMDToHTML(mdPlain);
    if (resVis) {
        const searchResults = document.getElementById("search-results");
        resVis = false;
        searchResults.style.display = 'none';
    }
    displayContent(contentDiv, genHTML);
    genURL();
    if (hash !== "") {
        document.getElementById(hash.substr(1, hash.length - 1)).scrollIntoView({ behavior: "smooth" });
    } else {
        window.scrollTo({ top: 0, behavior: "instant" });
    }
}

/**
 * @event / @function handlePageLoad
 * 
 * @origin user action
 * 
 * @description
 * Event for when page is loaded/url changes
 * Enables user to use back/forward button in browser
 * Prevents user from accidentally leaving page when editor is open
 * 
 */
async function handlePageLoad(event) {
    console.log(">>> handlePageLoad called");
    // check if editor exists
    if (editor !== null) {
        var confirmation = confirm("Changes you made may not be saved.");
        if (!confirmation) {
            // nop
            return;
        } else {
            // kill editor => resume page change
            toggleMonaco();
        }
    }
    const contDiv = document.getElementById("content");
    const urlPath = window.location;
    if (urlPath.pathname + urlPath.search === "/" || urlPath.pathname + urlPath.search === "/index.html" || urlPath.search === "") {
        curPath = "";
        curDoc = "README.md";
    } else {
        let parts = urlPath.search.split("/");
        parts[0] = parts[0].substring(2, parts[0].length);
        curDoc = parts.pop();
        curPath = parts.join('/') + '/';
        sanCurPath();
    }

    fetchAndDisplayDocument();
    if (event == undefined) {
        genURL();
    }
}

/**
 * @event handlePageUnload
 * 
 * @origin user action
 * 
 * @description
 * Event for reload/close action performed by user
 * Prevents user from accidentally leavinf page when editor is open
 * 
 */
async function handlePageUnload(event) {
    console.log(">>> handlePageUnload called");
    if (editor !== null) {
        console.log("editor loaded");
        event.returnValue = "Make sure you have saved your edits before leaving!";
    } else {
        console.log("editor not loaded");
    }
}


/**
 * @function loadSearchIndex
 * 
 * @description 
 * reloads search index after generating
 *  
 */
async function loadSearchIndex(params) {
    try {
        const resp = await fetch('!_website/docs.php.json');
        searchData = await resp.json();
    } catch (error) {
        console.error("Could not instantiate Webworker!");
    }
}

/**
 * @event generateJSONDocs
 * 
 * @description 
 * Event callback for "gendocs-btn"
 * Sends request to generate search index to server
 *  
 */
async function generateJSONDocs(params) {
    generateTOC(params);
    try {
        const response = await fetch('!_website/php/gen_json_docs.php', {
            method: 'POST'
        });

        if (response.ok) {
            await loadSearchIndex();
            showNotification('Generated docs.json!', 'success');
        } else {
            showNotification('Generating docs.json failed!', 'error');
        }

    } catch (error) {
        showNotification('Generating docs.json failed!', 'error');
    }

}

/**
 * @event generateJSONDocs
 * 
 * @description 
 * Event callback for "gendocs-btn"
 * Sends request to generate search index to server
 *  
 */
async function generateTOC(params) {
    try {
        const response = await fetch('!_website/php/gen_toc.php', {
            method: 'POST'
        });

        if (response.ok) {
            await loadSearchIndex();
            showNotification('Generated README.md!', 'success');
        } else {
            showNotification('Generating README.md failed!', 'error');
        }

    } catch (error) {
        showNotification('Generating README.md failed!', 'error');
    }

}

async function main() {
    const contentDiv = document.getElementById("content");
    const tocDiv = document.getElementById("toc");
    loadSearchIndex();
    document.getElementById("edit-btn").addEventListener("click", toggleMonaco);
    document.getElementById("save-btn").addEventListener("click", saveContent);
    document.getElementById("preview-btn").addEventListener("click", togglePreview);
    document.getElementById("explorer-btn").addEventListener("click", toggleExplorer);

    document.getElementById("gendocs-btn").addEventListener("click", generateJSONDocs);

    document.getElementById("createFile-btn").addEventListener("click", addPage);
    document.getElementById("openPage-btn").addEventListener("click", openPage);
    document.getElementById("search-field").addEventListener("input", startSearch);
    document.getElementById("search-field").addEventListener("click", startSearch);
    document.getElementById('search-results').addEventListener('mouseleave', hideSearchResults);
    // window.addEventListener("popstate", handlePopEvent);
    window.addEventListener("popstate", handlePageLoad);
    window.addEventListener('beforeunload', handlePageUnload);

    handlePageLoad();
}

window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
