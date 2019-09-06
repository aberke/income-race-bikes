#!/usr/bin/env python
# coding: utf-8

# In[20]:


"""
Processes the raw bike trip data to get information on bike dock locations
and when the docks were placed in those locations.

Desired output columns:

id | first | last | name | lat | lon | rides

where
- id is the station's id
- first is the earliest trip date for the station id
- last is the latest trip date for the station id (included in case docks are removed)
- name is the station's name
- lat and lon are the latitude and longitude of the station's location
- rides is a count of the number of rides found in the data -- it is used to remove dummy stations in the data.
    only stations with more than RIDES_COUNT_THRESHOLD are included in output

"""
import traceback
from datetime import datetime
import math
import os
import pandas as pd
import matplotlib.dates as mdates
import numpy as np

from zipfile import ZipFile

# GLOBAL PARAMETERS
RIDES_COUNT_THRESHOLD = 100

# DEBUGGING DISPLAY SETTINGS:
DATEFORMAT = mdates.DateFormatter('%H:%M:%S')
FLOATFORMAT = '%.6f'
# pd.set_option('max_colwidth', 120)
# pd.set_option("display.max_columns", 20)
pd.set_option('max_colwidth', 999)
pd.set_option("display.max_columns", 999)
DISPWIDTH = 240
pd.set_option('display.width', DISPWIDTH)
pd.set_option("display.max_columns", 999)
pd.set_option("display.max_rows", 999)
np.set_printoptions(linewidth=DISPWIDTH)
ARBDATEFORPLOT = pd.Timestamp('20000101')






def get_filepath(city):
    return '../data/' + city + '-bike/'


def transform_date(date):
    try:
        dt = datetime.strptime(date.split(' ')[0], '%m/%d/%Y')
    except ValueError:
        # this dataset is so frustrating lol
        dt = datetime.strptime(date.split(' ')[0], '%Y-%m-%d')
        
    return dt.strftime('%Y-%m-%d')


# In[23]:



# PHILLY:
# input file column names for indexing data with
start_station_id = 'start_station'
start_station_name = 'start_station'
start_station_latitude = 'start_lat'
start_station_longitude = 'start_lon'
starttime = 'start_time'

# output file column names
ID = 'id'
NAME = 'name'
LAT = 'lat'
LON = 'lon'
FIRST = 'first'
LAST = 'last'
RIDES = 'rides'


"""
make a dict like 
{"id": {"name": "", "lat": "", "lon": "", "first": "", "last": ""}}
where there is one entry for each id
and where the start time is always the earliest found

and then later transform it into a dict like

{'id': [id1, id2, id3], 'col_2': ['a', 'b', 'c', 'd']}

to then make into a dataframe and save as a CSV
"""



def stations_dict_to_df(stations_dict):
    new_dict = {
        ID: [],
        NAME: [],
        LAT: [],
        LON: [],
        FIRST: [],
        LAST: [],
        RIDES: []
    }
    for station_id, station_dict in stations_dict.items():
        new_dict[ID].append(station_id)
        new_dict[NAME].append(station_dict[NAME])
        new_dict[LAT].append(station_dict[LAT])
        new_dict[LON].append(station_dict[LON])
        new_dict[FIRST].append(station_dict[FIRST])
        new_dict[LAST].append(station_dict[LAST])
        new_dict[RIDES].append(station_dict[RIDES])
    
    return pd.DataFrame.from_dict(new_dict)
    


stations_dict = dict()

# bikedatadir = get_filepath('nyc')
bikedatadir = get_filepath('philly')

# DATA FILES: DO NOT INCLUDE ANY CSVs that are not Philly Indego quarterly ride data csvs in the philly-bike dir
# Check the consistency of the csv structures:
files_count = 0
# defaultcolnames = {'plan_duration', 'bike_type', 'start_station', 'trip_route_category', 'bike_id', 'end_station', 'passholder_type', 'duration', 'start_lat', 'start_station_id', 'end_time', 'end_lon', 'start_lon', 'trip_id', 'end_lat', 'end_station_id', 'start_time'}
defaultcolnames = {'plan_duration', 'bike_type', 'start_station', 'trip_route_category', 'bike_id', 'end_station', 'passholder_type', 'duration', 'start_lat', 'start_station_id', 'end_time', 'end_lon', 'start_lon', 'trip_id', 'end_lat', 'end_station_id', 'start_time'}
colnames = set()
for csvfilename in os.listdir(bikedatadir):
    try:
        if not csvfilename.endswith(".csv"):
            continue
        csvfp = os.path.join(bikedatadir, csvfilename)
        stations_df = pd.read_csv(csvfp, parse_dates=[starttime], nrows = 1)
        # stations_df = pd.read_csv(csvfp, nrows=1)
        try:
            stations_df[start_station_id] = stations_df['start_station_id']
        except Exception as e:
            traceback.print_exc()
            print(e)
        curcolnames = set(stations_df.columns)
        print(stations_df.head())
        if not defaultcolnames == curcolnames:
            colnames.update(set(curcolnames))
            errorstr = 'Csv filename {} has different colnames ({}) from default set ({})\ncurcolnames - defaultcolnames = {}\ndefaultcolnames - curcolnames = {}'.format(csvfilename, curcolnames, defaultcolnames, curcolnames - defaultcolnames, defaultcolnames - curcolnames)
            raise Exception(errorstr)
    except Exception as e:
        traceback.print_exc()
        print(e)

