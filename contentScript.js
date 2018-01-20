chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var titles = document.getElementsByClassName('entry-title');
    sendResponse(
        titles.length === 1 ?       // >= 1 indicates "My blogs" page
            {
                title: titles[0].innerText,
                time: document.getElementsByClassName('updated')[0]
                              .getAttribute('title')
            }
        :
            {
                title: null,
                time: null
            }
    ); // sendResponse( ... );
}); // chrome.runtime.onMessage.addListener( ... );
