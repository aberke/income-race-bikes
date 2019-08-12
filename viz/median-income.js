const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';

let map;
let incomeLayerGroup;
let bikeStationMarkerLayerGroup;
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
    if (currentZoom >= 14) {
      bikeStationMarkerLayerGroup.eachLayer((marker) => {
        marker.setRadius(5);
      });
    } else {
      bikeStationMarkerLayerGroup.eachLayer((marker) => {
        marker.setRadius(2);
      });
    }
  });


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


const incomeStyle = (year) => (feature) => {
  // Each feature is a geoJSON object with information for each year.
  // Returns style based on year of interest.
  // Income data goes up to this year, so use that max year's data for years beyond
  if (year > 2017) {
    year = 2017;
  }

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

const redrawIncomeLayer = () => {
  removeIncomeLayer();
  addIncomeLayer();
}

const redrawBikeStationLayer = () => {
  removeBikeStationLayer();
  addBikeStationLayer();
}


const removeIncomeLayer = () => {
  if (incomeLayerGroup)
    incomeLayerGroup.remove();
}

const addIncomeLayer = () => {
  incomeLayerGroup = L
    .geoJson(nycJson, {style: incomeStyle(currentYear)})
    .addTo(map);
}

const removeBikeStationLayer = () => {
  if (bikeStationMarkerLayerGroup) {
    bikeStationMarkerLayerGroup.remove();
  }
}

const getBikeStationInfoPopup = (station) => {
  let dateString = new Date(station.first).toDateString();
  return `<div class='bike-station-info-popup'>
            <p class='bike-station-name'>${station.name}</p>
            <p>First ride: ${dateString}</p>
          </div>`;

}

const addBikeStationLayer = () => {
  bikeStationMarkerLayerGroup = L.layerGroup();
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

  bikeStationMarkerLayerGroup.addTo(map);
}



const selectYear = (year) => {
  year = parseInt(year);
  if (year == currentYear) {
    return;
  }
  currentYear = year;

  if (incomeCheck.checked)
    redrawIncomeLayer();

  if (bikeCheck.checked)
    redrawBikeStationLayer();


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
    redrawBikeStationLayer();
  else
    removeBikeStationLayer();
}


const toggleIncomeLayer = () => {
  if (incomeCheck.checked) {
    redrawIncomeLayer();
    // markers layer should be above income layer coloring -- so maybe show it
    redrawBikeStationLayer();
  }
  else {
    removeIncomeLayer();
  }
}

bikeCheck.addEventListener('click', toggleBikeStationLayer);
incomeCheck.addEventListener('click', toggleIncomeLayer);


setup();
