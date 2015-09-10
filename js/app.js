var map;

var initMap = function(){
    // The coordinates for Washington DC
    var latlng = {
        'lat': 38.8993488,
        'lng': -77.0145665
    };

    map = new google.maps.Map(document.getElementById('map'), {
        'center': latlng,
        'zoom': 13
    })
}