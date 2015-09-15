(function(){

    var map;
    var locations = []; // Does not need to be observable array as an observable array will be later created from this array
    var infoWindow;
    var currentLocation; // The current location being viewed. Equal to currentLocation attribute of the viewmodel

    var koInfoWindowBinding = $('.ko-infowindow-binding'); // Hidden Knockout bindings for the infowindow

    var initMap = function(){
        // The coordinates for Washington DC
        var latlng = {
            'lat': 38.8993488,
            'lng': -77.0145665
        };

        map = new google.maps.Map(document.getElementById('map'), {
            'center': latlng,
            'zoom': window.innerWidth > 1400 ? 14 : 13, // Use a lower zoom level on smaller displays so all markers can be seen
            'disableDefaultUI': true
        });

        infoWindow = new google.maps.InfoWindow();

        infoWindow.addListener('closeclick', function(){
            // Make sure errors are not thrown if the info window is somehow displayed without a currentLocation
            if (typeof infoWindow.currentLocation !== 'undefined'){
                infoWindow.currentLocation.marker.focused = false;
                infoWindow.currentLocation.marker.unfocus();
            }
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

    // Function for asynchronously fetching Wikipedia links and opening them
    var openWikiPage = function (location) {
        $.ajax({
            'url': 'http://en.wikipedia.org/w/api.php',
            'dataType': 'jsonp',
            'data': {
                'action': 'opensearch',
                'search': location.name
            },
            'success': function(data){
                typeof data[3][0] === 'string' ? window.open(data[3][0], '_self') : alert('Wikipedia articles for this location cannot be found'); // If there is a first link in the response, open it
            }
        });
    };

    var showInfoWindow = function (location) {
        infoWindow.currentLocation = location;
        currentLocation(location); // Change current location to update Knockout infowindow bindings
        infoWindow.setContent(koInfoWindowBinding.html());
        infoWindow.open(map, location.marker.marker);

        // Set the marker's animation to bounce and end the animation after 2100ms (3 bounces)
        var marker = location.marker.marker;
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){
            marker.setAnimation(null);
        }, 2100);
    };

    // Separate the credentials from the request parameters for cleaner, easier to maintain code
    var yelpCredentials = {
        'oauth_consumer_key': 'GX4SzhxU7eRLahA3uHCzjg',
        'oauth_consumer_secret': '80KyH1LU61DbspThag9cHlElFU4',
        'oauth_token': 'C2Hnx7enF1YglJQy3hISrug3mqF6YWWd',
        'oauth_token_secret': 'ghsYY1qX0r8M88uCDacjQN51owo'
    };

    var yelpUrl = 'http://api.yelp.com/v2/search';

    var MapViewModel = function(){

        var self = this;

        // Whether the control div is slid out (used at lower viewport widths)
        this.controlsActive = ko.observable(false);

        this.toggleControls = function(state){
            this.controlsActive(typeof state === 'boolean' ? state : !this.controlsActive()); // Reverse state if not specified
        };

        this.locations = ko.observableArray(locations);
        currentLocation = this.currentLocation = ko.observable();
        this.searchStr = ko.observable('');
        this.searchResults = ko.computed(function(){
            return ko.utils.arrayFilter(this.locations(), function(location){
                if (location.name.toLowerCase().indexOf(self.searchStr().toLowerCase()) !== -1){
                    // Change visibility based on search results
                    location.marker.marker.setMap(map);
                    return true;
                } else {
                    location.marker.marker.setMap(null);
                    return false;
                }
            });
        }, this);

        // Functions bound to the zoom buttons in the HTML
        this.zoomIn = function(){
            map.setZoom(map.getZoom() + 1);
        };

        this.zoomOut = function(){
            map.setZoom(map.getZoom() - 1);
        };

    };

    var Marker = function(location){
        this.marker = new google.maps.Marker({
            'position': location.latlng,
            'map': map,
            'icon': this.image
        });

        var self = this;

        this.focused = false;

        this.marker.addListener('click', function(){
            self.openInfoWindow();
        });

        this.marker.addListener('mouseover', function(){
            self.focus();
        });

        this.marker.addListener('mouseout', function(){
            if (self.focused === false) {
                self.unfocus();
            }
        });

        this.openInfoWindow = function(){
            unfocusAllMarkers();
            self.focused = true;
            self.focus();
            showInfoWindow(location);
        };
    };

    Marker.prototype.image = {
        url: 'assets/pointer.png',
        size: new google.maps.Size(22, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(11, 40)
    };

    Marker.prototype.focus = function(){
        this.marker.setIcon(this.hoverImage);
    };

    Marker.prototype.unfocus = function(){
        this.marker.setIcon(this.image);
    };

    Marker.prototype.hoverImage = {
        url: 'assets/pointer-mouseover.png',
        size: new google.maps.Size(22, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(11, 40)
    };

    // Function to use when a different marker or location in the sidebar is
    //  clicked directly, changing the info box and not triggering 'closeclick',
    // In such a case, it is needed to manually un-highlight the markers
    var unfocusAllMarkers = function(){
        for (var i = 0; i < locations.length; i++){
            locations[i].marker.focused && (locations[i].marker.focused = false, locations[i].marker.unfocus());
        }
    };

    var getYelpListings = function(){

        var params = {
            'location': 'washington+dc',
            'callback': 'yelpCallback', // Manually set the callback as it needs to be encoded into the signature
            'oauth_consumer_key': yelpCredentials.oauth_consumer_key,
            'oauth_token': yelpCredentials.oauth_token,
            'oauth_nonce': getOauthNonce(),
            'oauth_timestamp': Math.floor(Date.now() / 1000),
            'oauth_signature_method': 'HMAC-SHA1',
            'oauth_version': '1.0'
        };

        // Generate the OAuth signature required by Yelp using bettiolo/oauth-signature-js
        params.oauth_signature = oauthSignature.generate('GET', yelpUrl, params, yelpCredentials.oauth_consumer_secret, yelpCredentials.oauth_token_secret);

        // Timeout for if JSONP request takes too long
        var ajaxTimeout = setTimeout(function(){
            alert('Failed to load Yelp entries');
        }, 10000);

        $.ajax({
            'url': yelpUrl,
            'data': params,
            'cache': true,
            'dataType': 'jsonp',
            'jsonpCallback': 'yelpCallback',
            'success': function(data) {
                clearTimeout(ajaxTimeout);

                for (var i = 0; i < data.businesses.length; i++) {
                    var business = data.businesses[i];

                    // Change the business object to fit our needs
                    business.address = business.location.display_address[0] + ', ' + business.location.display_address[1]; // Full address
                    business.image_url = business.image_url.replace('ms', 'l');
                    business.latlng = {
                        'lat': business.location.coordinate.latitude,
                        'lng': business.location.coordinate.longitude
                    };
                    business.marker = new Marker(business);
                    // String copy of rating used in alt text
                    business.rating_str = business.rating.toString() + ' stars';

                    locations.push(business);
                }

                ko.applyBindings(new MapViewModel());
            }
        });
    };

    initMap();
    getYelpListings();

})();
