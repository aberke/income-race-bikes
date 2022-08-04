/* DOM and things */

// Using constants for property keys from the geojson to allow compression (TODO)
NYC_TRACT_NAME_KEY = "Neighborhood";
TRACT_NAME_KEY = "Name";

TRACT_MEDIAN_INCOME_KEY = "median income";
TRACT_MEDIAN_INCOME_MARGIN_OF_ERROR_KEY = "median income margin of error";
TRACT_TOTAL_HOUSEHOLDS_KEY = "race: total households";
TRACT_TOTAL_HOUSEHOLDS_MARGIN_OF_ERROR_KEY =
  "race: total households margin of error";
TRACT_WHITE_HOUSEHOLDS_KEY = "race: White";
TRACT_BLACK_HOUSEHOLDS_KEY = "race: Black";
TRACT_ASIAN_HOUSEHOLDS_KEY = "race: Asian";
TRACT_2_OR_MORE_RACES_HOUSEHOLDS_KEY = "race: 2 or more races";
TRACT_OTHER_HOUSEHOLDS_KEY = "race: Other";

const cityElt = document.getElementById("city");
const yearElt = document.getElementById("year");
const tractNameElt = document.getElementById("tract-name");
const tractMedianIncomeElt = document.getElementById("tract-median-income");
const tractPercentWhiteElt = document.getElementById("tract-percent-white");
const tractWhiteHouseholdsElt = document.getElementById(
  "tract-white-households"
);
const tractBlackHouseholdsElt = document.getElementById(
  "tract-black-households"
);
const tractAsianHouseholdsElt = document.getElementById(
  "tract-asian-households"
);
const tractOtherHouseholdsElt = document.getElementById(
  "tract-other-households"
);
const tractTwoOrMoreRacesHouseholdsElt = document.getElementById(
  "tract-two-or-more-races-households"
);
const tractTotalHouseholdsElt = document.getElementById(
  "tract-total-households"
);
const tractTotalHouseholdsMarginOfErrorElt = document.getElementById(
  "tract-total-households-margin-of-error"
);
const hoverForInfoElt = document.getElementById("hover-over-the-map");

const fillTractInfoBox = (properties) => {
  hoverForInfoElt.style.display = "none";
  tractNameElt.innerHTML =
    properties[TRACT_NAME_KEY] || properties[NYC_TRACT_NAME_KEY];
  tractMedianIncomeElt.innerHTML =
    "Median income: " + getFormattedMedianIncome(properties, currentYear);
  tractTotalHouseholdsElt.innerHTML =
    "Total households: " +
    getFormattedTractData(properties, TRACT_TOTAL_HOUSEHOLDS_KEY);
  tractPercentWhiteElt.innerHTML =
    "Percent of households that are white: " +
    getFormattedPercentWhite(properties, currentYear);
  tractWhiteHouseholdsElt.innerHTML =
    "White: " + getFormattedTractData(properties, TRACT_WHITE_HOUSEHOLDS_KEY);
  tractBlackHouseholdsElt.innerHTML =
    "Black: " + getFormattedTractData(properties, TRACT_BLACK_HOUSEHOLDS_KEY);
  tractAsianHouseholdsElt.innerHTML =
    "Asian: " + getFormattedTractData(properties, TRACT_ASIAN_HOUSEHOLDS_KEY);
  tractOtherHouseholdsElt.innerHTML =
    "Other: " + getFormattedTractData(properties, TRACT_OTHER_HOUSEHOLDS_KEY);
  tractTwoOrMoreRacesHouseholdsElt.innerHTML =
    "Multiple races: " +
    getFormattedTractData(properties, TRACT_2_OR_MORE_RACES_HOUSEHOLDS_KEY);
  tractTotalHouseholdsMarginOfErrorElt.innerHTML =
    "margin of error: " + getMarginOfError(properties, currentYear);
};

const emptyTractInfoBox = () => {
  tractNameElt.innerHTML = "";
  tractMedianIncomeElt.innerHTML = "";
  tractPercentWhiteElt.innerHTML = "";
  tractWhiteHouseholdsElt.innerHTML = "";
  tractBlackHouseholdsElt.innerHTML = "";
  tractAsianHouseholdsElt.innerHTML = "";
  tractOtherHouseholdsElt.innerHTML = "";
  tractTwoOrMoreRacesHouseholdsElt.innerHTML = "";
  tractTotalHouseholdsElt.innerHTML = "";
  tractTotalHouseholdsMarginOfErrorElt.innerHTML = "";
  hoverForInfoElt.style.display = "block";
};

const getBikeStationInfoPopup = (station) => {
  let dateString = new Date(station.first).toDateString();
  return `<div class='bike-station-info-popup'>
            <p class='bike-station-name'>${station.name}</p>
            <p>First ride: ${dateString}</p>
          </div>`;
};

const setupCityHTML = (city) => {
  let cityName = "";
  if (city === "boston") cityName = "Boston Area";
  else if (city === "philly") cityName = "Philadelphia";
  else if (city == "dc") cityName = "Washington DC";
  else if (city == "chicago") cityName = "Chicago";
  else if (city == "nyc") cityName = "New York City";
  document.getElementById("city").innerHTML = cityName;
};

