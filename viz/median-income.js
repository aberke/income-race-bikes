console.log('hello world');
const map = L
  .map('map')
  .setView([40.691425, -73.987242], 12);

L.tileLayer('https://api.mapbox.com/styles/v1/steifineo/cjyuf2hgv01so1cpe8u9yjw32/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
  maxZoom: 18,
  id: 'mapbox.streets',
  accessToken: 'pk.eyJ1Ijoic3RlaWZpbmVvIiwiYSI6ImNqdnlhY2I1NjBkcmQ0OHMydjYwd2ltMzgifQ.ImDnbNXB_59ei8IVXCN_4g'
  })
  .addTo(map);

let i = 0;
const style = (feature) => {
  // NOTE: Would be great to pre-process the money field so we don't have to do
  // it here
  const income = parseInt(feature.properties['ACS_17_5_1'].replace('$', '').replace(',', '').replace('.', ''));

  let fillColor = 'red';
  if (income > 5000000) {
    fillColor = 'blue';
  }

  return {
    fillColor,
  };
};

L
  .geoJson(nycJson, {style})
  .addTo(map);
