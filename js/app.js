(function(){

    var map;

    // Make the initMap function global as required by the Google API callback
    var initMap = function(){
        // The coordinates for Washington DC
        var latlng = {
            'lat': 38.8993488,
            'lng': -77.0145665
        };

        map = new google.maps.Map(document.getElementById('map'), {
            'center': latlng,
            'zoom': 13
        });
    };

    // Function for generating a nonce (not cryptographically secure)
    var getOauthNonce = function(){
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';
        for (var i = 0; i < 16; i++) {
            result += characters[Math.floor(Math.random()*characters.length)];
        }
        return result;
    };

    // Separate the credentials from the request parameters for cleaner, easier to maintain code
    var yelpCredentials = {
        'oauth_consumer_key': 'GX4SzhxU7eRLahA3uHCzjg',
        'oauth_consumer_secret': '80KyH1LU61DbspThag9cHlElFU4',
        'oauth_token': 'C2Hnx7enF1YglJQy3hISrug3mqF6YWWd',
        'oauth_token_secret': 'ghsYY1qX0r8M88uCDacjQN51owo'
    };

    var yelpUrl = 'http://api.yelp.com/v2/search';

    var getYelpListings = function(){

        var params = {
            'location': 'washington+dc',
            'callback': 'yelpCallback', // Setting it before is required as this needs to be encoded into the signature
            'oauth_consumer_key': yelpCredentials.oauth_consumer_key,
            'oauth_token': yelpCredentials.oauth_token,
            'oauth_nonce': getOauthNonce(),
            'oauth_timestamp': Math.floor(Date.now() / 1000),
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_version': '1.0'
        };

        // Generate the OAuth signature required by Yelp using bettiolo/oauth-signature-js
        params.oauth_signature = window.gd = oauthSignature.generate('GET', yelpUrl, params, yelpCredentials.oauth_consumer_secret, yelpCredentials.oauth_token_secret);
        console.log(params);

        $.ajax({
            'url': yelpUrl,
            'data': params,
            'cache': true,
            'dataType': 'jsonp',
            'jsonpCallback': 'yelpCallback',
            'success': function(data) {
                // TODO: show results on page
            }
        });
    };

    initMap();
    getYelpListings();

})();
