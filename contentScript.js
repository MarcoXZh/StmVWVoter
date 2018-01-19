chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse({ title:document.getElementsByClassName('entry-title')[0]
                                 .innerText,
                   time:document.getElementsByClassName('updated')[0]
                                 .getAttribute('title') });
}); // chrome.runtime.onMessage.addListener( ... );
