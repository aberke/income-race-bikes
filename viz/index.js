/* DOM and things */


const setup = function() {
  setupMap();
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

