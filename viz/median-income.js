const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';

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


const setup = function() {
  // set up the map
  map = L
    .map('map', {
      preferCanvas: true,
      zoomControl:false,
    })
    .setView([40.691425, -73.987242], INITIAL_ZOOM_LEVEL);

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
  selectYear(2013);
}

// Set up station years as an object mapping 
// {(int)first year for station: [list of station ids]}
const stationYears = stationsJson.reduce((obj, station) => {
  const beginYear = parseInt(station.first.split('-')[0]);
  return {
    ...obj,
    [beginYear]: [...(obj[beginYear] || []), station],
  };
}, {});




const raceStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  let percentWhite = getTractPercentWhite(feature.properties, year);
  let fillColor = 'rgba(0, 0, 0, 0)';
  if (!!percentWhite)
    fillColor = raceColorRange(percentWhite);

  return {
    fillColor: fillColor,
    fillOpacity: 1,
    stroke: false,
  };
};

const RACE_GRADIENT_START = 'rgba(171, 151, 219, 0.5)';
const RACE_GRADIENT_END = 'rgba(22, 133, 199, 0.7)';
const raceColorRange = d3
  .scaleLinear()
  .domain([0, 100])
  .range([RACE_GRADIENT_START, RACE_GRADIENT_END]);


const PIECEWISE_INCOME_GRADIENT_SCALE_MID_COLOR = 'rgba(73, 143, 54, .7)';
const PIECEWISE_INCOME_GRADIENT_SCALE_MID = 140000;
const lowIncomeColorRange = d3
  .scaleLinear()
  .domain([20000, PIECEWISE_INCOME_GRADIENT_SCALE_MID])
  .range(['rgba(255, 245, 64, .2)', PIECEWISE_INCOME_GRADIENT_SCALE_MID_COLOR]);

const highIncomeColorRange = d3
  .scaleLinear()
  .domain([PIECEWISE_INCOME_GRADIENT_SCALE_MID, 300000])
  .range([PIECEWISE_INCOME_GRADIENT_SCALE_MID_COLOR, 'rgba(73, 143, 54, .9)']);


const incomeStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.

  let income = getTractData(feature.properties, TRACT_MEDIAN_INCOME_KEY);
  if (income === '250,000+') {
    income = 300000;
  }

  let fillColor;
  if (isNaN(parseInt(income))) {
    fillColor = 'rgba(0, 0, 0, 0)';
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

// Using constants for property keys from the geojson to allow compression (TODO)
NYC_TRACT_NAME_KEY = 'Neighborhood';


TRACT_MEDIAN_INCOME_KEY = 'median income';
TRACT_MEDIAN_INCOME_MARGIN_OF_ERROR_KEY = 'median income margin of error';
TRACT_TOTAL_HOUSEHOLDS_KEY = 'race: total households';
TRACT_TOTAL_HOUSEHOLDS_MARGIN_OF_ERROR_KEY = 'race: total households margin of error';
TRACT_WHITE_HOUSEHOLDS_KEY = 'race: White';
TRACT_BLACK_HOUSEHOLDS_KEY = 'race: Black';
TRACT_ASIAN_HOUSEHOLDS_KEY = 'race: Asian';
TRACT_2_OR_MORE_RACES_HOUSEHOLDS_KEY = 'race: 2 or more races';
TRACT_OTHER_HOUSEHOLDS_KEY = 'race: Other';

const cityElt = document.getElementById('city');
const yearElt = document.getElementById('year');
const tractNameElt = document.getElementById('tract-name');
const tractMedianIncomeElt = document.getElementById('tract-median-income');
const tractPercentWhiteElt = document.getElementById('tract-percent-white');
const tractWhiteHouseholdsElt = document.getElementById('tract-white-households');
const tractBlackHouseholdsElt = document.getElementById('tract-black-households');
const tractAsianHouseholdsElt = document.getElementById('tract-asian-households');
const tractOtherHouseholdsElt = document.getElementById('tract-other-households');
const tractTwoOrMoreRacesHouseholdsElt = document.getElementById('tract-two-or-more-races-households');
const tractTotalHouseholdsElt = document.getElementById('tract-total-households');
const tractTotalHouseholdsMarginOfErrorElt = document.getElementById('tract-total-households-margin-of-error');

// TODO: move this to a utility specific file
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
const getTractData = (properties, key, year=currentYear) => {
  // The data should be a number
  return properties[year + ' ' + key];
}
const getFormattedTractData = (properties, key, year=currentYear) => {
  // The data should be a number
  let value = getTractData(properties, key, year);
  value = parseInt(value);
  if (isNaN(value))
    return 'insufficient data';
  return numberWithCommas(value);
}

const getMarginOfError = (properties, year=currentYear) => {
  let value = parseInt(getTractData(properties, TRACT_TOTAL_HOUSEHOLDS_MARGIN_OF_ERROR_KEY, year))
  let medIncome = parseInt(getTractData(properties, TRACT_MEDIAN_INCOME_KEY, year));
  let totalHouseholds = parseInt(getTractData(properties, TRACT_TOTAL_HOUSEHOLDS_KEY, year));
  if (isNaN(value) || isNaN(totalHouseholds) || totalHouseholds < 1)
    return 'n/a';
  return numberWithCommas(value);
}

const getFormattedMedianIncome = (properties, year=currentYear) => {
  let value = parseInt(getTractData(properties, TRACT_MEDIAN_INCOME_KEY, year));
  if (isNaN(value) || value < 1)
    return 'insufficient data';
  return '$' + numberWithCommas(value);
}

const getTractPercentWhite = (properties, year=currentYear) => {
  let whiteCount = parseInt(properties[year + ' ' + TRACT_WHITE_HOUSEHOLDS_KEY]);
  let totalCount = parseInt(properties[year + ' ' + TRACT_TOTAL_HOUSEHOLDS_KEY]);
  if (isNaN(whiteCount) || whiteCount < 1 || isNaN(totalCount) || totalCount < 1)
    return;
  return ((whiteCount/totalCount)*100).toFixed();
}

const getFormattedPercentWhite = (properties, year=currentYear) => {
  let value = getTractPercentWhite(properties, year);
  return (!!value) ? (value.toString() + '%') : 'n/a';
}

const fillTractInfoBox = (properties) => {
  tractNameElt.innerHTML = properties[NYC_TRACT_NAME_KEY];
  tractMedianIncomeElt.innerHTML = 'Median income: ' + getFormattedMedianIncome(properties, currentYear);
  tractPercentWhiteElt.innerHTML = 'Percent of households that are white: ' + getFormattedPercentWhite(properties, currentYear);
  tractWhiteHouseholdsElt.innerHTML = 'White households: ' + getFormattedTractData(properties, TRACT_WHITE_HOUSEHOLDS_KEY);
  tractBlackHouseholdsElt.innerHTML = 'Black households: ' + getFormattedTractData(properties, TRACT_BLACK_HOUSEHOLDS_KEY);
  tractAsianHouseholdsElt.innerHTML = 'Asian households: ' + getFormattedTractData(properties, TRACT_ASIAN_HOUSEHOLDS_KEY);
  tractOtherHouseholdsElt.innerHTML = 'Other households: ' + getFormattedTractData(properties, TRACT_OTHER_HOUSEHOLDS_KEY);
  tractTwoOrMoreRacesHouseholdsElt.innerHTML = 'Households w/ multiple races: ' + getFormattedTractData(properties, TRACT_2_OR_MORE_RACES_HOUSEHOLDS_KEY);
  tractTotalHouseholdsElt.innerHTML = 'Total households: ' + getFormattedTractData(properties, TRACT_TOTAL_HOUSEHOLDS_KEY);
  tractTotalHouseholdsMarginOfErrorElt.innerHTML = 'margin of error: ' + getMarginOfError(properties, currentYear);
}

const emptyTractInfoBox = () => {
  tractNameElt.innerHTML = '';
  tractMedianIncomeElt.innerHTML = '';
  tractPercentWhiteElt.innerHTML = '';
  tractWhiteHouseholdsElt.innerHTML = '';
  tractBlackHouseholdsElt.innerHTML = '';
  tractAsianHouseholdsElt.innerHTML = '';
  tractOtherHouseholdsElt.innerHTML = '';
  tractTwoOrMoreRacesHouseholdsElt.innerHTML = '';
  tractTotalHouseholdsElt.innerHTML = '';
  tractTotalHouseholdsMarginOfErrorElt.innerHTML = '';
}

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
  if (!!raceLayerGroups[year] && map.hasLayer(raceLayerGroups[year]))
    map.removeLayer(raceLayerGroups[year]);
}

