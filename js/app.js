(function(){

    var map;
    var locations = []; // Does not need to be observable as an observable array will be later created from this array
    var infoWindow;

    // Make the initMap function global as required by the Google API callback
    var initMap = function(){
        // The coordinates for Washington DC
        var latlng = {
            'lat': 38.8993488,
            'lng': -77.0145665
        };

        map = new google.maps.Map(document.getElementById('map'), {
            'center': latlng,
            'zoom': window.innerWidth > 1400 ? 14 : 13, // Lower zoom on smaller displays
            'disableDefaultUI': true
        });

        infoWindow = new google.maps.InfoWindow();
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

    var showMarker = function (argument) {
        // body...
    }

    var sanitizeHtml = function(str) {
        return str.replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    };

    // Separate the credentials from the request parameters for cleaner, easier to maintain code
    var yelpCredentials = {
        'oauth_consumer_key': 'GX4SzhxU7eRLahA3uHCzjg',
        'oauth_consumer_secret': '80KyH1LU61DbspThag9cHlElFU4',
        'oauth_token': 'C2Hnx7enF1YglJQy3hISrug3mqF6YWWd',
        'oauth_token_secret': 'ghsYY1qX0r8M88uCDacjQN51owo'
    };

    var yelpUrl = 'http://api.yelp.com/v2/search';

    // The model for locations displayed

    var MapViewModel = function(){

        this.locations = ko.observableArray(locations);

    };

    var Marker = function(business){
        this.marker = new google.maps.Marker({
            'position': business.latlng,
            'map': map,
            'title': 'Goodas',
            'icon': this.image
        });

        var self = this;

        this.marker.addListener('mouseover', function(){
            self.marker.setIcon(self.hoverImage);
        });
        this.marker.addListener('mouseout', function(){
            self.marker.setIcon(self.image);
        });
    };

    Marker.prototype.image = {
        url: 'assets/pointer.png',
        size: new google.maps.Size(22, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(11, 40)
    };

    Marker.prototype.hoverImage = {
        url: 'assets/pointer-mouseover.png',
        size: new google.maps.Size(22, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(11, 40)
    };

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
        params.oauth_signature = oauthSignature.generate('GET', yelpUrl, params, yelpCredentials.oauth_consumer_secret, yelpCredentials.oauth_token_secret);

        $.ajax({
            'url': yelpUrl,
            'data': params,
            'cache': true,
            'dataType': 'jsonp',
            'jsonpCallback': 'yelpCallback',
            'success': function(data) {
                for (var i = 0; i < data.businesses.length; i++) {
                    var business = data.businesses[i];

                    // Change the data to fit our needs
                    business.address = business.location.display_address[0] + ', ' + business.location.display_address[1]; // Full address
                    business.latlng = {
                        'lat': business.location.coordinate.latitude,
                        'lng': business.location.coordinate.longitude
                    },
                    business.marker = new Marker(business);

                    locations.push(business);
                }

                ko.applyBindings(new MapViewModel());
            }
        });
    };

    initMap();
    getYelpListings();

})();
