/* Utility and data things

*/
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


// Generic utilities
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
