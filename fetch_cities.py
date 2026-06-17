import urllib.request
import json
import os

url = "https://gist.githubusercontent.com/sercanov/c63063e4b40c756d4040a0be694895e9/raw"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    cities_map = {}
    for item in data:
        city_name = item['il']
        districts = [d['ilce'] for d in item['ilceler']]
        cities_map[city_name] = sorted(districts)

    os.makedirs('src/data', exist_ok=True)
    with open('src/data/cities.json', 'w', encoding='utf-8') as f:
        json.dump(cities_map, f, ensure_ascii=False, indent=2)
    print("Success")
except Exception as e:
    print("Error:", e)
