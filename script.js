var API_URL = "https://opensky-network.org/api/states/all";
mapboxgl.accessToken =
  "pk.eyJ1IjoicmluZ29tYXIiLCJhIjoiY2t1YzN1cGdpMHd4cTMxbzNxdG5qb3FodSJ9.q-yhJzE9cbhtNapemSOT3g";
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/navigation-night-v1",
  center: [-61.250486697793875, 10.435102212255927],
  zoom: 6,
});
var radius = 5;
var markers = {};
var circleLayer;

function getFlightData(latitude, longitude) {
  var params = {
    lamin: latitude - radius,
    lamax: latitude + radius,
    lomin: longitude - radius,
    lomax: longitude + radius,
  };

  return fetch(API_URL + "?" + new URLSearchParams(params))
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch flight data");
      }
      return response.json();
    })
    .then(function (data) {
      return data.states;
    });
}

function checkPlaneInZone(plane, latitude, longitude) {
  try {
    if (!Array.isArray(plane) || plane.length < 7) {
      return false;
    }

    var planeLat = plane[6];
    var planeLon = plane[5];

    if (planeLat === null || planeLon === null) {
      return false;
    }

    var distance =
      Math.abs(latitude - planeLat) + Math.abs(longitude - planeLon);
    return distance <= radius;
  } catch (error) {
    console.log("Error checking zone:", error);
    return false;
  }
}

function createPopupContent(plane) {
  var planeId = plane[0];
  var callsign = plane[1];
  var origin = plane[2];
  var destination = plane[3];

  var content = "<div>";
  content += "<h3>" + callsign + "</h3>";
  content += "<p><strong>Origin:</strong> " + origin + "</p>";
  content += "</div>";

  return content;
}

function updatePlanes() {
  console.log("Updating Planes");
  var latitude = 10.435102212255927;
  var longitude = -61.250486697793875;

  getFlightData(latitude, longitude)
    .then(function (flightData) {
      var count = 0;
      for (var planeId in markers) {
        if (!checkPlaneInZone(flightData[planeId], latitude, longitude)) {
          markers[planeId].remove();
          delete markers[planeId];
        }
      }
      for (var i = 0; i < flightData.length; i++) {
        var plane = flightData[i];
        var planeId = plane[0];
        if (checkPlaneInZone(plane, latitude, longitude) && !markers[planeId]) {
          var planeLat = plane[6];
          var planeLon = plane[5];
          var customIcon = document.createElement("div");
          customIcon.className = "custom-icon";
          customIcon.style.backgroundImage = "url(./flight_icon.png)";
          customIcon.style.width = "64px";
          customIcon.style.height = "64px";

          var marker = new mapboxgl.Marker({
            element: customIcon,
            anchor: "bottom",
          })
            .setLngLat([planeLon, planeLat])
            .setPopup(new mapboxgl.Popup().setHTML(createPopupContent(plane)))
            .addTo(map);
          markers[planeId] = marker;
          count++;
        }
      }
      var planeCountElement = document.querySelector(".planeCount");
      if (planeCountElement) {
        planeCountElement.innerHTML = count;

        var options = {
          duration: 3500,
          useEasing: true,
          useGrouping: true,
          separator: ",",
        };
        var countUp = new CountUp(planeCountElement, 0, count, 0, options);
        if (!countUp.error) {
          countUp.start();
        } else {
          console.error(countUp.error);
        }
      }
    })
    .catch(function (error) {
      console.error(error);
    });
}

setInterval(updatePlanes, 3 * 60 * 1000);

map.on("load", function () {
  var center = [-61.250486697793875, 10.435102212255927];
  var radiusInKm = radius * 100;
  var options = {
    steps: 64,
    units: "kilometers",
    properties: { foo: "Looking Loaction" },
  };
  var circle = turf.circle(center, radiusInKm, options);

  map.addLayer({
    id: "radius-circle",
    type: "fill",
    source: {
      type: "geojson",
      data: circle,
    },
    paint: {
      "fill-color": "#36474f",
      "fill-opacity": 0.2,
    },
  });
  updatePlanes();
});
