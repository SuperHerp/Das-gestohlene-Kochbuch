let curPath = "";
let curDoc = "README.md";
let prevVis = false;
let contVis = true;
let explVis = false;
let editVis = false;

var editor;


function pathTrim(link){
    const parts = link.split('/');
    curDoc = parts.pop();
    let retLink = parts.join('/') + '/';
    if(retLink === '../' || retLink === '/'){
        return "";
    }
    return parts.join('/') + '/';
}

function pathUp(link) {
    const parts = link.split('/');
    if(parts[0] === '..'){
        return true;
    }else{
        return false;
    }
}

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

async function fetchContent(url) {
    window.history.pushState(null, "", '/');
    try {
        // const response = await fetch(url + '?cache=' + Date.now());
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch content (${response.status} ${response.statusText})`);
        }
        return await response.text();
    } catch (error) {
        throw new Error(`Error fetching content: ${error.message}`);
    }
}

function renderMDToHTML(content) {
    return marked.parse(content);
}

function genURL() {
    const newPath = `/index.html?=${curPath}${curDoc}`;
    window.history.pushState(null, "", newPath);
}

function displayContent(targetElement, html) {
    targetElement.innerHTML = html;
    hljs.highlightAll();
    const tocLinks = targetElement.getElementsByTagName("a");
    for (const link of tocLinks) {
        if(link.getAttribute("href").includes(".md")){
            link.addEventListener("click", handleLinkClick);
        }
    }
    genURL();
}

// Function to handle link clicks
async function handleLinkClick(event) {
    const contentDiv = document.getElementById("content");
    event.preventDefault();
    const link = event.target;
    let mdPath = link.getAttribute("href");
    if(!pathUp(mdPath)){
        mdPath = curPath + mdPath;
    }else{
        mdPath = rel2absPath(mdPath);
    }

    const mdPlain = await fetchContent(mdPath);
    curPath = pathTrim(mdPath);
    const genHTML = renderMDToHTML(mdPlain);
    displayContent(contentDiv, genHTML);
}

async function loadMonaco(event) {
    const fullPath = curPath + curDoc;
    const content = await fetchContent(fullPath);
    genURL();
    require.config({ paths: { vs: '!_website/js/monaco/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value:content,
            language: 'markdown',
            theme: "vs-dark",
            automaticLayout: true
        });
    });
    
}

async function unloadMonaco(event) {
    editor.dispose();
    const mdPlain = await fetchContent(curPath+curDoc);
    const genHTML = renderMDToHTML(mdPlain);
    displayContent(document.getElementById("content"), genHTML);

}

async function toggleMonaco(event) {
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const prevBtn = document.getElementById("preview-btn");
    const editDiv = document.getElementById("editor");
    const contDiv = document.getElementById("content");
    const prevDiv = document.getElementById("preview");
    const explBtn = document.getElementById("explorer-btn");
    if(editVis){
        explBtn.style.display = 'flex';
        editBtn.innerHTML = "Seite Bearbeiten";

        editDiv.style.display = 'none';
        editVis = false;

        saveBtn.style.display = 'none';

        prevBtn.style.display = 'none';

        if(prevVis){
            prevDiv.style.display = 'none';
            prevVis = false;
        }

        contDiv.style.display = 'block';
        contVis = true;

        await unloadMonaco(event);
    }else{
        explBtn.style.display = 'none';
        editBtn.innerHTML = "Editor schliessen";

        editDiv.style.display = 'flex';
        editVis = true;

        contDiv.style.display = 'none';
        contVis = false;

        saveBtn.style.display = 'flex';
        prevBtn.style.display = 'flex';

        await loadMonaco(event);
    }
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.classList.add(type);
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
        notification.classList.remove(type);
    }, 5000);
}

async function saveContent(event) {
    const editedContent = editor.getValue(); 

    const formData = new URLSearchParams();
    formData.append('path', curPath + curDoc);
    formData.append('content', editedContent);

    try {
        const response = await fetch('save_content.php', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showNotification('Content saved successfully', 'success');
        } else {
            showNotification('Failed to save content', 'error');
        }
    } catch (error) {
        showNotification('Error saving content' + error.message, 'error');
    }
}

async function togglePreview(event) {
    const prevBtn = document.getElementById("preview-btn");
    const prevDiv = document.getElementById("preview");
    const editDiv = document.getElementById("editor");
    if(prevVis){
        prevVis = false;
        prevDiv.style.display = 'none'
        prevBtn.innerHTML = "Vorschau öffnen";
        editDiv.style.display = 'block';
    }else{
        prevVis = true;
        prevBtn.innerHTML = "Vorschau schliessen";
        // const previewDiv = document.getElementById("preview");
        
        displayContent(prevDiv, marked.parse(editor.getValue()));
        
        prevDiv.style.display = 'block';
        editDiv.style.display = 'none';
    }
}

function toggleFolder(event) {
    const folder = event.target.nextElementSibling;
    if (folder) {
        folder.style.display = folder.style.display === "none" ? "block" : "none";
    }
    const filePath = document.getElementById("currentFP");
    let actualPath = event.target.className.split('-').join('/') + '/';

    filePath.value = actualPath;
}

function fileLink(event) {
    const filePath = document.getElementById("currentFP");
    let actualPath = event.target.className.split('-').join('/');

    filePath.value = actualPath;
}

async function getDirTree(dirTrDiv) {
    dirTrDiv.innerHTML = '';
    try {
        const response = await fetch('dir_tree.php', {
            method: 'POST'
        });

        const responseMsg = await response.json();
        
        if(response.ok){
            const dirTrDiv = document.getElementById("dirTree");
            dirTrDiv.innerHTML = responseMsg.html;
            
            const tocLinks = dirTrDiv.getElementsByTagName("a");
            for (const link of tocLinks) {
                link.addEventListener("click", handleExplLinks);
            }
        }else{
            showNotification('Error loading file tree.', 'error');
        }

    } catch (error) {
        showNotification('Error loading file tree.', 'error');
    }
}


async function handleExplLinks(event) {
    event.preventDefault();
}

async function toggleExplorer(event) {
    const contDiv = document.getElementById("content");
    const explDiv = document.getElementById("explorer");
    const editBtn = document.getElementById("edit-btn");
    const explBtn = document.getElementById("explorer-btn");
    if(explVis && !contVis){
        contDiv.style.display = 'block';
        contVis = true;
        explDiv.style.display = 'none';
        explVis = false;
        editBtn.style.display = 'block';
        explBtn.innerHTML = "Show explorer";
    }else{
        contDiv.style.display = 'none';
        contVis = false;
        const dirTrDiv = document.getElementById("dirTree");
        editBtn.style.display = 'none';
        explBtn.innerHTML = "Explorer schliessen";

        await getDirTree(dirTrDiv);


        explDiv.style.display = 'block';
        explVis = true;
    }
}

async function addPage(event) {
    const filePath = document.getElementById("currentFP").value; 

    const formData = new URLSearchParams();
    formData.append('path', filePath);

    try {
        const response = await fetch('add_page.php', {
            method: 'POST',
            body: formData
        });

        const responseMsg = await response.json();

        if (response.ok) {
            getDirTree(document.getElementById("dirTree"));
            showNotification(responseMsg.message, 'success');
        } else {
            showNotification(responseMsg.message, 'error');
        }
    } catch (error) {
        showNotification('Error saving content: ' + error.message, 'error');
    }
}

async function openPage(event){
    const filePath = document.getElementById("currentFP").value;
    if(filePath.substring(filePath.length-3, filePath.length) === ".md"){
        toggleExplorer(event);
        let parts = filePath.split('/');
        parts.shift();
        curDoc = parts.pop();
        curPath = parts.join('/') + '/';
        fetchAndDisplayDocument();
    }else{
        showNotification('Cant open non markdown files.', 'error')
    }
    
}

async function handlePageLoad() {
    const contDiv = document.getElementById("content");
    const urlPath = window.location;
    if(urlPath.pathname + urlPath.search === "/" || urlPath.pathname + urlPath.search === "/index.html" || urlPath.search === ""){
        const mdPlain = await fetchContent("README.md");
        const genHTML = renderMDToHTML(mdPlain);
        curPath = "";
        curDoc = "README.md";
        // displayContent(contDiv, genHTML);
        fetchAndDisplayDocument();
        return;
    }
    // if (urlPath.pathname.startsWith("/")) {
        let parts = urlPath.search.split("/");
        parts[0] = parts[0].substring(2, parts[0].length);
        curDoc = parts.pop();
        curPath = parts.join('/') + '/';
        fetchAndDisplayDocument();
    // }
}

async function fetchAndDisplayDocument() {
    const contDiv = document.getElementById("content");
    const fullPath = curPath + curDoc;
    const mdPlain = await fetchContent(fullPath);
    const genHTML = renderMDToHTML(mdPlain);
    displayContent(contDiv, genHTML);
}

// window.addEventListener('load', handlePageLoad);

window.addEventListener('DOMContentLoaded', async () => {
    const contentDiv = document.getElementById("content");
    const tocDiv = document.getElementById("toc");
    document.getElementById("edit-btn").addEventListener("click", toggleMonaco);
    // document.getElementById("edit-btn").addEventListener("click", loadMonaco);
    // document.getElementById("cancel-btn").addEventListener("click", unloadMonaco);
    document.getElementById("save-btn").addEventListener("click", saveContent);
    document.getElementById("preview-btn").addEventListener("click", togglePreview);
    document.getElementById("explorer-btn").addEventListener("click", toggleExplorer);
    document.getElementById("createFile-btn").addEventListener("click", addPage);
    document.getElementById("openPage-btn").addEventListener("click", openPage);

    // const mdPlain = await fetchContent("Table_of_contents.md");
    // const genHTML = renderMDToHTML(mdPlain);
    // displayContent(contentDiv, genHTML);
    handlePageLoad();
});
