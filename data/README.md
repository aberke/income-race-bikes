# Specifics about bike-share data scraping

The companies studied publish data for every trip taken on the network in a given time period (month, quarter, half, year). For most cities, this data exists on an aws server and can be downloaded via an https request.
This data is scraped for relevant information about each bike station on each network, including where the station is and the
date that the station was used for the first time. The number of total trips from a bike station is also noted, as stations with
less than 100 trips are considered not a part of the bike-share network.

## Notes on differences in some cities' data

### Philadelphia

Philadelphia does not store the name of each bike station in their trip data, instead it is kept in a file that contains all the names
of each station. This file is processed to add the names to the stations by matching their station id numbers.

Philadelphia also, unlike the other cities studied, does't keep their trip data on a web server that can be accessed through an http request.
This data, instead, cannot be scraped from the web and is stored in the /philly-bike directory as one needs to click on every link manually to
download the data.

### DC and Chicago

DC and Chicago started off by not listing station latitude and longitude coordinates in their tripdata. To deal with this, stations are intitially stored without lat and lon coordinates. Then, when the coordinates appear in the data later, the station in the data is updated
with them.
