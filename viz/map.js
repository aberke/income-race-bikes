/* Map things

*/
const MAPBOX_URL =
  "https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}";

const NYC_BIKE_DATA_URL = "./data/nyc-bike/stations.json";
const BOSTON_BIKE_DATA_URL = "./data/boston-bike/stations.json";
const PHILLY_BIKE_DATA_URL = "./data/philly-bike/stations.json";
const HOU_BIKE_DATA_URL = "TODO";
const DC_BIKE_DATA_URL = "./data/dc-bike/stations.json";
const CHICAGO_BIKE_DATA_URL = "./data/chicago-bike/stations.json";
const LA_BIKE_DATA_URL = "./data/la-bike/stations.json";

const NYC_CENSUS_DATA_URL = "./data/ny/ny_census_tracts.geojson";
const BOSTON_CENSUS_DATA_URL = "./data/ma/ma_census_tracts.geojson";
const PHILLY_CENSUS_DATA_URL = "./data/pa/pa_census_tracts.geojson";
const HOU_CENSUS_DATA_URL = "./data/tx/tx_census_tracts.geojson";
const DC_CENSUS_DATA_URL = "./data/dc/dc_census_tracts.geojson";
const CHICAGO_CENSUS_DATA_URL = "./data/il/il_census_tracts.geojson";
const LA_CENSUS_DATA_URL = "./data/socal/socal_census_tracts.geojson";

const DC_BORDER_URL = "./data/dc/dc_limits.geojson";
const BOSTON_BORDER_URL = "./data/ma/boston_limits.geojson";
const CHICAGO_BORDER_URL = "./data/il/chicago_limits.geojson";
const NYC_BORDER_URL = "./data/ny/nyc_limits.geojson";
const PHILLY_BORDER_URL = "./data/pa/philly_limits.geojson";

let stationYears;
let censusTractDataGeojson;
let borderGeojson;

let map;
let censusTractInfoLayerGroup;
let borderLayer;

// Create the layers from geojson features as they are needed and cache them for reuse
let raceLayerGroups, incomeLayerGroups, bikeStationMarkerLayerGroups;
let mapboxTilesLayer;
let currentYear;

const INITIAL_ZOOM_LEVEL = 12;
const MAX_ZOOM_LEVEL = 18;

const MAP_START_VIEW_CENTER_NYC = [40.691425, -73.987242]; // Location: The Recurse Center
const MAP_START_VIEW_CENTER_BOSTON = [42.3607572, -71.0993565]; // Location: MIT
const MAP_START_VIEW_CENTER_PHILLY = [39.952876, -75.164035];
const MAP_START_VIEW_CENTER_HOU = [29.7602, -95.3694];
const MAP_START_VIEW_CENTER_DC = [38.9072, -77.0369];
const MAP_START_VIEW_CENTER_CHICAGO = [41.8781, -87.6298];
const MAP_START_VIEW_CENTER_LA = [34.0522, -118.2437];

