# Income, Race, Bikes


Question:
Who decides where the bike share stations are located?  Are these decisions equitable?


### Running Visualization Locally

- `npm install`
- `npm start`
- Go to your locally running server at http://127.0.0.1:8080



## Data Sources


#### Bike Station Data

Bike trips data is scraped (see scripts).

This data is used to find the first trip originating from each bike dock station, which is assumed to be when that station was added to the network.

- Run the scraping scripts (/scripts/boston_bikes_data_scraper etc) to download the data locally.
- The data is then processed by the bikes data processing script.
- The output is saved to both csv and json.  That json is then copied to /viz to be used in map.