const addRaceLayer = (year=currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = (year > 2017) ? 2017 : year;
  if (!raceLayerGroups[year])
    raceLayerGroups[year] = L.geoJson(censusTractDataGeojson, {style: raceStyle(year)});
  raceLayerGroups[year].addTo(map);
}


const removeIncomeLayer = (year=currentYear) => {
  if (!!incomeLayerGroups[year] && map.hasLayer(incomeLayerGroups[year]))
    map.removeLayer(incomeLayerGroups[year]);
}

const addIncomeLayer = (year=currentYear) => {
  // Census data only goes up to 2017, so 2017 data used for years onward
  year = (year > 2017) ? 2017 : year;
  if (!incomeLayerGroups[year])
    incomeLayerGroups[year] = L.geoJson(censusTractDataGeojson, {style: incomeStyle(year)});
  incomeLayerGroups[year].addTo(map);
}

const removeBikeStationLayer = (year=currentYear) => {
  if (!!bikeStationMarkerLayerGroups[year] && map.hasLayer(bikeStationMarkerLayerGroups[year]))
    map.removeLayer(bikeStationMarkerLayerGroups[year]);
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
        .circleMarker([station.lat, station.lon], {
          radius: 2,
          title: station.name,
          stroke: true,
          color: 'rgba(0, 0, 255, 1)',
          fillOpacity: .8,
          fillColor: 'rgb(81, 152, 214)',
        })
        .bindPopup(getBikeStationInfoPopup(station));

      bikeStationMarkerLayerGroup.addLayer(marker);
    });
  }
  return bikeStationMarkerLayerGroup;
}

const getBikeStationInfoPopup = (station) => {
  let dateString = new Date(station.first).toDateString();
  return `<div class='bike-station-info-popup'>
            <p class='bike-station-name'>${station.name}</p>
            <p>First ride: ${dateString}</p>
          </div>`;
}

const selectYear = (year) => {
  year = parseInt(year);
  if (year == currentYear) {
    return;
  }
  let previousYear = currentYear;
  currentYear = year;

  redrawMapLayers(previousYear, currentYear);

  document.querySelectorAll('button').forEach((btn) => {
    btn.className = '';
    if (btn.id === 'b-' + year.toString()) {
      btn.className = 'active';
    }
  });
  yearElt.innerHTML = year.toString();
};



const toggleBikeStationLayer = () => {
  redrawMapLayers(currentYear, currentYear);
}
const toggleRaceLayer = () => {
  redrawMapLayers(currentYear, currentYear);
}
const toggleIncomeLayer = () => {
  redrawMapLayers(currentYear, currentYear);
}


const bikeCheck = document.getElementById('b-bikes');
const incomeCheck = document.getElementById('b-income');
const raceCheck = document.getElementById('b-race');
bikeCheck.addEventListener('click', toggleBikeStationLayer);
incomeCheck.addEventListener('click', toggleIncomeLayer);
raceCheck.addEventListener('click', toggleRaceLayer);


// load the data
let xhr = new XMLHttpRequest();
xhr.open('GET', './viz/nyc-census-tracts-data.geojson');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.responseType = 'json';
xhr.onload = function() {
  if (xhr.status !== 200) {
    console.error('loading geojson returned status code', xhr.status);
    return;
  }
  censusTractDataGeojson = xhr.response;
  setup();
};
xhr.send();

