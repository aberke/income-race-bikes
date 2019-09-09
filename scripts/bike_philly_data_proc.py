#!/usr/bin/env python
# coding: utf-8

# In[20]:


"""
Processes the quarterlytriplog bike trip data to get information on bike dock locations
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
import glob

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
    # return '../data/' + city + '-bike/'
    return os.path.join('..', 'data', city + '-bike')

def transform_date(date):
    try:
        dt = datetime.strptime(date.split(' ')[0], '%m/%d/%Y')
    except Exception as e:
        # this dataset is so frustrating lol
        try:
            dt = datetime.strptime(date.split(' ')[0], '%Y-%m-%d')
        except Exception as e:
            dt = date
        
    return dt.strftime('%Y-%m-%d')
# PHILLY:
# input file column names for indexing data with
# start_station_id = 'start_station'
# start_station_name = 'start_station'
# start_station_latitude = 'start_lat'
# start_station_longitude = 'start_lon'
# starttime = 'start_time'
#
# # output file column names
# ID = 'id'
# NAME = 'name'
# LAT = 'lat'
# LON = 'lon'
# FIRST = 'first'
# LAST = 'last'
# RIDES = 'rides'
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
# stations_dict = dict()
# bikedataindir = get_filepath('nyc')
bikedataoutdir = get_filepath('philly')
bikedataindir = os.path.join(get_filepath('philly'), 'Downloads')
# DATA FILES: DO NOT INCLUDE ANY CSVs that are not Philly Indego quarterly ride data csvs in the philly-bike dir
# Check the consistency of the csv structures:
# defaultcolnames = {'plan_duration', 'bike_type', 'start_station', 'trip_route_category', 'bike_id', 'end_station', 'passholder_type', 'duration', 'start_lat', 'start_station_id', 'end_time', 'end_lon', 'start_lon', 'trip_id', 'end_lat', 'end_station_id', 'start_time'}
# definitivecolnames = {'plan_duration', 'bike_type', 'start_station', 'trip_route_category', 'bike_id', 'end_station', 'passholder_type', 'duration', 'start_lat', 'start_station_id', 'end_time', 'end_lon', 'start_lon', 'trip_id', 'end_lat', 'end_station_id', 'start_time'}
# colnames = set()
# for triplogcsvfn in os.listdir(bikedataindir):
#     try:
#         if not triplogcsvfn.endswith(".csv"):
#             continue
#         triplogcsvfp = os.path.join(bikedataindir, triplogcsvfn)
#         stations_df = pd.read_csv(triplogcsvfp, parse_dates=['start_time'], nrows = 1)
#         # stations_df = pd.read_csv(triplogcsvfp, nrows=1)
#         curcolnames = set(stations_df.columns)
#         print(stations_df.head())
#         # if not defaultcolnames == curcolnames:
#         #     colnames.update(set(curcolnames))
#         #     errorstr = 'Csv filename {} has different colnames ({}) from default set ({})\ncurcolnames - defaultcolnames = {}\ndefaultcolnames - curcolnames = {}'.format(triplogcsvfn, curcolnames, defaultcolnames, curcolnames - defaultcolnames, defaultcolnames - curcolnames)
#         #     raise Exception(errorstr)
#         try:
#             stations_df['start_station'] = stations_df.start_station_id
#         except Exception as e:
#             'do nothing'
#             # traceback.print_exc()
#             # print(e)
#     except Exception as e:
#         traceback.print_exc()
#         print(e)
# stations summarizes, for each bike station,
# * station name,
# * date-of-first-ride,
# * date-of-last-ride,
# * number-of-rides,
# * lattitude
# * longitute,
# as summarized over ALL monthly-trip-log-csvs.
# Populate it by looping over each monthly-trip-log-csv.
stations = pd.DataFrame()
defaultcolnames = {'plan_duration', 'bike_type', 'start_station', 'trip_route_category', 'bike_id', 'end_station', 'passholder_type', 'duration', 'start_lat', 'start_station_id', 'end_time', 'end_lon', 'start_lon', 'trip_id', 'end_lat', 'end_station_id', 'start_time'}
I_triplogcsvfilerps = 0
csvfilerps = glob.glob(os.path.join(bikedataindir, '*.csv'))
N_triplogcsvfilerps = len(csvfilerps)
for triplogcsvrp in csvfilerps:
    try:
        I_triplogcsvfilerps += 1
        print('%d/%d: handling file %s'% (I_triplogcsvfilerps, N_triplogcsvfilerps, triplogcsvrp))
        quarterlytriplog = pd.read_csv(triplogcsvrp, parse_dates=['start_time'])
        if ('start_station' not in quarterlytriplog.columns):
            if ('start_station_id' in quarterlytriplog.columns):
                quarterlytriplog['start_station'] = quarterlytriplog.start_station_id
            else:
                errtext = 'Trip log csv {} has neither "start_station" nor "start_station_id" column.'.format(triplogcsvrp)
                raise Exception(errtext)
        else:
            'do nothing'
        try:
            quarterlytriplog.drop(quarterlytriplog.index[np.isnan(quarterlytriplog.start_station)], axis=0, inplace=True)
            quarterlytriplog.start_station = quarterlytriplog.start_station.astype('int')
        except Exception as e:
            errtext = 'Error in casting start_station column {} to int: '.format(quarterlytriplog.start_station)
            raise Exception(errtext)
        for station_id in quarterlytriplog.start_station.unique():
            if math.isnan(station_id):
                print('found nan')
                continue
            thisstation = quarterlytriplog.loc[quarterlytriplog.start_station == station_id].sort_values(by='start_time')
            if station_id not in stations.index:
                newstation = pd.DataFrame(index=[station_id],
                                          data={'name': [thisstation.start_station.iloc[0]],
                                                'lat': [thisstation.start_lat.iloc[0]],
                                                'lon': [thisstation.start_lon.iloc[0]],
                                                't0_firsttrip': [thisstation.start_time.iloc[0]],
                                                't0_lasttrip': [thisstation.start_time.iloc[-1]],
                                                'nrides': [len(thisstation.index)],
                                                })
                # print('In monthly trips csv file {} a new station: {}'.format(triplogcsvrp, newstation))
                stations = stations.append(newstation)
            else:
                stations.at[station_id, 'nrides'] +=  len(thisstation.index)
                stations.at[station_id, 't0_firsttrip'] = min(stations.at[station_id, 't0_firsttrip'], thisstation.start_time.iloc[0])
                stations.at[station_id, 't0_lasttrip'] =  max(stations.at[station_id, 't0_lasttrip'], thisstation.start_time.iloc[-1])
    except Exception as e:
        traceback.print_exc()
        print(e)
# stations_df = stations_dict_to_df(stations_dict)
stations.name = stations.name.astype('str')
stations.head()


# In[24]:


# Transform the stations_df

# Remove dummy stations (there are test stations in the data)
# Remove stations with less than RIDES_COUNT_THRESHOLD rides
bad_stations = stations[stations.nrides < RIDES_COUNT_THRESHOLD]
print('removing %d bad stations that each have less than %d rides from stations data' % (bad_stations.shape[0], RIDES_COUNT_THRESHOLD))
stations = stations[stations.nrides >= RIDES_COUNT_THRESHOLD]


# In[26]:


bad_stations.head(10)


# In[27]:


# Save the data to CSV
save_to_csvfilename = os.path.join(bikedataoutdir, 'stations.csv')
stations.to_csv(save_to_csvfilename)
print('wrote data to ', save_to_csvfilename)


# In[30]:


# Save the data to JSON that will be used in web app
import json

stations_df = stations
stations = []
ID = 'id'
NAME = 'name'
LAT = 'lat'
LON = 'lon'
FIRST = 'first'
LAST = 'last'
RIDES = 'rides'
for index, row in stations_df.iterrows():
    # Transform the date
    date = row[5]
    
    stations.append({
        # ID: int(row['name']),
        ID: int(index),
        NAME: row['name'],
        LAT: row['lat'],
        LON: row['lon'],
        FIRST: transform_date(row['t0_firsttrip']),
        LAST: transform_date(row['t0_lasttrip']),
    })

json = json.dumps(stations)

save_to_jsonfilename = os.path.join(bikedataoutdir, 'stations.json')
with open(save_to_jsonfilename, 'w') as f:
    f.write(json)

print("Data written to stations.json")


stations_df.head()