const setupMap = (city, year) => {
  // Order of things:
  // (loading screen is being shown)
  // position map
  // load bikes json data & do setup from bikes data (years, stationsMap)
  // load census data
  // draw layers
  // hide loading screen

  let mapStartViewCenter, bikeDataURL, censusDataURL, borderURL;

  if (city === "boston") {
    mapStartViewCenter = MAP_START_VIEW_CENTER_BOSTON;
    bikeDataURL = BOSTON_BIKE_DATA_URL;
    censusDataURL = BOSTON_CENSUS_DATA_URL;
    borderURL = BOSTON_BORDER_URL;
  } else if (city === "philly") {
    mapStartViewCenter = MAP_START_VIEW_CENTER_PHILLY;
    bikeDataURL = PHILLY_BIKE_DATA_URL;
    censusDataURL = PHILLY_CENSUS_DATA_URL;
    borderURL = PHILLY_BORDER_URL;
  } else if (city == "dc") {
    mapStartViewCenter = MAP_START_VIEW_CENTER_DC;
    bikeDataURL = DC_BIKE_DATA_URL;
    censusDataURL = DC_CENSUS_DATA_URL;
    borderURL = DC_BORDER_URL;
  } else if (city == "chicago") {
    mapStartViewCenter = MAP_START_VIEW_CENTER_CHICAGO;
    bikeDataURL = CHICAGO_BIKE_DATA_URL;
    censusDataURL = CHICAGO_CENSUS_DATA_URL;
    borderURL = CHICAGO_BORDER_URL;
  } else if (city == "la") {
    mapStartViewCenter = MAP_START_VIEW_CENTER_LA;
    bikeDataURL = LA_BIKE_DATA_URL;
    censusDataURL = LA_CENSUS_DATA_URL;
  } else {
    mapStartViewCenter = MAP_START_VIEW_CENTER_NYC;
    bikeDataURL = NYC_BIKE_DATA_URL;
    censusDataURL = NYC_CENSUS_DATA_URL;
    borderURL = NYC_BORDER_URL;
  }
  // set these to null again in the case this is a redraw
  borderLayer = null;
  censusTractInfoLayerGroup = null;
  raceLayerGroups = {};
  incomeLayerGroups = {};
  bikeStationMarkerLayerGroups = {};

  if (!map) {
    map = L.map("map", {
      preferCanvas: true,
      zoomControl: false,
    });
    mapboxTilesLayer = L.tileLayer(MAPBOX_URL, {
      maxZoom: MAX_ZOOM_LEVEL,
      id: "mapbox.streets",
      accessToken:
        "pk.eyJ1Ijoic3RlaWZpbmVvIiwiYSI6ImNqdnlhY2I1NjBkcmQ0OHMydjYwd2ltMzgifQ.ImDnbNXB_59ei8IVXCN_4g",
    });
    // set up listeners
    map.on("zoomend", () => {
      const currentZoom = map.getZoom();
      // adjust the bike markers
      let currentBikeStationMarkerLayerGroup =
        bikeStationMarkerLayerGroups[currentYear];
      if (
        !!currentBikeStationMarkerLayerGroup &&
        map.hasLayer(currentBikeStationMarkerLayerGroup)
      ) {
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
  }
  // in case of reset of map, remove previous layers
  map.eachLayer(function (layer) {
    map.removeLayer(layer);
  });
  map.addLayer(mapboxTilesLayer);
  map.setView(mapStartViewCenter, INITIAL_ZOOM_LEVEL);
  // load bike station data
  loadJsonData(bikeDataURL, function (bikeData) {
    stationYears = stationsByYearsMap(bikeData);
    // construct the list of years.  It is not necessarily the same as they keys of the stationYears object.
    let yearKeys = Object.keys(stationYears);
    let firstYear = parseInt(yearKeys[0]);
    let lastYear = parseInt(yearKeys[yearKeys.length - 1]);
    let years = [];
    let year = firstYear;
    while (year <= lastYear) {
      years.push(year);
      year += 1;
    }
    setupYearButtons(years);
    // load census data
    loadJsonData(censusDataURL, function (censusData) {
      censusTractDataGeojson = censusData;
      addCensusTractInfoLayer();
      // set up data viz - with okay year
      if (!year || years.indexOf(year) < 0) year = years[0];
      hideLoadingScreen();
      // called again here as a hack: otherwise on resetups of map, the layers
      // were not immediately redrawn

      loadJsonData(borderURL, function (borderData) {
        borderGeojson = borderData;
        if (borderCheck) addBorderLayer();
      });
      selectYear(year);
      map.setView(mapStartViewCenter, INITIAL_ZOOM_LEVEL);
    });
  });
};

/* Map Layers */

// TODO: maybe use options instead of checks
const redrawMapLayers = (
  previousYear = currentYear,
  year = currentYear,
  options
) => {
  // The ordering of the map layers matters for both
  // aesthetics and clickability
  // Map layer order:
  // race, income, info, bikes
  removeRaceLayer(previousYear);
  if (raceCheck.checked) addRaceLayer(year);

  removeIncomeLayer(previousYear);
  if (incomeCheck.checked) addIncomeLayer(year);

  // Make the census tract info layer once (in setup)
  // then make sure it is always on top (but below bikes)
  redrawCensusTractInfoLayer();
  removeBikeStationLayer(previousYear);
  if (bikeCheck.checked) addBikeStationLayer(year);
};

const censusTractFeatureStyleHighlight = {
  stroke: true,
  color: "gray", // '#F5F5F5',

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
  (function (layer, properties) {
    layer.on("mouseover", function (e) {
      // Change the style to the highlighted version
      layer.setStyle(censusTractFeatureStyleHighlight);
      fillTractInfoBox(properties);
    });
    layer.on("mouseout", function (e) {
      emptyTractInfoBox();
      layer.setStyle(censusTractFeatureStyleDefault);
    });
    // Close the "anonymous" wrapper function, and call it while passing
    // in the variables necessary to make the events work the way we want.
  })(layer, feature.properties);
};

const makeCensusTractInfoLayer = () => {
  censusTractInfoLayerGroup = L.geoJson(censusTractDataGeojson, {
    onEachFeature: handleCensusTractInfoLayerFeature,
    style: censusTractFeatureStyleDefault,
  });
};

const redrawCensusTractInfoLayer = () => {
  map.removeLayer(censusTractInfoLayerGroup);
  addCensusTractInfoLayer();
};

const addCensusTractInfoLayer = () => {
  if (!censusTractInfoLayerGroup) makeCensusTractInfoLayer();
  map.addLayer(censusTractInfoLayerGroup);
};

const removeRaceLayer = (year = currentYear) => {
  year = year > 2019 ? 2019 : year;
  if (!!raceLayerGroups[year] && map.hasLayer(raceLayerGroups[year]))
    map.removeLayer(raceLayerGroups[year]);
};

const addRaceLayer = (year = currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = year > 2019 ? 2019 : year;
  if (!raceLayerGroups[year])
    raceLayerGroups[year] = L.geoJson(censusTractDataGeojson, {
      style: raceStyle(year),
    });
  // raceLayerGroups[year].addTo(map);
  map.addLayer(raceLayerGroups[year]);
};

const removeIncomeLayer = (year = currentYear) => {
  year = year > 2019 ? 2019 : year;
  if (!!incomeLayerGroups[year] && map.hasLayer(incomeLayerGroups[year]))
    map.removeLayer(incomeLayerGroups[year]);
};

const addIncomeLayer = (year = currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = year > 2019 ? 2019 : year;
  if (!incomeLayerGroups[year])
    incomeLayerGroups[year] = L.geoJson(censusTractDataGeojson, {
      style: incomeStyle(year),
    });
  map.addLayer(incomeLayerGroups[year]);
};

const addBorderLayer = () => {
  if (!borderLayer) makeBorderLayer();
  map.addLayer(borderLayer);
};

const removeBorderLayer = () => {
  if (borderLayer && map.hasLayer(borderLayer)) {
    map.removeLayer(borderLayer);
  }
};

const makeBorderLayer = () => {
  borderLayer = L.geoJson(borderGeojson, {
    style: {
      stroke: true,
      // '#F5F5F5',
      color: "black",
      strokewidth: 6,
      fill: true,
      fillColor: "rgb(135, 233, 255)",
    },
  });
};

const removeBikeStationLayer = (year = currentYear) => {
  if (
    !!bikeStationMarkerLayerGroups[year] &&
    map.hasLayer(bikeStationMarkerLayerGroups[year])
  ) {
    map.removeLayer(bikeStationMarkerLayerGroups[year]);
  }
};

const addBikeStationLayer = (year = currentYear) => {
  if (!bikeStationMarkerLayerGroups[year])
    bikeStationMarkerLayerGroups[year] = createBikeStationLayerGroup(year);
  map.addLayer(bikeStationMarkerLayerGroups[year]);
};

const createBikeStationLayerGroup = (year) => {
  let bikeStationMarkerLayerGroup = L.layerGroup();
  let firstYear = Object.keys(stationYears)[0];
  for (let i = firstYear; i < currentYear + 1; i++) {
    const stations = stationYears[i] || [];
    stations.forEach((station) => {
      if (parseInt(station.last) < year) {
        console.log("found a disappearing station!", station);
        return;
      }
      const marker = L.circleMarker(
        [station.lat, station.lon],
        bikeMarkerStyle(station)
      ).bindPopup(getBikeStationInfoPopup(station));

      bikeStationMarkerLayerGroup.addLayer(marker);
    });
  }
  return bikeStationMarkerLayerGroup;
};

/* Map Layers Styling */
const bikeMarkerStyle = (station) => {
  return {
    radius: 1.5,
    title: station.name,
    stroke: true,
    color: "rgba(0, 0, 255, 1)",
    fillOpacity: 0.8,
    fillColor: "rgb(81, 152, 214)",
  };
};

// Used for NaN values, etc
const COLOR_GRADIENT_DEFAULT = "rgba(0, 0, 0, 0)";
// This color gradient is implemented as a piecewise function
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_START = "rgba(255, 245, 64, .2)";
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID = "rgba(73, 143, 54, .7)";
const PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_END = "rgba(73, 143, 54, .9)";
const PIECEWISE_INCOME_GRADIENT_SCALE_MID = 140000;
const lowIncomeColorRange = d3
  .scaleLinear()
  .domain([20000, PIECEWISE_INCOME_GRADIENT_SCALE_MID])
  .range([
    PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_START,
    PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID,
  ]);

const highIncomeColorRange = d3
  .scaleLinear()
  .domain([PIECEWISE_INCOME_GRADIENT_SCALE_MID, 300000])
  .range([
    PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_MID,
    PIECEWISE_INCOME_COLOR_GRADIENT_SCALE_END,
  ]);

const incomeStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  let income = getTractData(feature.properties, TRACT_MEDIAN_INCOME_KEY, year);
  if (income === "250,000+") {
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

const RACE_COLOR_GRADIENT_START = "rgba(171, 151, 219, 0.5)";
const RACE_COLOR_GRADIENT_END = "rgba(22, 133, 199, 0.7)";
const raceColorRange = d3
  .scaleLinear()
  .domain([0, 100])
  .range([RACE_COLOR_GRADIENT_START, RACE_COLOR_GRADIENT_END]);

const raceStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  let percentWhite = getTractPercentWhite(feature.properties, year);
  let fillColor = COLOR_GRADIENT_DEFAULT;
  if (!!percentWhite) fillColor = raceColorRange(percentWhite);
  return {
    fillColor: fillColor,
    fillOpacity: 1,
    stroke: false,
  };
};
