"""
Seed listings — at least one per category, each with a parcel polygon and,
where it makes sense, a 360° walkthrough and a VR tour.

`reference_number` is the manually-entered agency reference: its presence is
what marks a property as genuinely on the market.
"""

import math


def _img(photo_id: str) -> str:
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=1600&q=80"


def _points(lat: float, lng: float, size_sqm: float, skew: float = 0.12) -> list:
    """A parcel outline of roughly `size_sqm`, centred on the given point.

    Built from the declared size rather than a fixed offset, so the outline a
    seeded listing draws actually measures what the listing says it does —
    otherwise every demo parcel trips the area-mismatch check the moment its
    geometry is analysed.

    `skew` nudges two corners so the result is a quadrilateral rather than a
    perfect square: real parcels are not square, and a map full of identical
    rectangles reads as fake.
    """
    half = math.sqrt(size_sqm) / 2

    phi = math.radians(lat)
    lat_m = 111_132.92 - 559.82 * math.cos(2 * phi) + 1.175 * math.cos(4 * phi)
    lng_m = 111_412.84 * math.cos(phi) - 93.5 * math.cos(3 * phi)

    dlat = half / lat_m
    dlng = half / lng_m

    # Widen one side and narrow the other by the same amount: a trapezium keeps
    # the area while losing the symmetry.
    return [
        [lat - dlat, lng - dlng * (1 + skew)],
        [lat - dlat, lng + dlng * (1 - skew)],
        [lat + dlat, lng + dlng * (1 + skew)],
        [lat + dlat, lng - dlng * (1 - skew)],
    ]


def _ring(lat: float, lng: float, size_sqm: float) -> dict:
    """The same outline as GeoJSON, longitude first and closed."""
    coords = [[lng, lat] for lat, lng in _points(lat, lng, size_sqm)]
    coords.append(coords[0])
    return {"type": "Polygon", "coordinates": [coords]}


PANORAMA = [
    {"url": _img("photo-1600585154340-be6161a56a0c"), "title": "Entrance",
     "hotspots": [{"pitch": -5, "yaw": 120, "text": "Main gate"}]},
    {"url": _img("photo-1600566753086-00f18fb6b3ea"), "title": "Living area",
     "hotspots": [{"pitch": 0, "yaw": 40, "text": "Terrace"}]},
    {"url": _img("photo-1600607687939-ce8a6c25118c"), "title": "Rear garden", "hotspots": []},
]


