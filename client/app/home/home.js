// Unbalanced ()) Greenfield Project
// =============================================================================

'use strict';

angular.module('myApp.home', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/home', {
    templateUrl: 'home/home.html',
    controller: 'homeController'
  });
}])

.controller('homeController', ['$scope', '$log','$http', function($scope, $log,$http) {

// $SCOPE VARIABLES
  $scope.map;
  $scope.userPosition;
  $scope.sitesResults;
  $scope.currentKeyword;
  $scope.clickedPosition;
  $scope.currentRankByFlag;

// OTHER VARIABLES
  var defaultLocation = {
    lat: 37.7833,
    lng: -122.4167
  };
  var userMarkerImage = '../assets/images/centerFlag.png';
  var blueDotImage = '../assets/images/bluedot.png';
  var markers = [];
  var infowindow;
  var geocoder;
  var userMarker;
  var searchLocation;

  $scope.sports = {
    'Basketball': 'Basketball Court',
    'Soccer': 'Soccer Field',
    'Tennis': 'Tennis Court',
    'Baseball': 'Baseball Field',
    'Softball': 'Softball Field',
    'Gym': 'Gym',
    'Rock Climbing': 'Climbing Gym',
    'Golf': 'Golf Course',
    'Racquetball': 'Racquetball Court',
    'Squash': 'Squash Court'
  };


// AUTH METHODS
  $scope.loginFacebook = function() {
    return $http({
      method: 'GET',
      url: '/auth/facebook'
    })
    .then(function (resp) {
      return resp.data;
    });
  };


// CHANGE USER'S LOCATION
  $scope.changeLocation = function(locationData) {
    geocoder = new google.maps.Geocoder();  // init Geocoder

    geocoder.geocode(    // get LatLng for given address
      {'address': locationData},
      function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          getMap(results[0].geometry.location, 14);  // redraw map with new location
        } else {
          alert('Location change failed because: ' + status);
        }
    });
  };

// CREATE A PERSISTENT CENTER MARKER
  var drawUserMarker = function(position) {
    if (position == undefined) {
      position = $scope.map.getCenter();
    }

    userMarker = new google.maps.Marker({  // define new center marker
      position: position,
      icon: userMarkerImage
    });

    userMarker.setMap($scope.map);  // set the new center marker
  };

// DRAW A MAP WITH CENTER MARKER, ADD EVENT LISTENER TO REDRAW CENTER MARKER
  var getMap = function(latLngObj, zoomLevel) {
    $scope.map = new google.maps.Map(document.getElementById('map'), {  // draw map
      center: latLngObj,
      zoom: zoomLevel,
      disableDoubleClickZoom: true
    });

    infowindow = new google.maps.InfoWindow();  // init infowindow

    $scope.map.addListener('dblclick',  // double-click to set a flag
      function(event) {
        if (userMarker) {
          userMarker.setMap(null);
        }
        drawUserMarker(event.latLng);
        $scope.clickedPosition = event.latLng;
    });
  };

// GEOLOCATE USER'S POSITION
  $scope.userfind = function() {
    getMap(defaultLocation, 12);  // draw map with default location

    if (navigator.geolocation) {  // attempt geolocation if user allows
      navigator.geolocation.getCurrentPosition(function(position) {
        $scope.userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        var blueDotMarker = new google.maps.Marker({  // create blueDot marker for user's position
          position: $scope.userPosition,
          animation: google.maps.Animation.DROP,
          icon: blueDotImage
        });
        blueDotMarker.setMap($scope.map);  // set the blueDot marker


        $scope.map.setCenter($scope.userPosition);  // reset map with user position and closer zoom
        $scope.map.setZoom(14);
      },
      function() {  // error, but browser supports geolocation
        handleLocationError(true, infoWindow, $scope.map.getCenter());
      });
    } else {  // error, browser doesn't support geolocation
      handleLocationError(false, infoWindow, $scope.map.getCenter());
    }


     $scope.$apply();  // force update the $scope

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
      infoWindow.setPosition(pos);
      infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    };
  };

// CREATE MARKERS FOR SITES
  $scope.createMarker = function(place) {
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
      map: $scope.map,
      position: place.geometry.location,
      animation: google.maps.Animation.DROP
    });

    marker.addListener('click', function() { // add event listener for each marker
      infowindow.setContent(place.name);
      infowindow.open($scope.map, this);
    });

    markers.push(marker); // add each marker to markers array
  };

// CLICK EVENT LISTENER FOR SITE LIST
  $scope.siteListClick = function($index) {
    google.maps.event.trigger(markers[$index], 'click'); // trigger click event on respective marker
  };

// POPULATE SITE LIST FOR SELECTED SPORT
  $scope.populateList = function(keyword, rankByFlag) {
    var request;
    $scope.currentRankByFlag = rankByFlag;
    
    if (keyword != undefined) { // if keyword is passed in, save it
      $scope.currentKeyword = keyword;
    }
    if ($scope.clickedPosition == undefined) {  // if no flag set, search around center of map
      searchLocation = $scope.map.getCenter();
    } else {  // otherwise search around flag
      searchLocation = $scope.clickedPosition;
    }
    if (rankByFlag) {
      request = {
        location: searchLocation,  // determine current center of map
        keyword: [keyword],  // keyword to search from our search object
        rankBy: google.maps.places.RankBy.DISTANCE  // rank by Prominence is default, unless indicated by paramter
      };
    } else {
      request = {
        location: searchLocation,  // determine current center of map
        radius: '2000',  // search radius in meters
        keyword: [keyword]  // keyword to search from our search object
      };
    }

    markers.forEach(function(marker) {
      marker.setMap(null);  // reset current markers on map
    });

    markers = []; // clear markers array
    $scope.sitesResults = []; // clear site list

    var service = new google.maps.places.PlacesService($scope.map);  // init service
    service.nearbySearch(request, nearbySearchCallback);  // perform the search with given parameters

    function nearbySearchCallback(results, status) {  // this callback must handle the results object and the PlacesServiceStatus response
      console.log('results: ', results);
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        $scope.sitesResults = results; // populate site list with results
        $scope.$apply();  // force update the $scope
        
        results.forEach(function(place) {  // create markers for results
          $scope.createMarker(place);
        });
      }
    }
  };




}]);


