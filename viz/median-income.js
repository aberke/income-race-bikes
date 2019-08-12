const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';

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
    .map('map', {preferCanvas: true})
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




const PIECEWISE_GRADIENT_SCALE_MID_COLOR = 'rgba(73, 143, 54, .7)';
const PIECEWISE_GRADIENT_SCALE_MID_INCOME = 140000;
const lowColorRange = d3
  .scaleLinear()
  .domain([20000, PIECEWISE_GRADIENT_SCALE_MID_INCOME])
  .range(['rgba(255, 245, 64, .2)', PIECEWISE_GRADIENT_SCALE_MID_COLOR]);

const highColorRange = d3
  .scaleLinear()
  .domain([PIECEWISE_GRADIENT_SCALE_MID_INCOME, 300000])
  .range([PIECEWISE_GRADIENT_SCALE_MID_COLOR, 'rgba(73, 143, 54, .9)']);


const incomeStyle = (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  // Income data goes up to this year, so use that max year's data for years beyond
  let year = (currentYear > 2017) ? 2017 : currentYear;

  let income = feature.properties[`${year} median income`];
  if (income === '250,000+') {
    income = 250000;
  }

  let fillColor = lowColorRange(income);
  if (isNaN(parseInt(income))) {
    fillColor = 'rgba(0, 0, 0, 0)';
  } else if (income < PIECEWISE_GRADIENT_SCALE_MID_INCOME) {
    fillColor = lowColorRange(income);
  } else {
    fillColor = highColorRange(income);
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

const handleCensusTractInfoLayerFeature = (feature, layer) => {
    (function(layer, properties) {
      layer.on('mouseover', function (e) {
        console.log('layer mouseover', layer, properties)
        // Change the style to the highlighted version
        layer.setStyle(censusTractFeatureStyleHighlight);
      });
      // Create a mouseout event that undoes the mouseover changes
      layer.on('mouseout', function (e) {
        console.log('mouseout')
        // revert the style back
        layer.setStyle(censusTractFeatureStyleDefault);
      });
      // Close the "anonymous" wrapper function, and call it while passing
      // in the variables necessary to make the events work the way we want.
    })(layer, feature.properties);
}

const redrawIncomeLayer = (previousYear, currentYear) => {
  removeIncomeLayer(previousYear);
  addIncomeLayer(currentYear);
}

const redrawBikeStationLayer = (previousYear, currentYear) => {
  removeBikeStationLayer(previousYear);
  addBikeStationLayer(currentYear);
}

const makeCensusTractInfoLayer = () => {
  censusTractInfoLayerGroup = L
    .geoJson(nycJson, {
      onEachFeature: handleCensusTractInfoLayerFeature,
      style: censusTractFeatureStyleDefault,
    });  
}

const addCensusTractInfoLayer = () => {
  if (!censusTractInfoLayerGroup)
    makeCensusTractInfoLayer();
  map.addLayer(censusTractInfoLayerGroup);
}


const removeIncomeLayer = (year=currentYear) => {
  if (!!incomeLayerGroups[year] && map.hasLayer(incomeLayerGroups[year]))
    map.removeLayer(incomeLayerGroups[year]);
}

const addIncomeLayer = (year=currentYear) => {
  if (!incomeLayerGroups[year])
    incomeLayerGroups[year] = L.geoJson(nycJson, {style: incomeStyle});
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

  if (incomeCheck.checked)
    redrawIncomeLayer(previousYear, currentYear);

  if (bikeCheck.checked)
    redrawBikeStationLayer(previousYear, currentYear);

  // Make the census tract info layer once (in setup)
  // then make sure it is always on top
  map.removeLayer(censusTractInfoLayerGroup);
  addCensusTractInfoLayer();


  document.querySelectorAll('button').forEach((btn) => {
    btn.className = '';
    if (btn.id === 'b-' + currentYear.toString()) {
      btn.className = 'active';
    }
  });
  document.getElementById('year').innerHTML = currentYear.toString();
};


const bikeCheck = document.getElementById('b-bikes');
const incomeCheck = document.getElementById('b-income');



const toggleBikeStationLayer = () => {
  if (bikeCheck.checked)
    redrawBikeStationLayer(currentYear, currentYear);
  else
    removeBikeStationLayer(currentYear);
}


const toggleIncomeLayer = () => {
  if (incomeCheck.checked) {
    redrawIncomeLayer(currentYear, currentYear);
    // markers layer should be above income layer coloring -- so maybe show it
    redrawBikeStationLayer(currentYear, currentYear);
  }
  else {
    removeIncomeLayer(currentYear);
  }
}

bikeCheck.addEventListener('click', toggleBikeStationLayer);
incomeCheck.addEventListener('click', toggleIncomeLayer);


setup();
