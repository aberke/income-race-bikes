const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';


const stationYears = stationsJson.reduce((obj, station) => {
  const beginYear = parseInt(station.first.split('-')[0]);
  return {
    ...obj,
    [beginYear]: [...(obj[beginYear] || []), station],
  };
}, {});


let incomeLayerGroup;
let markerLayerGroup;
let currentYear;
const map = L
  .map('map', {preferCanvas: true})
  .setView([40.691425, -73.987242], 12);

L.tileLayer(MAPBOX_URL, {
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic3RlaWZpbmVvIiwiYSI6ImNqdnlhY2I1NjBkcmQ0OHMydjYwd2ltMzgifQ.ImDnbNXB_59ei8IVXCN_4g'
  })
  .addTo(map);


const MID_COLOR = 'rgba(73, 143, 54, .7)';
const MID_INCOME = 140000;
const lowColorRange = d3
  .scaleLinear()
  .domain([20000, MID_INCOME])
  .range(['rgba(255, 245, 64, .2)', MID_COLOR]);

const highColorRange = d3
  .scaleLinear()
  .domain([MID_INCOME, 300000])
  .range([MID_COLOR, 'rgba(73, 143, 54, .9)']);


const style = (year) => (feature) => {
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
  } else if (income < MID_INCOME) {
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

const bikeCheck = document.getElementById('b-bikes');
const incomeCheck = document.getElementById('b-income');
const selectYear = (year, options) => {
  currentYear = year;
  if (incomeLayerGroup) {
    incomeLayerGroup.remove();
  }
  if (markerLayerGroup) {
    markerLayerGroup.remove();
  }

  markerLayerGroup = L.layerGroup();

  if (incomeCheck.checked) {
    incomeLayerGroup = L
      .geoJson(nycJson, {style: style(year)})
      .addTo(map);
  }

  if (!bikeCheck.checked) {
    return;
  }

  year = parseInt(year);
  for (let i = 2013; i < (year + 1); i++) {
    const stations = stationYears[i] || [];
    stations.forEach((station) => {
      if (station.last < year) {
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
        });

      markerLayerGroup.addLayer(marker);
    });
  }

  markerLayerGroup.addTo(map);

  document.querySelectorAll('button').forEach((btn) => {
    btn.className = '';
    if (btn.id === 'b-' + year) {
      btn.className = 'active';
    }
  });
  document.getElementById('year').innerHTML = year;
};


map.on('zoomend', () => {
  const currentZoom = map.getZoom();
  if (currentZoom >= 14) {
    markerLayerGroup.eachLayer((marker) => {
      marker.setRadius(5);
    });
  } else {
    markerLayerGroup.eachLayer((marker) => {
      marker.setRadius(2);
    });
  }
});

bikeCheck.addEventListener('click', () => selectYear(currentYear));
incomeCheck.addEventListener('click', () => selectYear(currentYear));


selectYear('2013');
