import json
import matplotlib.pyplot as plt
import numpy as np
from turfpy.measurement import boolean_point_in_polygon
from geojson import Point, Polygon, Feature
import pandas as pd


def get_filepath(state):
    return './data/{state}/'.format(state=state)
def get_filepath_city(city):
    return './data/' + city + '-bike/'



households= []
pct_white = []
num_white = []
pct_black = []
num_black = []
pct_asian = []
num_asian = []
pct_other = []
num_other = []
income_list = []
num_bikes = []
yearlist = []
geoid = []

#change depending on city
CITY = 'philly'
STATE = 'pa'
YEARS = range(2016, 2023)

with open(get_filepath(STATE) + f'{STATE}_census_tracts.geojson') as census_file:
    with open(get_filepath_city(CITY) + 'stations.json') as bike_file:
        bike_data = json.load(bike_file)
        census_data = json.load(census_file)
        for y in YEARS:
            print(y)
            #census data only available until 2019
            year = min(y, 2019)
            for tract in census_data['features']:
                geometry = tract['geometry']['coordinates'][0]
                num_bike = 0
                
                polygon = Polygon(geometry)
                for station in bike_data:
                    if int(station['first'][:4]) > y:
                        continue
                    point = Feature(geometry=Point([station['lon'], station['lat']]))
                    if boolean_point_in_polygon(point, polygon):
                        num_bike+=1
                if num_bike == 0:
                    continue
                
                
                income = tract['properties'][f'{year} median income']
                try:
                    # print('try')
                    income_list.append(int(income))
                except:
                    # print('except')
                    continue
                households.append(int(tract['properties'][f'{year} race: total households']))
                pct_white.append(int(tract['properties'][f'{year} race: White'])/int(tract['properties'][f'{year} race: total households']))
                pct_black.append(int(tract['properties'][f'{year} race: Black'])/int(tract['properties'][f'{year} race: total households']))
                pct_asian.append(int(tract['properties'][f'{year} race: Asian'])/int(tract['properties'][f'{year} race: total households']))
                pct_other.append(int(tract['properties'][f'{year} race: Other'])/int(tract['properties'][f'{year} race: total households']))
                num_white.append(int(tract['properties'][f'{year} race: White']))
                num_black.append(int(tract['properties'][f'{year} race: Black']))
                num_asian.append(int(tract['properties'][f'{year} race: Asian']))
                num_other.append(int(tract['properties'][f'{year} race: Other']))
                yearlist.append(y)
                geoid.append(tract['properties']['geoid'])
                num_bikes.append(num_bike)
                # print(yearlist)
        num_bikes_df = pd.DataFrame()
        num_bikes_df['year'] = yearlist
        num_bikes_df['geoid'] = geoid
        num_bikes_df['median_income'] = income_list
        num_bikes_df['num_white'] = num_white
        num_bikes_df['pct_white'] = pct_white
        num_bikes_df['num_black'] = num_black
        num_bikes_df['pct_black'] = pct_black
        num_bikes_df['num_asian'] = num_asian
        num_bikes_df['pct_asian'] = pct_asian
        output_csvfilename = get_filepath(STATE) + STATE + '_preprocessed_data.csv'
        num_bikes_df.to_csv(output_csvfilename)
        print('saved data to ',  output_csvfilename)