PROPERTIES: list[dict] = [
    # ------------------------------------------------ residential land
    {
        "form": "residential:res_plot",
        "reference_number": "EVR-2026-0001",
        "upi": "1/03/06/02/1847",
        "title": "812 sqm residential plot in Kanombe",
        "summary": ("A fenced, road-accessible plot minutes from Kigali International Airport. "
                    "Water and power already at the boundary — build-ready with no site "
                    "preparation cost."),
        "description": ("The parcel sits on a gentle slope with the frontage on a tarmac feeder "
                        "road. Boundary wall is complete on three sides. Neighbouring plots are "
                        "already built out, so services are proven rather than promised."),
        "location": "Kanombe, near the airport road", "province": "Kigali City",
        "district": "Kicukiro", "sector": "Kanombe", "cell": "Rubirizi", "village": "Karama",
        "latitude": -1.9706, "longitude": 30.1394, "gis_coordinates": "-1.9706, 30.1394",
        "boundary_geojson": _ring(-1.9706, 30.1394, 812),
        "boundary_points": _points(-1.9706, 30.1394, 812),
        "boundary_area_sqm": 812,
        "size": 812, "land_use": "Residential", "right_type": "Freehold",
        "intent": "sale", "price": 42_000_000, "currency": "RWF",
        "projected_yield": 9.5, "appreciation": 18, "is_featured": True,
        "tags": ["Build-ready", "Fenced", "Airport corridor"],
        "video_360_url": "https://cdn.evaramu.rw/360/kanombe-plot.mp4",
        "vr_tour_url": "https://kuula.co/share/collection/evaramu-kanombe",
        "vr_tour_provider": "kuula",
        "drone_footage_url": "https://cdn.evaramu.rw/drone/kanombe-plot.mp4",
        "details": {"has_electricity": "Yes", "has_water": "Yes", "has_parking": "No",
                    "sewage_type": "Septic Tank", "has_fence": "Yes",
                    "fence_material": "Concrete/Cement"},
        "parcel_information": {"upi": "1/03/06/02/1847", "province": "Kigali City",
                               "district": "Kicukiro", "sector": "Kanombe", "cell": "Rubirizi",
                               "village": "Karama", "land_use": "Residential",
                               "parcel_size": 812, "tenure": "Freehold",
                               "verified_on": "2025-11-05", "registrar": "National Land Authority"},
        "media": [
            {"url": _img("photo-1500382017468-9049fed747ef"), "caption": "Frontage"},
            {"url": _img("photo-1464822759023-fed622ff2c3b"), "caption": "Boundary wall"},
            {"url": _img("photo-1470071459604-3b5ec3a7fe05"), "caption": "Access road"},
            {"kind": "video_360", "url": "https://cdn.evaramu.rw/360/kanombe-plot.mp4",
             "caption": "360° walkthrough"},
        ],
    },
    # ------------------------------------------------ residential building
    {
        "form": "residential:res_building",
        "reference_number": "EVR-2026-0002",
        "upi": "1/01/04/03/2290",
        "title": "4-bedroom family house in Kimironko",
        "summary": ("A well-finished two-storey family home on 640 sqm, walking distance from "
                    "Kimironko market. Tiled throughout, mature garden, and a compound wall "
                    "already in place."),
        "location": "Kimironko, near the market", "province": "Kigali City", "district": "Gasabo",
        "sector": "Kimironko", "cell": "Bibare", "village": "Nyagatovu",
        "latitude": -1.9403, "longitude": 30.1233, "gis_coordinates": "-1.9403, 30.1233",
        "boundary_geojson": _ring(-1.9403, 30.1233, 640),
        "boundary_points": _points(-1.9403, 30.1233, 640),
        "boundary_area_sqm": 640,
        "size": 640, "built_area": 285, "bedrooms": 4, "bathrooms": 3,
        "land_use": "Residential", "right_type": "Leasehold — 99 years",
        "intent": "sale", "price": 128_000_000, "currency": "RWF",
        "projected_yield": 8.2, "appreciation": 14, "is_featured": True,
        "tags": ["4 bedrooms", "Move-in ready", "Walled compound"],
        "vr_tour_url": "https://my.matterport.com/show/?m=evaramu-kimironko",
        "vr_tour_provider": "matterport",
        "panorama_scenes": PANORAMA,
        "details": {"condition": "Excellent", "built_area": 285,
                    "building_type": "Detached building", "floors": 2,
                    "roof_type": "Double-Pitch", "roof_material": "Tile",
                    "wall_material": "Cement blocks", "floor_material": "Floor tiles",
                    "under_construction": "No", "construction_year": 2021, "units": 1,
                    "bedrooms": 4, "sitting_rooms": 2, "bathrooms": 3, "store_rooms": 1,
                    "kitchen": 1, "other_rooms": 2},
        "parcel_information": {"upi": "1/01/04/03/2290", "district": "Gasabo",
                               "sector": "Kimironko", "parcel_size": 640, "tenure": "Leasehold",
                               "lease_period": "99 years from 2018", "verified_on": "2025-12-15",
                               "registrar": "National Land Authority"},
        "media": [
            {"url": _img("photo-1568605114967-8130f3a36994"), "caption": "Street view"},
            {"url": _img("photo-1600585154340-be6161a56a0c"), "caption": "Living room"},
            {"url": _img("photo-1600607687939-ce8a6c25118c"), "caption": "Kitchen"},
            {"url": _img("photo-1600566753086-00f18fb6b3ea"), "caption": "Master bedroom"},
            {"kind": "vr_tour", "url": "https://my.matterport.com/show/?m=evaramu-kimironko",
             "caption": "Full VR walkthrough"},
        ],
    },
    # ------------------------------------------------ agricultural — seasonal crops
    {
        "form": "agricultural:seasonal_crops",
        "reference_number": "EVR-2026-0003",
        "upi": "3/02/05/01/8899",
        "title": "4.2 hectares of irrigated farmland near Lake Muhazi",
        "summary": ("Productive, fully fenced farmland with gravity irrigation drawn from Lake "
                    "Muhazi. Currently under maize and banana with mature perennial cover across "
                    "most of the parcel."),
        "description": ("Deep sandy-loam over a gentle slope, with progressive terraces already "
                        "established on the steeper eastern edge. An abstraction permit is in "
                        "place and transfers with the sale."),
        "location": "Muhazi, Eastern Province", "province": "Eastern Province",
        "district": "Rwamagana", "sector": "Muhazi", "cell": "Kabare", "village": "Gishari",
        "latitude": -1.9487, "longitude": 30.4347, "gis_coordinates": "-1.9487, 30.4347",
        "boundary_geojson": _ring(-1.9487, 30.4347, 42_000),
        "boundary_points": _points(-1.9487, 30.4347, 42_000),
        "boundary_area_sqm": 42_000,
        "size": 42_000, "land_use": "Agricultural", "right_type": "Freehold",
        "intent": "sale", "price": 74_000_000, "currency": "RWF",
        "projected_yield": 7.4, "appreciation": 9, "is_featured": True,
        "tags": ["Irrigated", "4.2 hectares", "Producing", "Permit included"],
        "video_360_url": "https://cdn.evaramu.rw/360/muhazi-farm.mp4",
        "drone_footage_url": "https://cdn.evaramu.rw/drone/muhazi-farm.mp4",
        "details": {
            "seasonal": "Yes", "perennial": "Yes",
            "products": ["Maize/Sorghum/Wheat/Corn", "Banana", "Fruits"],
            "farming_system": "Semi-commercial", "crop_size": "Mature",
            "coverage": "Above 75%", "cropping_seasons": 2, "yield_per_ha": 4.5,
            "certifications": ["None"],
            "soil_type": "Sandy loam", "soil_fertility": "Good",
            "soil_ph": "Acidic (5.5–6.5)", "soil_depth": 45,
            "topography": "Gentle slope (5–15%)", "altitude": 1420,
            "erosion_control": ["Progressive terraces", "Grass strips"],
            "is_marshland": "No", "flood_risk": "No",
            "water_sources": ["Lake", "Rainwater harvesting"],
            "water_reliability": "Year-round", "distance_to_water": 250,
            "irrigation": "Yes", "irrigation_type": "Gravity / furrow",
            "irrigated_area": 3.1, "has_water_permit": "Yes",
            "road_access": "All-weather murram", "market_distance": "5–15 km",
            "has_electricity": "Yes", "land_tenure": "Freehold",
            "has_fence": "Yes", "fence_material": "Wired",
            "farm_structures": ["Grain store", "Water reservoir / tank", "Worker housing"],
            "farm_equipment": ["Irrigation pump", "Sprayer"],
            "storage_capacity": 40, "labour_available": "Yes",
        },
        "parcel_information": {"upi": "3/02/05/01/8899", "province": "Eastern Province",
                               "district": "Rwamagana", "parcel_size": 42000,
                               "tenure": "Freehold", "verified_on": "2025-12-08",
                               "registrar": "National Land Authority"},
        "media": [
            {"url": _img("photo-1500651230702-0e2d8a49d4ad"), "caption": "Maize block"},
            {"url": _img("photo-1523348837708-15d4a09cfac2"), "caption": "Irrigation channel"},
            {"url": _img("photo-1464226184884-fa280b87c399"), "caption": "Banana stand"},
            {"kind": "drone", "url": "https://cdn.evaramu.rw/drone/muhazi-farm.mp4",
             "caption": "Aerial survey"},
        ],
    },
    # ------------------------------------------------ agricultural — plantation
    {
        "form": "agricultural:plantation",
        "reference_number": "EVR-2026-0004",
        "title": "6.8 hectare coffee plantation at Huye",
        "summary": ("A mature Arabica plantation on volcanic soil with an existing washing "
                    "station and a standing off-take agreement with a Kigali exporter."),
        "location": "Huye, Southern Province", "province": "Southern Province",
        "district": "Huye", "sector": "Mbazi", "cell": "Rugera", "village": "Nyaruteja",
        "latitude": -2.5921, "longitude": 29.7386, "gis_coordinates": "-2.5921, 29.7386",
        "boundary_geojson": _ring(-2.5921, 29.7386, 68_000),
        "boundary_points": _points(-2.5921, 29.7386, 68_000),
        "boundary_area_sqm": 68_000,
        "size": 68_000, "land_use": "Agricultural", "right_type": "Freehold",
        "intent": "sale", "price": 152_000_000, "currency": "RWF",
        "projected_yield": 11.2, "appreciation": 11, "is_featured": True,
        "tags": ["Coffee", "Washing station", "Off-take contract", "6.8 hectares"],
        "video_360_url": "https://cdn.evaramu.rw/360/huye-coffee.mp4",
        "vr_tour_url": "https://kuula.co/share/collection/evaramu-huye",
        "vr_tour_provider": "kuula",
        "details": {
            "crop": "Coffee", "variety": "Bourbon (Arabica)", "tree_count": 21500,
            "planting_year": 2012, "crop_size": "Mature", "annual_output": 34000,
            "buyer_contract": "Yes",
            "certifications": ["Rainforest Alliance", "NAEB registered"],
            "soil_type": "Volcanic (Andosol)", "soil_fertility": "Very good",
            "soil_ph": "Acidic (5.5–6.5)", "soil_depth": 70,
            "topography": "Moderate slope (15–30%)", "altitude": 1750,
            "erosion_control": ["Radical terraces", "Agroforestry trees", "Contour bunds"],
            "is_marshland": "No", "flood_risk": "No",
            "water_sources": ["River / stream", "Rainwater harvesting"],
            "water_reliability": "Year-round", "distance_to_water": 400,
            "irrigation": "No",
            "road_access": "All-weather murram", "market_distance": "5–15 km",
            "has_electricity": "Yes", "land_tenure": "Freehold",
            "has_fence": "Yes", "fence_material": "Live hedge",
            "has_processing": "Yes", "processing_type": "Wet mill and drying beds",
            "farm_structures": ["Drying yard / shed", "Grain store", "Worker housing",
                                "Farm office"],
        },
        "media": [
            {"url": _img("photo-1447933601403-0c6688de566e"), "caption": "Coffee rows"},
            {"url": _img("photo-1524350876685-274059332603"), "caption": "Cherry harvest"},
            {"url": _img("photo-1442512595331-e89e73853f31"), "caption": "Drying beds"},
        ],
    },
    # ------------------------------------------------ agricultural — livestock
    {
        "form": "agricultural:livestock_farm",
        "reference_number": "EVR-2026-0005",
        "title": "Dairy farm with 60-head herd near Nyagatare road",
        "summary": ("A working dairy on 12 hectares of improved pasture, with a milking parlour, "
                    "biogas digester and a cooling tank. Herd and equipment included."),
        "location": "Kayonza, Eastern Province", "province": "Eastern Province",
        "district": "Kayonza", "sector": "Mukarange", "cell": "Bwiza", "village": "Nyamirama",
        "latitude": -1.8672, "longitude": 30.6194, "gis_coordinates": "-1.8672, 30.6194",
        "boundary_geojson": _ring(-1.8672, 30.6194, 120_000),
        "boundary_points": _points(-1.8672, 30.6194, 120_000),
        "boundary_area_sqm": 120_000,
        "size": 120_000, "land_use": "Agricultural", "right_type": "Leasehold — 99 years",
        "intent": "sale", "price": 265_000_000, "currency": "RWF",
        "projected_yield": 13.4, "appreciation": 8,
        "tags": ["Dairy", "60 head", "Biogas", "12 hectares"],
        "video_360_url": "https://cdn.evaramu.rw/360/kayonza-dairy.mp4",
        "details": {
            "livestock_types": ["Dairy cattle", "Poultry (layers)"], "herd_size": 60,
            "daily_output": 640, "grazing_area": 9.5, "fodder_grown": "Yes",
            "vet_access": "Yes", "livestock_included": "Yes",
            "soil_type": "Loam", "soil_fertility": "Good", "soil_ph": "Neutral (6.5–7.5)",
            "soil_depth": 55, "topography": "Flat (0–5%)", "altitude": 1480,
            "erosion_control": ["Grass strips"], "is_marshland": "No", "flood_risk": "No",
            "water_sources": ["Borehole", "Rainwater harvesting"],
            "water_reliability": "Year-round", "distance_to_water": 60,
            "irrigation": "Yes", "irrigation_type": "Sprinkler", "irrigated_area": 4.0,
            "has_water_permit": "Yes",
            "road_access": "Tarmac road", "market_distance": "Under 5 km",
            "has_electricity": "Yes", "land_tenure": "Leasehold",
            "has_fence": "Yes", "fence_material": "Wired",
            "farm_structures": ["Cattle shed / kraal", "Milking parlour", "Poultry house",
                                "Silage pit", "Machinery shed", "Worker housing"],
            "farm_equipment": ["Tractor", "Milking machine", "Feed mixer", "Irrigation pump"],
            "waste_management": "Biogas digester",
        },
        "media": [
            {"url": _img("photo-1516467508483-a7212febe31a"), "caption": "Pasture"},
            {"url": _img("photo-1500595046743-cd271d694d30"), "caption": "Grazing land"},
            {"url": _img("photo-1605280263929-1c42c62ef169"), "caption": "Milking parlour"},
        ],
    },
    # ------------------------------------------------ commercial — apartment block
    {
        "form": "commercial:apartment_building",
        "reference_number": "EVR-2026-0006",
        "upi": "1/02/07/01/0455",
        "title": "16-unit apartment block in Kacyiru",
        "summary": ("A fully tenanted income asset in Kigali's diplomatic quarter. 14 of 16 "
                    "units currently let, generating steady monthly rent with room to reprice "
                    "at renewal."),
        "location": "Kacyiru, off KG 7 Ave", "province": "Kigali City", "district": "Gasabo",
        "sector": "Kacyiru", "cell": "Kamatamu", "village": "Rukiri",
        "latitude": -1.9345, "longitude": 30.0894, "gis_coordinates": "-1.9345, 30.0894",
        "boundary_geojson": _ring(-1.9345, 30.0894, 1240),
        "boundary_points": _points(-1.9345, 30.0894, 1240),
        "boundary_area_sqm": 1240,
        "size": 1240, "built_area": 1860, "bedrooms": 3, "bathrooms": 2,
        "land_use": "Commercial", "right_type": "Leasehold — 99 years",
        "intent": "sale", "price": 465_000_000, "currency": "RWF",
        "projected_yield": 11.4, "appreciation": 12, "is_featured": True,
        "tags": ["Income producing", "87% occupied", "Prime location"],
        "vr_tour_url": "https://my.matterport.com/show/?m=evaramu-kacyiru",
        "vr_tour_provider": "matterport",
        "details": {"condition": "Excellent", "built_area": 1860,
                    "building_type": "Detached building", "floors": 5, "roof_type": "Flat roof",
                    "roof_material": "Reinforced Concrete",
                    "wall_material": "Reinforced concrete", "floor_material": "Floor tiles",
                    "under_construction": "No", "construction_year": 2022,
                    "rooms_per_unit": 3, "total_units": 16, "floor_area_per_unit": 96,
                    "units_under_rent": 14, "monthly_rent_per_unit": 850000},
        "media": [
            {"url": _img("photo-1545324418-cc1a3fa10c00"), "caption": "Elevation"},
            {"url": _img("photo-1522708323590-d24dbb6b0267"), "caption": "Typical unit"},
            {"url": _img("photo-1502672260266-1c1ef2d93688"), "caption": "Balcony view"},
        ],
    },
    # ------------------------------------------------ commercial — office (rent)
    {
        "form": "commercial:office_block",
        "reference_number": "EVR-2026-0007",
        "upi": "1/03/01/02/5566",
        "title": "Grade-A office floors in Kigali CBD",
        "summary": ("Fitted office space across six floors with lift, backup power and secure "
                    "basement parking. Offered per square metre per month on flexible floor "
                    "plates."),
        "location": "Nyarugenge, Kigali CBD", "province": "Kigali City", "district": "Nyarugenge",
        "sector": "Nyarugenge", "cell": "Rwampara", "village": "Centre",
        "latitude": -1.9494, "longitude": 30.0588, "gis_coordinates": "-1.9494, 30.0588",
        "boundary_geojson": _ring(-1.9494, 30.0588, 900),
        "boundary_points": _points(-1.9494, 30.0588, 900),
        "boundary_area_sqm": 900,
        "size": 900, "built_area": 2400, "land_use": "Commercial",
        "right_type": "Leasehold — 99 years",
        "intent": "rent", "rent_amount": 12_500, "currency": "RWF",
        "projected_yield": 9.8, "appreciation": 10,
        "tags": ["Grade A", "Backup power", "Flexible floors"],
        "details": {"condition": "Good", "built_area": 2400,
                    "building_type": "Detached building", "floors": 6, "roof_type": "Flat roof",
                    "roof_material": "Reinforced Concrete",
                    "wall_material": "Reinforced concrete", "floor_material": "Floor tiles",
                    "under_construction": "No", "construction_year": 2016, "is_rented": "Yes",
                    "rental_area": 2100, "rent_percentage": 88, "rent_price": 12500},
        "media": [
            {"url": _img("photo-1497366754035-f200968a6e72"), "caption": "Open floor"},
            {"url": _img("photo-1497366811353-6870744d04b2"), "caption": "Meeting room"},
        ],
    },
    # ------------------------------------------------ industrial
    {
        "form": "industrial:ind_building",
        "reference_number": "EVR-2026-0008",
        "upi": "1/04/08/03/6712",
        "title": "2,800 sqm warehouse in the Kigali SEZ",
        "summary": ("Clear-span warehouse with 8 m eaves, loading dock and tarmac internal roads "
                    "inside the Special Economic Zone. Available on a per-sqm monthly lease."),
        "location": "Special Economic Zone, Masoro", "province": "Kigali City",
        "district": "Gasabo", "sector": "Ndera", "cell": "Masoro", "village": "SEZ Phase II",
        "latitude": -1.9105, "longitude": 30.1662, "gis_coordinates": "-1.9105, 30.1662",
        "boundary_geojson": _ring(-1.9105, 30.1662, 3600),
        "boundary_points": _points(-1.9105, 30.1662, 3600),
        "boundary_area_sqm": 3600,
        "size": 3600, "built_area": 2800, "land_use": "Industrial",
        "right_type": "Leasehold — 50 years",
        "intent": "rent", "rent_amount": 6_800, "currency": "RWF",
        "projected_yield": 10.6, "appreciation": 8,
        "tags": ["SEZ", "Loading dock", "Clear span"],
        "video_360_url": "https://cdn.evaramu.rw/360/sez-warehouse.mp4",
        "details": {"condition": "Excellent", "built_area": 2800,
                    "building_type": "Detached building", "floors": 1, "roof_type": "Mono-Pitch",
                    "roof_material": "Corrugated Iron Sheets", "wall_material": "Cement blocks",
                    "floor_material": "Sand Cement creed", "under_construction": "No",
                    "construction_year": 2021, "is_rented": "Yes", "rental_area": 2800,
                    "rent_price": 6800},
        "media": [
            {"url": _img("photo-1587293852726-70cdb56c2866"), "caption": "Warehouse floor"},
            {"url": _img("photo-1553413077-190dd305871c"), "caption": "Loading dock"},
        ],
    },
    # ------------------------------------------------ forest
    {
        "form": "forest:forest_plot",
        "reference_number": "EVR-2026-0009",
        "upi": "2/06/03/04/9001",
        "title": "2.8 hectares of mature forest at Kinigi",
        "summary": ("Mature eucalyptus stand on the approach to Volcanoes National Park. "
                    "Suitable for sustainable timber, carbon offset registration or eco-lodge "
                    "development."),
        "location": "Kinigi, Northern Province", "province": "Northern Province",
        "district": "Musanze", "sector": "Kinigi", "cell": "Nyabigoma", "village": "Bisoke",
        "latitude": -1.4708, "longitude": 29.6392, "gis_coordinates": "-1.4708, 29.6392",
        "boundary_geojson": _ring(-1.4708, 29.6392, 28_000),
        "boundary_points": _points(-1.4708, 29.6392, 28_000),
        "boundary_area_sqm": 28_000,
        "size": 28_000, "land_use": "Forest", "right_type": "Freehold",
        "intent": "sale", "price": 31_000_000, "currency": "RWF",
        "projected_yield": 6.2, "appreciation": 15,
        "tags": ["Mature stand", "Tourism corridor", "2.8 hectares"],
        "drone_footage_url": "https://cdn.evaramu.rw/drone/kinigi-forest.mp4",
        "details": {"products": ["Other"], "species": "Eucalyptus grandis", "crop_size": "Mature",
                    "coverage": "Above 75%", "stand_age": 14,
                    "topography": "Moderate slope (15–30%)",
                    "road_access": "All-weather murram", "harvest_permit": "Yes",
                    "has_fence": "No"},
        "media": [
            {"url": _img("photo-1441974231531-c6227db76b6e"), "caption": "Stand interior"},
            {"url": _img("photo-1448375240586-882707db888b"), "caption": "Canopy"},
        ],
    },
    # ------------------------------------------------ public
    {
        "form": "public:public_plot",
        "reference_number": "EVR-2026-0010",
        "title": "3,400 sqm institutional plot at Rwamagana",
        "summary": ("Serviced land zoned for institutional use — school, clinic or training "
                    "centre — with tarmac frontage and three-phase power at the boundary."),
        "location": "Rwamagana town", "province": "Eastern Province", "district": "Rwamagana",
        "sector": "Kigabiro", "cell": "Nyakariro", "village": "Munyaga",
        "latitude": -1.9487, "longitude": 30.4361, "gis_coordinates": "-1.9487, 30.4361",
        "boundary_geojson": _ring(-1.9487, 30.4361, 3400),
        "boundary_points": _points(-1.9487, 30.4361, 3400),
        "boundary_area_sqm": 3400,
        "size": 3400, "land_use": "Public", "right_type": "Leasehold — 99 years",
        "intent": "sale", "price": 88_000_000, "currency": "RWF", "appreciation": 12,
        "tags": ["Institutional", "Serviced", "Tarmac frontage"],
        "details": {"has_electricity": "Yes", "has_water": "Yes", "has_parking": "Yes",
                    "parking_material": "Gravel", "parking_capacity": 25,
                    "sewage_type": "Septic Tank", "has_fence": "Yes",
                    "fence_material": "Wired"},
        "media": [
            {"url": _img("photo-1486406146926-c627a92ad1ab"), "caption": "Plot frontage"},
            {"url": _img("photo-1497366216548-37526070297c"), "caption": "Adjacent road"},
        ],
    },
    # ------------------------------------------------ agricultural — greenhouse
    {
        "form": "agricultural:greenhouse",
        "reference_number": "EVR-2026-0011",
        "title": "Six-tunnel greenhouse operation at Rulindo",
        "summary": ("A turnkey protected-cultivation unit producing tomatoes and capsicum "
                    "year-round, with drip fertigation and a 120,000-litre reservoir."),
        "location": "Rulindo, Northern Province", "province": "Northern Province",
        "district": "Rulindo", "sector": "Base", "cell": "Gitare", "village": "Rwankeri",
        "latitude": -1.7452, "longitude": 30.0641, "gis_coordinates": "-1.7452, 30.0641",
        "boundary_geojson": _ring(-1.7452, 30.0641, 9800),
        "boundary_points": _points(-1.7452, 30.0641, 9800),
        "boundary_area_sqm": 9800,
        "size": 9800, "built_area": 2400, "land_use": "Agricultural", "right_type": "Freehold",
        "intent": "sale", "price": 96_000_000, "currency": "RWF",
        "projected_yield": 14.8, "appreciation": 10,
        "tags": ["Greenhouse", "Drip fertigation", "Year-round production"],
        "video_360_url": "https://cdn.evaramu.rw/360/rulindo-greenhouse.mp4",
        "details": {
            "greenhouse_count": 6, "covered_area": 2400, "structure_material": "Galvanised steel",
            "cover_material": "UV polythene", "condition": "Excellent", "construction_year": 2023,
            "climate_control": ["Drip fertigation", "Misting", "Ventilation fans",
                                "Shade screens"],
            "crops_grown": "Tomatoes, capsicum, cucumber",
            "soil_type": "Loam", "soil_fertility": "Very good", "soil_ph": "Neutral (6.5–7.5)",
            "soil_depth": 50, "topography": "Flat (0–5%)", "altitude": 1680,
            "erosion_control": ["Contour bunds"], "is_marshland": "No", "flood_risk": "No",
            "water_sources": ["Borehole", "Rainwater harvesting"],
            "water_reliability": "Year-round", "distance_to_water": 30,
            "irrigation": "Yes", "irrigation_type": "Drip", "irrigated_area": 0.24,
            "has_water_permit": "Yes", "road_access": "All-weather murram",
            "market_distance": "15–30 km", "has_electricity": "Yes", "land_tenure": "Freehold",
            "has_fence": "Yes", "fence_material": "Wired",
        },
        "media": [
            {"url": _img("photo-1416879595882-3373a0480b5b"), "caption": "Tunnel interior"},
            {"url": _img("photo-1592841200221-a6898f307baa"), "caption": "Crop rows"},
        ],
    },
    # ------------------------------------------------ agricultural — aquaculture
    {
        "form": "agricultural:aquaculture",
        "reference_number": "EVR-2026-0012",
        "title": "Tilapia fish farm with eight ponds at Bugesera",
        "summary": ("An established aquaculture unit with eight lined ponds, an on-site hatchery "
                    "and cold storage, ten minutes from the new airport road."),
        "location": "Nyamata, Bugesera", "province": "Eastern Province", "district": "Bugesera",
        "sector": "Nyamata", "cell": "Kayumba", "village": "Rwesero",
        "latitude": -2.1467, "longitude": 30.0937, "gis_coordinates": "-2.1467, 30.0937",
        "boundary_geojson": _ring(-2.1467, 30.0937, 16_500),
        "boundary_points": _points(-2.1467, 30.0937, 16_500),
        "boundary_area_sqm": 16_500,
        "size": 16_500, "land_use": "Agricultural", "right_type": "Freehold",
        "intent": "sale", "price": 118_000_000, "currency": "RWF",
        "projected_yield": 15.6, "appreciation": 22, "is_featured": True,
        "tags": ["Aquaculture", "Hatchery", "Airport corridor"],
        "video_360_url": "https://cdn.evaramu.rw/360/bugesera-fish.mp4",
        "details": {
            "pond_count": 8, "total_pond_area": 6400, "pond_type": "Lined (HDPE)",
            "species": "Nile tilapia, African catfish", "annual_output": 42000,
            "hatchery": "Yes",
            "soil_type": "Clay", "soil_fertility": "Moderate", "soil_ph": "Neutral (6.5–7.5)",
            "soil_depth": 80, "topography": "Flat (0–5%)", "altitude": 1350,
            "erosion_control": ["Check dams"], "is_marshland": "Yes", "flood_risk": "Yes",
            "water_sources": ["Borehole", "River / stream"], "water_reliability": "Year-round",
            "distance_to_water": 15, "irrigation": "No",
            "road_access": "Tarmac road", "market_distance": "Under 5 km",
            "has_electricity": "Yes", "land_tenure": "Freehold",
            "has_fence": "Yes", "fence_material": "Wired",
            "farm_structures": ["Cold store", "Farm office", "Water reservoir / tank",
                                "Worker housing"],
        },
        "media": [
            {"url": _img("photo-1544552866-d3ed42536cfd"), "caption": "Pond bank"},
            {"url": _img("photo-1535591273668-578e31182c4f"), "caption": "Harvest"},
        ],
    },
]
