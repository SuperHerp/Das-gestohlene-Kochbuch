// workers.js
self.addEventListener('message', function (msg) {
    let searchData = msg.data;
    let searchTerm = searchData.q;
    let stLen = searchTerm.length;
    let score = 0;
    let title = searchData.title;
    let body = searchData.body;
    const path = searchData.path;
    const id = searchData.id;

    const titlePerC = (stLen / title.length) * 100;

    let searchRegExp = new RegExp(searchTerm, 'gi');

    let titleMatches = [...title.matchAll(searchRegExp)];
    titleMatches.forEach(hit => {
        score = score + titlePerC - (hit.index * 0.5);
    });

    let matches = [...body.matchAll(new RegExp(searchTerm, 'gi'))];
    score = score + Math.min(matches.length, 20);
    let _fbody = body.replace(new RegExp(searchTerm, 'gi'), match => `<mark>${match}</mark>`);
    // console.log("id: " + id + " returned result");
    postMessage({ id, score, title, path, _fbody, searchTerm });


});