import json
import matplotlib.pyplot as plt
import numpy as np
from turfpy.measurement import boolean_point_in_polygon
from geojson import Point, Polygon, Feature
import pandas as pd
from shapely.geometry import Polygon as plg
import unittest
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
pct_2_or_more = []
num_2_or_more = []
income_list = []
num_bikes = []
yearlist = []
geoid = []
inLimits = []
inServiceArea = []

#change depending on city
CITY = 'chicago'
STATE = 'il'
YEARS = range(2013, 2023)
#open the limit file to set the study boundary
with open(get_filepath(STATE) + f'{CITY}_limits.geojson') as limit_file:

    city_limits = json.load(limit_file)
    #turn file into a polygon object from geojson
    limit_polygon = Polygon(city_limits['features'][0]['geometry']['coordinates'])
    
    #open the census and bike files for the city
    with open(get_filepath(STATE) + f'{STATE}_census_tracts.geojson') as census_file:
        with open(get_filepath_city(CITY) + 'stations.json') as bike_file:

            bike_data = json.load(bike_file)
            census_data = json.load(census_file)

            for y in YEARS:
                diff_count = 0
                #set created to speed up calculations - once a bike is found inside a tract it is not considered for another tract
                visited = set()
                print(y)
                #census data only available until 2019
                year = min(y, 2019)
                for tract in census_data['features']:
                    num_bike = 0
                    #get geometry of tracts and turn it into a polygon
                    geometry = tract['geometry']['coordinates'][0]
                    geo_polygon = Polygon(geometry)
                    #use shapely to get centroid of the census tract
                    s = plg([tuple(p) for p in geometry[0]])
                    center = s.centroid
                    center = Feature(geometry=Point([center.x, center.y]))
                    # if not boolean_point_in_polygon(center, geo_polygon): print(tract['properties']['Name'])
                    #go through bike stations to see if there are any in the tract
                    for station in bike_data:
                        #if a bike station has been already found - skip
                        if str(station) in visited: continue
                        if int(station['first'][:4]) > y: continue
                        if int(station['last'][:4]) < y: continue
                        #get point of bike station and check if it is in tract
                        point = Feature(geometry=Point([station['lon'], station['lat']]))
                        if boolean_point_in_polygon(point, geo_polygon):
                            visited.add(str(station))
                            num_bike+=1
                    #after getting number of bikes - get other info about the tract
                    
                    #Get income of the tract - if it cant be represented as an integer (i.e. a string) then skip the tract - means no income data
                    income = tract['properties'][f'{year} median income']
                    try:
                        income_list.append(int(income))
                    except:
                        continue
                    # if the tract has no bikes inside of it, it is not in the service area
                    if num_bike == 0:
                        inServiceArea.append(False)
                    else:
                        inServiceArea.append(True)
                    # mark if a tract is in the study boundary
                    if boolean_point_in_polygon(center, limit_polygon):
                        inLimits.append(True)
                    else:
                        inLimits.append(False)
                    
                    #take data collected and append to lists to later create a dataframe
                    households.append(int(tract['properties'][f'{year} race: total households']))
                    pct_white.append(int(tract['properties'][f'{year} race: White'])/int(tract['properties'][f'{year} race: total households']))
                    pct_black.append(int(tract['properties'][f'{year} race: Black'])/int(tract['properties'][f'{year} race: total households']))
                    pct_asian.append(int(tract['properties'][f'{year} race: Asian'])/int(tract['properties'][f'{year} race: total households']))
                    pct_other.append(int(tract['properties'][f'{year} race: Other'])/int(tract['properties'][f'{year} race: total households']))
                    pct_2_or_more.append(int(tract['properties'][f'{year} race: 2 or more races'])/int(tract['properties'][f'{year} race: total households']))
                    num_white.append(int(tract['properties'][f'{year} race: White']))
                    num_black.append(int(tract['properties'][f'{year} race: Black']))
                    num_asian.append(int(tract['properties'][f'{year} race: Asian']))
                    num_other.append(int(tract['properties'][f'{year} race: Other']))
                    num_2_or_more.append(int(tract['properties'][f'{year} race: 2 or more races']))
                    # if the percentages of races don'd add up to within 5% of 100% then add to number of bad tracts
                    diff = abs((sum((pct_2_or_more[-1], pct_asian[-1], pct_black[-1], pct_other[-1], pct_white[-1]))) - 1)
                    if diff > .05:
                        diff_count += 1

                    yearlist.append(y)
                    geoid.append(tract['properties']['geoid'])
                    num_bikes.append(num_bike)
                print('Number of bad tracts', diff_count, y)
            #form dataframe from lists
            num_bikes_df = pd.DataFrame()
            num_bikes_df['year'] = yearlist
            num_bikes_df['geoid'] = geoid
            num_bikes_df['num_bikes'] = num_bikes
            num_bikes_df['households'] = households
            num_bikes_df['median_income'] = income_list
            num_bikes_df['num_white'] = num_white
            num_bikes_df['pct_white'] = pct_white
            num_bikes_df['num_black'] = num_black
            num_bikes_df['pct_black'] = pct_black
            num_bikes_df['num_asian'] = num_asian
            num_bikes_df['pct_asian'] = pct_asian
            num_bikes_df['num_other'] = num_other
            num_bikes_df['pct_other'] = pct_other
            num_bikes_df['num_2om'] = num_2_or_more
            num_bikes_df['pct_2om'] = pct_2_or_more
            num_bikes_df['inLimits'] = inLimits
            num_bikes_df['inServiceArea'] = inServiceArea
            #only include tracts in the study area
            num_bikes_df = num_bikes_df.loc[num_bikes_df['inLimits'] == True]
            #save data to a .csv file
            output_csvfilename = get_filepath(STATE) + STATE + '_new_preprocessed_data.csv'
            num_bikes_df.to_csv(output_csvfilename)
            print('saved data to ',  output_csvfilename)