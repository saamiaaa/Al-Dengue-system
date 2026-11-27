
import json
from collections import defaultdict

input_file = "src/data/dhaka_ward_boundaries.geojson"
output_file = "src/data/dhaka_40_wards.geojson"

with open(input_file, encoding="utf-8") as file:
    data = json.load(file)

wards = defaultdict(list)

for feature in data["features"]:
    props = feature["properties"]

    city = props["city_name"]
    code = props["union_ward_code"]

    if city not in [
        "Dhaka North City Corporation",
        "Dhaka South City Corporation"
    ]:
        continue

    if not code.isdigit():
        continue

    number = int(code)

    if not 1 <= number <= 20:
        continue

    geometry = feature["geometry"]

    if geometry["type"] == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry["type"] == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        continue

    wards[(city, number)].extend(polygons)

features = []

for (city, number), polygons in sorted(wards.items()):
    prefix = "DNCC" if "North" in city else "DSCC"

    features.append({
        "type": "Feature",
        "properties": {
            "ward_id": f"{prefix}_Ward_{number:02d}",
            "city": city,
            "ward_number": number
        },
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": polygons
        }
    })

result = {
    "type": "FeatureCollection",
    "features": features
}

with open(output_file, "w", encoding="utf-8") as file:
    json.dump(result, file)

print("Total merged wards:", len(features))
print("Output:", output_file)

if len(features) != 40:
    print("WARNING: Expected exactly 40 wards!")
else:
    print("SUCCESS: All 40 required wards are included.")