# PHILLY:
# input file column names for indexing data with
# start_station_id = 'start_station'
# start_station_name = 'start_station'
# start_station_latitude = 'start_lat'
# start_station_longitude = 'start_lon'
# starttime = 'start_time'

# output file column names
# ID = 'id'
# NAME = 'name'
# LAT = 'lat'
# LON = 'lon'
# FIRST = 'first'
# LAST = 'last'
# RIDES = 'rides'
allsdf = pd.DataFrame(columns=['id', 'name', 'lat', 'lon', 'first', 'last', 'rides'])
for csvfilename in os.listdir(bikedatadir):
    if not csvfilename.endswith(".csv"):
        continue

    files_count += 1 
    print(files_count, ': handling file', csvfilename)
    
    csvfp = os.path.join(bikedatadir, csvfilename)
    # Because someone dropped some gnarly mac osx files into their zips
    # zipfile = ZipFile(csvfp)
    # csvfilename = [f.filename for f in zipfile.infolist() if f.filename.endswith('.csv')][0]
    
    # stations_df = pd.read_csv(zipfile.open(csvfilename))
    # stations_df = pd.read_csv(csvfp, parse_dates=['start_time', 'end_time'])
    stations_df = pd.read_csv(csvfp, parse_dates=[starttime])
    # Because someone can't make data files with uniform column names
    # stations_df.columns = map(str.lower, stations_df.columns)
    # stations_df.columns = stations_df.columns.str.replace('[\ ]', '')
    # transform the dates
    # stations_df[starttime] = stations_df[starttime].apply(transform_date)

    # unique_station_ids = stations_df[start_station_id].unique()
    # for station_id in unique_station_ids:
    for station_id in stations_df.start_station.unique()
        if math.isnan(station_id):
            print('found nan')
            continue

        # station_df = stations_df[stations_df[start_station_id] == station_id]
        allsdf.append(pd.DataFrame(index = [station_id],
                                data = {NAME: [start_station_name].iloc[0],
                                        LAT: station_df[start_station_latitude].iloc[0],
                                        LON: station_df[start_station_longitude].iloc[0],
                                        FIRST: station_df[starttime].iloc[0],
                                        LAST: station_df[starttime].iloc[0],
                                        RIDES: 0,}))
        rides_count =
        stations_dict[station_id][RIDES] += rides_count
        station_df = station_df.sort_values(by=[starttime])
        if (station_df[starttime].iloc[0] < stations_dict[station_id][FIRST]):
            stations_dict[station_id][FIRST] = stations_df[starttime].iloc[0]
        if (station_df[starttime].iloc[-1] > stations_dict[station_id][LAST]):
            stations_dict[station_id][LAST] = stations_df[starttime].iloc[-1]

        # if station_id not in stations_dict:
        #     stations_dict[station_id] = {
        #         NAME: station_df[start_station_name].iloc[0],
        #         LAT: station_df[start_station_latitude].iloc[0],
        #         LON: station_df[start_station_longitude].iloc[0],
        #         FIRST: station_df[starttime].iloc[0],
        #         LAST: station_df[starttime].iloc[0],
        #         RIDES: 0,
        #     }
        # rides_count = len(station_df.index)
        # stations_dict[station_id][RIDES] += rides_count
        # station_df = station_df.sort_values(by=[starttime])
        # if (station_df[starttime].iloc[0] < stations_dict[station_id][FIRST]):
        #     stations_dict[station_id][FIRST] = stations_df[starttime].iloc[0]
        # if (station_df[starttime].iloc[-1] > stations_dict[station_id][LAST]):
        #     stations_dict[station_id][LAST] = stations_df[starttime].iloc[-1]


stations_df = stations_dict_to_df(stations_dict)
stations_df.head()


# In[24]:


# Transform the stations_df

# Remove dummy stations (there are test stations in the data)
# Remove stations with less than RIDES_COUNT_THRESHOLD rides
bad_stations_df = stations_df[stations_df[RIDES] < RIDES_COUNT_THRESHOLD]
print('removing %d bad stations that each have less than %d rides from stations data' % (bad_stations_df.shape[0], RIDES_COUNT_THRESHOLD))
stations_df = stations_df[stations_df[RIDES] >= RIDES_COUNT_THRESHOLD]


# In[26]:


bad_stations_df.head(10)


# In[27]:


# Save the data to CSV
save_to_csvfilename = bikedatadir + 'stations.csv'
stations_df.to_csv(save_to_csvfilename)
print('wrote data to ', save_to_csvfilename)


# In[30]:


# Save the data to JSON that will be used in web app
import json

stations = []
for index, row in stations_df.iterrows():
    # Transform the date
    date = row[5]
    
    stations.append({
        ID: int(row[ID]),
        NAME: row[NAME],
        LAT: row[LAT],
        LON: row[LON],
        FIRST: transform_date(row[FIRST]),
        LAST: transform_date(row[LAST]),
    })

json = json.dumps(stations)

save_to_jsonfilename = bikedatadir + 'stations.json'
with open(save_to_jsonfilename, 'w') as f:
    f.write(json)
print("Data written to stations.json")


# In[31]:


stations_df.head()


# In[ ]:




