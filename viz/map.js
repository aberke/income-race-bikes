/* Map things

*/
const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';

let stationYears;
let censusTractDataGeojson;

let map;
let censusTractInfoLayerGroup;

// Create the layers from geojson features as they are needed and cache them for reuse
let raceLayerGroups = {};
let incomeLayerGroups = {};
let bikeStationMarkerLayerGroups = {};
let currentBikeStationMarkerLayerGroup;
let currentYear;
let currentOptions;

const INITIAL_ZOOM_LEVEL = 12;
const MAX_ZOOM_LEVEL = 18;

const MAP_START_VIEW_CENTER_NYC = [40.691425, -73.987242];  // Location: The Recurse Center
const MAP_START_VIEW_CENTER_BOSTON = [42.360406,-71.0601817];
const MAP_START_VIEW_CENTER_PHILLY = [39.952876, -75.164035];

const setupMap = (city) => {
  let mapStartViewCenter = (city == 'boston') ? MAP_START_VIEW_CENTER_BOSTON : MAP_START_VIEW_CENTER_NYC;
  if (city==='boston') {
    mapStartViewCenter = MAP_START_VIEW_CENTER_BOSTON;
    stationYears = stationsByYearsMap(bostonStationsJson);
  } else if (city==='philly') {
    mapStartViewCenter = MAP_START_VIEW_CENTER_PHILLY;
    // TODO:
    // stationYears = stationsByYearsMap(phillyStationsJson);
  } else {
    mapStartViewCenter = MAP_START_VIEW_CENTER_NYC;
    stationYears = stationsByYearsMap(nycStationsJson);
  }
    
  map = L
    .map('map', {
      preferCanvas: true,
      zoomControl:false,
    })
    .setView(mapStartViewCenter, INITIAL_ZOOM_LEVEL);

  L.tileLayer(MAPBOX_URL, {
      maxZoom: MAX_ZOOM_LEVEL,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1Ijoic3RlaWZpbmVvIiwiYSI6ImNqdnlhY2I1NjBkcmQ0OHMydjYwd2ltMzgifQ.ImDnbNXB_59ei8IVXCN_4g'
    })
    .addTo(map);


  // set up listeners
  map.on('zoomend', () => {
    const currentZoom = map.getZoom();

    // adjust the bike markers
    currentBikeStationMarkerLayerGroup = bikeStationMarkerLayerGroups[currentYear];
    if (!!currentBikeStationMarkerLayerGroup && map.hasLayer(currentBikeStationMarkerLayerGroup)) {
      if (currentZoom >= 14) {
        currentBikeStationMarkerLayerGroup.eachLayer((marker) => {
          marker.setRadius(5);
        });
      } else {
        currentBikeStationMarkerLayerGroup.eachLayer((marker) => {
          marker.setRadius(2);
        });
      }
    }
  });

  addCensusTractInfoLayer();
}





/* Map Layers */

// TODO: maybe use options instead of checks
const redrawMapLayers = (previousYear=currentYear, year=currentYear, options) => {
	// The ordering of the map layers matters for both
	// aesthetics and clickability
	// Map layer order:
	// race, income, info, bikes

	removeRaceLayer(previousYear);
	if (raceCheck.checked)
		addRaceLayer(year);

	removeIncomeLayer(previousYear);
	if (incomeCheck.checked)
		addIncomeLayer(year);

	// Make the census tract info layer once (in setup)
	// then make sure it is always on top (but below bikes)
	redrawCensusTractInfoLayer();

	removeBikeStationLayer(previousYear);
	if (bikeCheck.checked)
		addBikeStationLayer(year);
}

const censusTractFeatureStyleHighlight = {
  stroke: true,
  color: 'gray', // '#F5F5F5',
  opacity: 0.5,
  weight: 1,
  fill: true,
  fillOpacity: 0.3,
};
const censusTractFeatureStyleDefault = {
  stroke: false,
  fill: false,
};
const handleCensusTractInfoLayerFeature = (feature, layer) => {
    (function(layer, properties) {
      layer.on('mouseover', function (e) {
        // Change the style to the highlighted version
        layer.setStyle(censusTractFeatureStyleHighlight);
        fillTractInfoBox(properties);
      });
      layer.on('mouseout', function (e) {
        emptyTractInfoBox();
        layer.setStyle(censusTractFeatureStyleDefault);
      });
      // Close the "anonymous" wrapper function, and call it while passing
      // in the variables necessary to make the events work the way we want.
    })(layer, feature.properties);
}

const makeCensusTractInfoLayer = () => {
  censusTractInfoLayerGroup = L
    .geoJson(censusTractDataGeojson, {
      onEachFeature: handleCensusTractInfoLayerFeature,
      style: censusTractFeatureStyleDefault,
    });  
}

const redrawCensusTractInfoLayer = () => {
  map.removeLayer(censusTractInfoLayerGroup);
  addCensusTractInfoLayer();
}

