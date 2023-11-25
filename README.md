# Income, Race, Bikes

https://aberke.github.io/income-race-bikes/

<img src="assets/boston-income-race.gif" alt="map preview" width="450"/>

### Is the placement of bikeshare docks equitable?

The map explores this question visually.

It displays the progressive placement of bikeshare docking stations over time, along with the race and median income of residents in the areas they serve.

The map shows the addition of the docks, as well as the changes in income and race throughout the years the bikeshare program has been in service. You can toggle the display to see only income, or race, or bikes data, or any of their combinations.

#### Contributions

Contributions are welcome and encouraged, whether they are for the UI, or city data! If you would like to update city data, or add a city to the map, the process is described below. Submit a pull request or email me if you have questions.

### Running Visualization Locally

- `npm install`
- `npm start`
- Go to your locally running server at http://127.0.0.1:8080

## Data

### Census Data

Income and race data is provided for each year by census tract. It is from the [American Community Survey (5-year)](https://www.census.gov/programs-surveys/acs/guidance/estimates.html), which provides yearly population estimates.

The data used for this map is household median income, and household race.
\*Race is displayed on the map as “Percent White”, which is calculated as the percentage of households that report “white only” in a given census tract.

As of June 2022, this race and income data is [only available up to 2020](https://www.census.gov/programs-surveys/acs/news/data-releases/2018/release.html), so the map shows the same 2020 data for years 2021 and 2022.
Margins of error are not shown on the map, but are available with all of the processed data here.

#### Obtaining and processing the Census Data

The processing is divided into two parts:

1. Processing/Creating a shapefile to visualize the census tracts
2. Obtaining and processing income/race data for each state's census tracts

The shapefile is then joined with the income/race census data.
The 2010 census tracts are used (redrawn every 10 years)

This is done for each area shown on the map.

For shapefile:

- Get shapefile for census tracts
- Possibly prune the shapefile to only include census tracts
- Process the shapefile to have geoids at census tract granularity
- To better understand geoids, see https://www.census.gov/programs-surveys/geography/guidance/geo-identifiers.html - For processing, see /scripts
  This shapefile is (inner-) joined with the given state's census data

For state census data:

- Download the data by going to https://data.census.gov/cedsci/table?q=american%20community%20survey
- Select "Geography"
- Then "Tract"
- Select state --> Select all Census Tracts within [state]
- Get to race table:
  - Select "Topics" under Geography
  - Go to the "Race and Ethnicity" FOlder then click the box for "Race and Ethnicity"
  - Scroll down available datasets until B02001: RACE
- Get to income table:
  - Go to topics again and select Income and Poverty
  - Select the table "S1903 | MEDIAN INCOME IN THE PAST 12 MONTHS (IN [year] INFLATION-ADJUSTED DOLLARS)"

- Download the files:
  - Click "DOWNLOAD TABLE", select the years you want to download, click "DOWNLOAD.CSV", and wait for prompt to say download is ready at the bottom of the screen
  - If the downnload doesn't start up, click the download button again then a .zip file should be downloaded.
  - The relevant file should be called "ACSDT5Y[year].[code]\_data_with_overlays\_[time downloaded].csv", [code] being B02001 for race and S1903 for income.
  - Rename the relevant CSV as "[state]\_[yr]\_[income|race].csv"

- Process all of the csv data files for the state into one file by running /scripts/census_data_processing (with jupyter)

### Bike Station Data

Bike trips data is scraped (see /scripts).

- NYC: https://s3.amazonaws.com/tripdata/index.html
- Boston: https://s3.amazonaws.com/hubway-data/index.html
- DC: https://s3.amazonaws.com/capitalbikeshare-data/index.html
- Chicago: https://divvy-tripdata.s3.amazonaws.com/index.html
- Philadelphia: Handled differently - see /data/README.md

This data is used to find the first trip originating from each bike dock station, which is assumed to be when that station was added to the network.

- Run the scraping scripts (/scripts/boston_bikes_data_scraper etc) to download the data locally.
- The data is then processed by the bikes data processing script.
- The output is saved to both csv and json. That json is then copied to /viz to be used in map.

### Viz notes

Can use URL parameter `?ha` to hide the about section and have the map take up the full height of the frame. This is useful when embedding in an iframe.

Can also use parameter `?study-boundary` to toggle the boundy of the region studied for each city.


## Quantiative analysis and publication

This repository also contains analysis notebooks for our paper.

> Berke, A., Truitt, W., Larson, K. (2023). Is access to public bike-share networks equitable? A multiyear spatial analysis across 5 U.S. Cities. Journal of Transport Geography, Volume 114, 2024, 103759, ISSN 0966-6923. https://doi.org/10.1016/j.jtrangeo.2023.103759.
