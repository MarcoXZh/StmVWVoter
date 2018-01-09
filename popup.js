steem.api.setOptions({url: 'https://api.steemit.com'});
var defaultWeight = '60';
var pgs = document.getElementById('pgs');
var num = document.getElementById('num');
var vote =  document.getElementById('vote');
var op =  document.getElementById('option');
var std = document.getElementById('std');
var stdOp = document.getElementById('stdOp');


/**
 * Decrypt data
 * @param {string}  encrypted   the encrypted data to be decrypted
 * @param {string}  password    the password
 */
var decrypt = function(encrypted, password) {
    // Decrypt
    var decrypted_data = CryptoJS.AES.decrypt(encrypted, password)
                                     .toString(CryptoJS.enc.Utf8);

    // Un-salt the decrypted data
    prefs.DUMMY.split('').forEach(function(dummy) {
        decrypted_data = decrypted_data.split(dummy).join('');
    }); // prefs.DUMMY.split('').forEach(function(dummy) { ... });

    return decrypted_data;
}; // var decrypt = function(encrypted, password) { ... };


/**
 * Prepare for upvoting the blog
 * @param {json}        options     the options for upvoting
 */
var prepare = function(options) {
    pgs.disabled = true;
    num.disabled = true;
    vote.disabled = true;
    chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
        var substr = tabs[0].url.split('@').pop().split('/');
        var author = substr[0];
        var permlink = substr[1];
        if (!tabs[0].url.startsWith('https://steemit.com/') ||  !author || !permlink) {
            std.innerHTML = 'No blogs found in this page';
            return ;
        } // if (!author || !permlink)
        steem.api.getActiveVotes(author, permlink, function(err, res) {
            if (err) {
                std.style.color = 'red';
                var msgs = [err.data.message]
                                .concat(err.data.stack.map( (e)=>e.format.trim() ));
                std.innerHTML = msgs.join('\n');
                return ;
            } // if (err)

            // Blog already upvoted
            if (res.map( (b)=>b.voter ).includes(options.author)) {
                std.style.color = 'blue';
                std.innerHTML = 'Blog already upvoted';
                return ;
            } // if (res.map( (b)=>b.voter ).includes(options.author))

            // Check if blog is 7 days ago
            steem.api.getBlog(author, 1000000000, 500, function(err, res) {
                if (err) {
                    std.style.color = 'red';
                    var msgs = [err.data.message]
                                    .concat(err.data.stack.map( (e)=>e.format.trim() ));
                    std.innerHTML = msgs.join('\n');
                    return ;
                } // if (err)

                var blog = res.filter( (e)=>e.comment.author===author&&e.comment.permlink===permlink )[0];
                steem.api.getConfig(function(err, re) {
                    if (err) {
                        std.style.color = 'red';
                        var msgs = [err.data.message]
                                        .concat(err.data.stack.map( (e)=>e.format.trim() ));
                        std.innerHTML = msgs.join('\n');
                        return ;
                    } // if (err)

                    if (new Date(blog.comment.cashout_time + 'Z').getTime() <=
                        new Date().getTime() + 12*3600*1000) {
                        std.style.color = 'blue';
                        std.innerHTML = 'Blog closed for voting';
                        return ;
                    } // if ( ... )

                    // Blog available for upvoting
                    pgs.disabled = false;
                    num.disabled = false;
                    vote.disabled = false;
                    std.style.color = 'black';
                    std.innerHTML = 'Blog ready for upvoting';
                }); // steem.api.getConfig(function(err, re) { ... });
            }); // steem.api.getBlog(author,  1000000000, 500, function(err, res) );
        }); // steem.api.getActiveVotes(blog.author, blog.permlink, ... );
    }); // chrome.tabs.query({active:true, currentWindow:true}, function(tabs) );
}; // var prepare = function(options, callback) { ... };


/**
 * Upvote the blog
 * @param {json}    options     the options for upvoting
 */
var upvote = function(options) {
    std.innerHTML = 'Upvoting ...';
    chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
        var substr = tabs[0].url.split('@').pop().split('/');
        var author = substr[0];
        var permlink = substr[1];

        // Vote it
        steem.api.getConfig(function(err, re) {
            if (err) {
                std.style.color = 'red';
                var msgs = [err.data.message]
                                .concat(err.data.stack.map( (e)=>e.format.trim() ));
                std.innerHTML = msgs.join('\n');
                return ;
            } // if (err)

            // Upvote it
            var weight = pgs.value * 100.0 / re.STEEMIT_100_PERCENT;


            steem.broadcast.vote(options.posting_key, options.author, author, permlink,
                                Math.round(re.STEEMIT_100_PERCENT * weight),
                                function(err, result) {
                if (err) {
                    std.style.color = 'red';
                    var msgs = [err.data.message]
                                    .concat(err.data.stack.map( (e)=>e.format.trim() ));
                    std.innerHTML = msgs.join('\n\n');
                    return ;
                } // if (err)
                std.innerHTML = 'Blog upvoted: weight=' + weight;
            }); // steem.api.getConfig(function(err, re) { ... });
        }); // steem.api.getConfig(function(err, re) { ... });
    }); // chrome.tabs.query({active:true, currentWindow:true}, function(tabs) );
}; // var upvote = function(options) { ... };

// Initialize
chrome.storage.sync.get({
                            author:         '',
                            posting_key:    '',
                            weight:         defaultWeight
                        }, function(re) {

    // Initialize
    pgs.value = re.weight;
    num.value = re.weight;
    re.posting_key = decrypt(re.posting_key, prefs.password);
    if (re.author === '') {
        stdOp.style.color = 'red';
        stdOp.innerHTML = ' NOT ready';
    } else {
        op.style.display = 'none';
        stdOp.innerHTML = 'voter: @' + re.author;
    } // else - if (re.author === '')
    prepare(re);

    // Event listener -- pgs
    pgs.oninput = function() {
        num.value = pgs.value;
    }; // pgs.oninput = function() { ... };

    // Event listener -- pgs
    num.oninput = function() {
        pgs.value = num.value;
    }; // num.oninput = function() { ... };

    // Event listener -- vote
    vote.onclick = function() {
        upvote(re);
    }; // vote.onclick = function() { ... };

    // Event listener -- option
    op.onclick = function() {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage(function() {
                chrome.storage.sync.get({
                                            author:         '',
                                            posting_key:    '',
                                            weight:         defaultWeight
                                        }, function(re) {
                    re.posting_key = decrypt(re.posting_key, prefs.password);
                    if (re.author === '') {
                        stdOp.style.color = 'red';
                        stdOp.innerHTML = 'Options NOT ready';
                    } // if (re.author === '')  
                    stdOp.innerHTML = re.toString();
                }); // chrome.storage.sync.get({ ... }, function() { ... });
            }); // chrome.runtime.openOptionsPage(function() { .. });
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        } // if (chrome.runtime.openOptionsPage) {
    }; // op.onclick = function() { ... };

}); // chrome.storage.sync.get({ ... }, function() { ... });
