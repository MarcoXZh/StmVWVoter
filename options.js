steem.api.setOptions({url: 'https://api.steemit.com'});
var std = document.getElementById('std');


/**
 * Encrypt data
 * @param {string}  plain       the plain text to be encrypted
 * @param {string}  password    the password
 */
var encrypt = function(plain, password) {
    // Salt the data with dummies
    var encrypted_data = plain.toString();
    while (encrypted_data.length < prefs.KEY_LENGTH) {
        var idx1 = Math.floor(encrypted_data.length * Math.random());
        var idx2 = Math.floor(prefs.DUMMY.length * Math.random());
        encrypted_data = encrypted_data.substring(0, idx1) + prefs.DUMMY[idx2]
                         + encrypted_data.substring(idx1, encrypted_data.length);
    } // while (encrypted_data.length < prefs.KEY_LENGTH)
    // Encrypt
    return CryptoJS.AES.encrypt(encrypted_data, password);
}; // var encrypt = function(plain, password) { ... };


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

// Save Options
document.getElementById('save').addEventListener('click', function() {
    var voter = document.getElementById('voter');
    var posting_key = document.getElementById('posting_key');
    var weight = document.getElementById('weight');

    // Verify voter name
    var valVoter = voter.value.trim();
    if (valVoter === '') {
        std.style.color = 'red';
        std.innerHTML = 'Invalid voter: empty';
        voter.focus();
        return ;
    } // if (valVoter === '')

    // Verify posting key
    var valKey = posting_key.value.trim();
    if (valKey === '') {
        std.style.color = 'red';
        std.innerHTML = 'Invalid posting key: empty';
        posting_key.focus();
        return ;
    } else if (document.getElementById('hidden').value !== 'true') {
        std.style.color = 'red';
        std.innerHTML = 'Invalid posting key';
        posting_key.focus();
        return ;
    } // else if - if

    // Verify weight
    var valWeight = parseFloat(weight.value.trim());
    if (valWeight < 0 || valWeight > 100) {
        std.style.color = 'red';
        std.innerHTML = 'Invalid voter: empty';
        weight.focus();
        return ;
    } // if (valWeight < 0 || valWeight > 100)

    // Now save
    chrome.storage.sync.set({
                                voter:          valVoter,
                                posting_key:    encrypt(valKey, prefs.password),
                                weight:         valWeight
                            }, function() {
        // Update status to let user know options were saved.
        std.innerHTML = 'Options saved';
        setTimeout(function() { std.innerHTML = ''; }, 3000);
    }); // chrome.storage.sync.set({ ... }, function() { ... });
}); // document.getElementById('save').addEventListener('click', function() );

// Restore options
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get({
                                voter:          '',
                                posting_key:    '',
                                weight:         '60'
                            }, function(re) {
        re.posting_key = decrypt(re.posting_key, prefs.password)
        document.getElementById('voter').value = re.voter;
        document.getElementById('posting_key').value = re.posting_key;
        document.getElementById('weight').value = re.weight;
        if (re.weight === '' || re.posting_key === '') {
            return ;
        } // if (re.weight === '' || re.posting_key === '')

        // Verify the key
        steem.api.getAccounts([re.voter], function(err, res) {
            if (err) {
                std.style.color = 'red';
                var msgs = [err.data.message].concat(err.data.stack.map( (e)=>e.format ));
                std.innerHTML = msgs.join(' ');
                return ;
            } // if (err)

            try {
                if(!steem.auth.wifIsValid(re.posting_key,
                                          res[0].posting.key_auths[0][0])) {
                    document.getElementById('key_type').innerHTML = 'Unkown Key';
                    document.getElementById('hidden').value = 'false';
                    std.style.color = 'red';
                    std.innerHTML = 'Posting key corrupted';
                } // if ( ... )
            } catch (err) {
                std.innerHTML = err;
            } // try - catch (err)

        }); // steem.api.getAccounts([re.voter], function(err, res) { ... });
    }); // chrome.storage.sync.get({ ... }, function(re) { ... });
}); // document.addEventListener('DOMContentLoaded', function() { ... });

// Toggle posting key visibility
document.getElementById('toggle').addEventListener('click', function() {
    var posting_key = document.getElementById('posting_key');
    if (this.src.endsWith('toggleVisible.png')) {
        posting_key.type = 'password';
        this.src = './icons/toggleInvisible.png';
    } else {
        posting_key.type = 'text';
        this.src = './icons/toggleVisible.png';
    } // if (this.src.endsWith('toggleVisible.png'))
}); // document.getElementById('toggle').addEventListener('click', function() );

// Verify posting key
document.getElementById('posting_key').addEventListener('input', function() {
    var valVoter = document.getElementById('voter').value.trim();
    var valKey = this.value.trim();
    steem.api.getAccounts([valVoter], function(err, res) {
        if (err) {
            std.style.color = 'red';
            var msgs = [err.data.message].concat(err.data.stack.map( (e)=>e.format ));
            std.innerHTML = msgs.join(' ');
            return ;
        } // if (err)

        var key_type = document.getElementById('key_type');
        var hidden = document.getElementById('hidden');
        try {
            var pubOwner = res[0].owner.key_auths[0][0];
            var pubActive = res[0].active.key_auths[0][0];
            var pubPosting = res[0].posting.key_auths[0][0];
            var pubMemo = res[0].memo_key;
            if (pubActive === valKey) {
                key_type.innerHTML = 'Public Active Key';
                hidden.value = "false";
            } else if (pubPosting === valKey) {
                key_type.innerHTML = 'Public Posting Key';
                hidden.value = "false";
            } else if (pubMemo === valKey) {
                key_type.innerHTML = 'Public Memo Key';
                hidden.value = "false";
            } else if (pubOwner === valKey) {
                key_type.innerHTML = 'Public Owner Key';
                hidden.value = "false";
            } else if (steem.auth.wifIsValid(valKey, pubPosting)) {
                key_type.innerHTML = 'Private Posting Key';
                hidden.value = "true";                      // Only accept this key
            } else if (steem.auth.wifIsValid(valKey, pubActive)) {
                key_type.innerHTML = 'Private Active Key';
                hidden.value = "false";
            } else if (steem.auth.wifIsValid(valKey, pubMemo)) {
                key_type.innerHTML = 'Private Memo Key';
                hidden.value = "false";
            } else if (steem.auth.wifIsValid(valKey, pubOwner)) {   // this throws error
                key_type.innerHTML = 'Private Owner Key';
                hidden.value = "false";
            } else {
                key_type.innerHTML = 'Unkown Key';
                hidden.value = "false";
            } // if .. else - if ... else ...
        } catch (err) {
            key_type.innerHTML = 'Unkown Key';
            hidden.value = "false";
        } // try - catch (err)

    }); // steem.api.getAccounts([valVoter], function(err, res) { ... });
}); // document.getElementById('posting_key').addEventListener('input', function() );