const setupYearButtons = (yearsList) => {
  let yearSelector = document.getElementById("year-buttons-container");
  // clear out old buttons
  yearSelector.innerHTML = null;
  yearsList.forEach((year) => {
    let button = document.createElement("button");
    button.setAttribute("id", "year-button-" + year.toString());
    button.innerHTML = year.toString();
    button.addEventListener("click", () => selectYear(year));
    yearSelector.appendChild(button);
  });
};

const selectYear = (year) => {
  year = parseInt(year);
  if (year == currentYear && incomeLayerGroups.length) return;
  let previousYear = currentYear;
  currentYear = year;
  console.log(year);
  redrawMapLayers(previousYear, currentYear);
  updateYearHTML(year);
  updateURLParams();
};

const updateYearHTML = (year) => {
  document.querySelectorAll("button").forEach((btn) => {
    btn.className = "";
    if (btn.id === "year-button-" + year.toString()) {
      btn.className = "active";
    }
  });
  yearElt.innerHTML = year.toString();
};

const toggleBikeStationLayer = () => {
  updateURLParams();
  redrawMapLayers(currentYear, currentYear);
};
const toggleRaceLayer = () => {
  updateURLParams();
  redrawMapLayers(currentYear, currentYear);
};
const toggleIncomeLayer = () => {
  updateURLParams();
  redrawMapLayers(currentYear, currentYear);
};

const toggleBorderLayer = () => {
  updateURLParams();
  redrawMapLayers(currentYear, currentYear);
};

const bikeCheck = document.getElementById("b-bikes");
const incomeCheck = document.getElementById("b-income");
const raceCheck = document.getElementById("b-race");
let borderCheck = false;
bikeCheck.addEventListener("click", toggleBikeStationLayer);
incomeCheck.addEventListener("click", toggleIncomeLayer);
raceCheck.addEventListener("click", toggleRaceLayer);
// borderCheck.addEventListener("click", toggleBorderLayer);

const hideLoadingScreen = () => {
  document.getElementById("loading-container").style.display = "none";
};

// Handle preselection of checks from URL
// Because sticky parameters make for better sharing

// http://URL/this-map-i-spent-too-much-time-on?c=city&y=year&r&i&b
// where presence of r in dicates showRace is UNchecked
// where presence of i in dicates showIncome is UNchecked

const URL_PARAM_CITY = "city";
const URL_PARAM_YEAR = "year";
const URL_PARAM_INCOME = "i";
const URL_PARAM_RACE = "r";
const URL_PARAM_BIKES = "b";
const UR_PARAM_STUDY_BOUNDARY = "study-boundary";

const URL_PARAM_HIDE_ABOUT = "ha";

const setupFromURLParams = () => {
  const urlString = window.location.href;
  let url = new URL(urlString);
  // set up map info
  let city = url.searchParams.get(URL_PARAM_CITY) || "nyc"; // default: NYC
  let year = url.searchParams.get(URL_PARAM_YEAR);
  let i = url.searchParams.get(URL_PARAM_INCOME);
  let r = url.searchParams.get(URL_PARAM_RACE);
  let b = url.searchParams.get(URL_PARAM_BIKES);
  if (i == null) incomeCheck.checked = true;
  if (r == null) raceCheck.checked = true;
  if (b == null) bikeCheck.checked = true;

  updateYearHTML(year || "");
  setupCityHTML(city);
  setupMap(city, year);

  // set up map styling
  let hideAbout = url.searchParams.get(URL_PARAM_HIDE_ABOUT);
  let limitLayer = url.searchParams.get(URL_PARAM_STUDY_BOUNDARY);
  if (hideAbout != null) document.body.classList.add("hide-about");

  if (limitLayer != null) {
    borderCheck = true;
  } else {
    borderCheck = false;
  }
};

const updateCityURLParam = (city) => {
  let urlString = window.location.href;
  let url = new URL(urlString);
  url.searchParams.set(URL_PARAM_CITY, city);
  url.searchParams.delete(URL_PARAM_YEAR);
  window.history.pushState("", "", url.toString());
  setupCityHTML(city);
  setupMap(city);
};

const updateURLParams = () => {
  let urlString = window.location.href;
  let url = new URL(urlString);
  // if (borderCheck.checked) url.searchParams.delete(URL_PARAM_BORDER);
  // else url.searchParams.set(URL_PARAM_BORDER, "");

  if (incomeCheck.checked) url.searchParams.delete(URL_PARAM_INCOME);
  else url.searchParams.set(URL_PARAM_INCOME, "");

  if (raceCheck.checked) url.searchParams.delete(URL_PARAM_RACE);
  else url.searchParams.set(URL_PARAM_RACE, "");

  if (bikeCheck.checked) url.searchParams.delete(URL_PARAM_BIKES);
  else url.searchParams.set(URL_PARAM_BIKES, "");

  url.searchParams.set(URL_PARAM_YEAR, currentYear);

  window.history.pushState("", "", url.toString());
};

setupFromURLParams();
