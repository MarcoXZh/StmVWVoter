chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse({ author:document.getElementsByClassName('ptc')[0]
                                 .innerText.split(' ')[0],
                   title:document.getElementsByClassName('entry-title')[0]
                                 .innerText,
                   time:document.getElementsByClassName('updated')[0]
                                 .getAttribute('title') });
}); // chrome.runtime.onMessage.addListener( ... );
