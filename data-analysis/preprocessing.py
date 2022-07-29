import json
import matplotlib.pyplot as plt
import numpy as np
from turfpy.measurement import boolean_point_in_polygon
from geojson import Point, Polygon, Feature
import pandas as pd
from shapely.geometry import Polygon as plg

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
CITY = 'dc'
STATE = 'dc'
YEARS = range(2010, 2023)
with open(get_filepath(STATE) + f'{CITY}_limits.geojson') as limit_file:

    city_limits = json.load(limit_file)
    limit_polygon = Polygon(city_limits['features'][0]['geometry']['coordinates'])
    print(limit_polygon)

    with open(get_filepath(STATE) + f'{STATE}_census_tracts.geojson') as census_file:
        with open(get_filepath_city(CITY) + 'stations.json') as bike_file:
            bike_data = json.load(bike_file)
            census_data = json.load(census_file)
            for y in YEARS:
                visited = set()
                print(y)
                #census data only available until 2019
                year = min(y, 2019)
                count = 0
                print(len(census_data['features']))
                for tract in census_data['features']:

                    geometry = tract['geometry']['coordinates'][0]
                    num_bike = 0
                    polygon = Polygon(geometry)
                    s = plg([tuple(p) for p in geometry[0]])
                    center = s.centroid
                    # print(center.x, center.y)
                    center = Feature(geometry=Point([center.x, center.y]))
                    
                    

                    for station in bike_data:
                        if str(station) in visited: continue
                        if int(station['first'][:4]) > y: continue
                        
                        point = Feature(geometry=Point([station['lon'], station['lat']]))
                        if boolean_point_in_polygon(point, polygon):
                            visited.add(str(station))
                            num_bike+=1

                    income = tract['properties'][f'{year} median income']
                    try:
                        income_list.append(int(income))
                    except:
                        
                        continue
                    
                    if num_bike == 0:
                        inServiceArea.append(False)
                    else:
                        inServiceArea.append(True)

                    if boolean_point_in_polygon(center, limit_polygon):
                        inLimits.append('True')
                        #  print('t')
                        count += 1
                    else:
                        inLimits.append('False')
                        # print('f')

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

                    yearlist.append(y)
                    geoid.append(tract['properties']['geoid'])
                    num_bikes.append(num_bike)
                    # print(yearlist)
                            
                print(count)

            num_bikes_df = pd.DataFrame()
            num_bikes_df['year'] = yearlist
            print(len(yearlist))
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
            num_bikes_df = num_bikes_df.loc[num_bikes_df['inLimits'] == 'True']
            output_csvfilename = get_filepath(STATE) + STATE + '_preprocessed_data.csv'
            num_bikes_df.to_csv(output_csvfilename)
            print('saved data to ',  output_csvfilename)