const addCensusTractInfoLayer = () => {
  if (!censusTractInfoLayerGroup)
    makeCensusTractInfoLayer();
  map.addLayer(censusTractInfoLayerGroup);
}

const removeRaceLayer = (year=currentYear) => {
  year = (year > 2017) ? 2017 : year;
  if (!!raceLayerGroups[year] && map.hasLayer(raceLayerGroups[year]))
    map.removeLayer(raceLayerGroups[year]);
}

const addRaceLayer = (year=currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = (year > 2017) ? 2017 : year;
  if (!raceLayerGroups[year])
    raceLayerGroups[year] = L.geoJson(censusTractDataGeojson, {style: raceStyle(year)});
  // raceLayerGroups[year].addTo(map);
  map.addLayer(raceLayerGroups[year]);
}

const removeIncomeLayer = (year=currentYear) => {
  year = (year > 2017) ? 2017 : year;
  if (!!incomeLayerGroups[year] && map.hasLayer(incomeLayerGroups[year]))
    map.removeLayer(incomeLayerGroups[year]);
}

const addIncomeLayer = (year=currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = (year > 2017) ? 2017 : year;
  if (!incomeLayerGroups[year])
    incomeLayerGroups[year] = L.geoJson(censusTractDataGeojson, {style: incomeStyle(year)});
  map.addLayer(incomeLayerGroups[year]);
}

const removeBikeStationLayer = (year=currentYear) => {
  if (!!bikeStationMarkerLayerGroups[year] && map.hasLayer(bikeStationMarkerLayerGroups[year])) {
    map.removeLayer(bikeStationMarkerLayerGroups[year]);
  }
}

const addBikeStationLayer = (year=currentYear) => {
  if (!bikeStationMarkerLayerGroups[year])
    bikeStationMarkerLayerGroups[year] = createBikeStationLayerGroup(year);
  map.addLayer(bikeStationMarkerLayerGroups[year]);
}

const createBikeStationLayerGroup = (year) => {
  let bikeStationMarkerLayerGroup = L.layerGroup();
  for (let i = 2013; i < (currentYear + 1); i++) {
    const stations = stationYears[i] || [];
    stations.forEach((station) => {
      if (station.last < currentYear) {
        console.log('found a disappearing station!', station)
        return;
      }
      const marker = L
        .circleMarker([station.lat, station.lon], bikeMarkerStyle(station))
        .bindPopup(getBikeStationInfoPopup(station));

      bikeStationMarkerLayerGroup.addLayer(marker);
    });
  }
  return bikeStationMarkerLayerGroup;
}


/* Map Layers Styling */
const bikeMarkerStyle = (station) => {
	return {
      radius: 2,
      title: station.name,
      stroke: true,
      color: 'rgba(0, 0, 255, 1)',
      fillOpacity: .8,
      fillColor: 'rgb(81, 152, 214)',
    };
}


// Used for NaN values, etc
const COLOR_GRADIENT_DEFAULT = 'rgba(0, 0, 0, 0)';
// This color gradient is implemented as a piecewise function
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_START = 'rgba(255, 245, 64, .2)';
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID = 'rgba(73, 143, 54, .7)';
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_END = 'rgba(73, 143, 54, .9)';
const PIECEWISE_INCOME_GRADIENT_SCALE_MID = 140000;
const lowIncomeColorRange = d3
  .scaleLinear()
  .domain([20000, PIECEWISE_INCOME_GRADIENT_SCALE_MID])
  .range([PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_START, PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID]);

const highIncomeColorRange = d3
  .scaleLinear()
  .domain([PIECEWISE_INCOME_GRADIENT_SCALE_MID, 300000])
  .range([PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID, PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_END]);

const incomeStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  let income = getTractData(feature.properties, TRACT_MEDIAN_INCOME_KEY, year);
  if (income === '250,000+') {
    income = 300000;
  }
  let fillColor;
  if (isNaN(parseInt(income))) {
    fillColor = COLOR_GRADIENT_DEFAULT;
  } else if (income < PIECEWISE_INCOME_GRADIENT_SCALE_MID) {
    fillColor = lowIncomeColorRange(income);
  } else {
    fillColor = highIncomeColorRange(income);
  }
  return {
    fillColor,
    fillOpacity: 1,
    stroke: false,
  };
};

const RACE_COLOR_GRADIENT_START = 'rgba(171, 151, 219, 0.5)';
const RACE_COLOR_GRADIENT_END = 'rgba(22, 133, 199, 0.7)';
const raceColorRange = d3
  .scaleLinear()
  .domain([0, 100])
  .range([RACE_COLOR_GRADIENT_START, RACE_COLOR_GRADIENT_END]);

const raceStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  let percentWhite = getTractPercentWhite(feature.properties, year);
  let fillColor = COLOR_GRADIENT_DEFAULT;
  if (!!percentWhite)
    fillColor = raceColorRange(percentWhite);
  return {
    fillColor: fillColor,
    fillOpacity: 1,
    stroke: false,
  };
};

