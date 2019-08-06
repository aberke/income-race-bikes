const MAPBOX_URL = 'https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}';

const map = L
  .map('map', {preferCanvas: true})
  .setView([40.691425, -73.987242], 12);

L.tileLayer(MAPBOX_URL, {
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic3RlaWZpbmVvIiwiYSI6ImNqdnlhY2I1NjBkcmQ0OHMydjYwd2ltMzgifQ.ImDnbNXB_59ei8IVXCN_4g'
  })
  .addTo(map);

const colorRange = d3
  .scaleLinear()
  .domain([10000, 120000])
  .range(['rgba(0, 255, 0, 0)', 'rgba(0, 255, 0, 1)']);

let i = 0;
const style = (feature) => {
  const income = feature.properties['2017 median income']

  return {
    fillColor: colorRange(income),
    stroke: false,
  };
};

L
  .geoJson(nycJson, {style})
  .addTo(map);
