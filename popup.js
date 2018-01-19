steem.api.setOptions({url: 'https://api.steemit.com'});
var defaultWeight = '60';
var pgs = document.getElementById('pgs');
var num = document.getElementById('num');
var vote =  document.getElementById('vote');
var op =  document.getElementById('option');
var std = document.getElementById('std');
var stdOp = document.getElementById('stdOp');
var table = document.getElementById('table');
var votes = document.getElementById('votes');


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
 * Sort and display data in the votes table
 * @param {json}        options     the options for upvoting
 * @param {string}      col         column name to be sorted
 * @param {integer}     asc         1 for ascending; -1 for descending
 */
var sortTableData = function(options, col, asc) {
    // Remove table data rows
    var rows = document.getElementsByClassName('data-row');
    while(rows.length > 0) {
        rows[0].parentElement.removeChild(rows[0]);
    } // while(rows.length > 0)
    var sorter = natsort();
    JSON.parse(votes.value).sort(function(a, b) {
        return asc > 0 ? sorter(a[col], b[col]) : sorter(b[col], a[col]);
    }).forEach(function(e) {
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'data-row')
        prefs.cols.forEach(function(c) {
            var td = document.createElement('td');
            td.innerHTML = e[c];
            tr.appendChild(td);
        }); // prefs.cols.forEach(function(c) { ... });
        if (e.voter === options.voter) {
            tr.style.backgroundColor = 'blue';
            tr.style.color = 'white';
        } // if (e.voter === options.voter)
        table.appendChild(tr);
    }); // JSON.parse().sort().forEach();
}; // var sortTableData = function(options, col, asc) { ... };


/**
 * Display the table of voter information
 * @param {json}        options     the options for upvoting
 * @param {array}       vs          the list of votes
 */
var displayVotesTable = function(options, vs) {
    // Save votes
    votes.value = JSON.stringify(vs);

    // Add table skeleton
    var tr = document.createElement('tr');
    prefs.cols.forEach(function(col) {
        var header = document.createElement('th');
        // header.setAttribute('class', 'col-' + col);
        header.innerHTML = col;
        header.addEventListener('click', function() {
            var sort = parseInt(this.getAttribute('sort')) === 1
                                    ? -1 : 1;
            this.setAttribute('sort', sort);
            sortTableData(options, col, sort);
        }); // header.addEventListener('click', function() { ... });
        tr.appendChild(header);
    }); // prefs.cols.forEach(function(col) { ... });
    table.appendChild(tr);

    // Display table data, sorted by rshares descendent
    sortTableData(options, 'rshares', -1);
}; // var displayVotesTable = function(options, vs) { ... };


/**
 * Prepare for upvoting the blog
 * @param {json}        options     the options for upvoting
 */
var prepare = function(options) {
    pgs.disabled = true;
    num.disabled = true;
    vote.disabled = true;
    std.style.color = 'black';
    std.innerHTML = 'Loading data ...';
    chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
        if (!tabs[0].url.startsWith('https://steemit.com/')) {
            std.innerHTML = 'No blogs found in this page';
            return ;
        } // if (!tabs[0].url.startsWith('https://steemit.com/'))
        var author = tabs[0].url.split('@').pop().split('/')[0];

        // Query the title and time of the blog - for identifying the blog
        chrome.tabs.sendMessage(tabs[0].id, {}, function(response) {
            var title = response.title;
            var time = new Date(response.time).getTime();
            steem.api.getBlog(author, 1000000000, 500, function(err, res) {
                if (err) {
                    std.style.color = 'red';
                    var msgs = [err.data.message]
                                    .concat(err.data.stack.map( (e)=>e.format.trim() ));
                    std.innerHTML = msgs.join('\n');
                    return ;
                } // if (err)

                // Target blog is the one with the title and 'created' closest to the time
                var blog = res.filter( (e)=>e.comment.title===title)
                              .sort(function(a, b) {
                    return Math.abs(new Date(a.comment.created + 'Z').getTime() - time) -
                           Math.abs(new Date(b.comment.created + 'Z').getTime() - time);
                })[0]; // var blog = res.filter( ... ).sort( ... )[0];

                // Check the blog is voted or not
                console.log(res.length, title);
                steem.api.getActiveVotes(author, blog.comment.permlink,
                                         function(err, res) {
                    if (err) {
                        std.style.color = 'red';
                        var msgs = [err.data.message]
                                        .concat(err.data.stack.map( (e)=>e.format.trim() ));
                        std.innerHTML = msgs.join('\n');
                        return ;
                    } // if (err)

                    // Display the voters
                    displayVotesTable(options, res);

                    // Blog already upvoted
                    if (res.map( (b)=>b.voter ).includes(options.voter)) {
                        std.style.color = 'blue';
                        std.innerHTML = 'Blog already upvoted';
                        return ;
                    } // if (res.map( (b)=>b.voter ).includes(options.voter))

                    // Check if blog is 7 days ago
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

                }); // steem.api.getActiveVotes(author, blog.comment.permlink, ... );
            }); // steem.api.getBlog(author, 1000000000, 500, ... );
        }); // chrome.tabs.sendMessage(tabs[0].id, {}, function(response) { ... });
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
        var voter = substr[0];
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


            steem.broadcast.vote(options.posting_key, options.voter, voter, permlink,
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
                            voter:          '',
                            posting_key:    '',
                            weight:         defaultWeight
                        }, function(re) {

    // Initialize
    pgs.value = re.weight;
    num.value = re.weight;
    re.posting_key = decrypt(re.posting_key, prefs.password);
    if (re.voter === '') {
        stdOp.style.color = 'red';
        stdOp.innerHTML = ' NOT ready';
    } else {
        op.style.display = 'none';
        stdOp.innerHTML = 'voter: @' + re.voter;
    } // else - if (re.voter === '')
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
                                            voter:          '',
                                            posting_key:    '',
                                            weight:         defaultWeight
                                        }, function(re) {
                    re.posting_key = decrypt(re.posting_key, prefs.password);
                    if (re.voter === '') {
                        stdOp.style.color = 'red';
                        stdOp.innerHTML = 'Options NOT ready';
                    } // if (re.voter === '')  
                    stdOp.innerHTML = re.toString();
                }); // chrome.storage.sync.get({ ... }, function() { ... });
            }); // chrome.runtime.openOptionsPage(function() { .. });
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        } // if (chrome.runtime.openOptionsPage) {
    }; // op.onclick = function() { ... };

}); // chrome.storage.sync.get({ ... }, function() { ... });
