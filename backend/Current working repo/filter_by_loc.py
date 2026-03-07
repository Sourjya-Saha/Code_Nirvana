import math

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on the Earth's surface using the Haversine formula.
    Args:
        lat1 (float): Latitude of the first point in decimal degrees.
        lon1 (float): Longitude of the first point in decimal degrees.
        lat2 (float): Latitude of the second point in decimal degrees.
        lon2 (float): Longitude of the second point in decimal degrees.
    Returns:
        float: Distance between the two points in kilometers.
    """
    R = 6371  # Earth radius in kilometers
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_users_within_radius(connection, radius, lat, lon):
    """
    Fetch users of type 'retailer' within a given radius from a specified point.
    Args:
        connection: Database connection object.
        radius (float): Radius in kilometers.
        lat (float): Latitude of the central point in decimal degrees.
        lon (float): Longitude of the central point in decimal degrees.
    Returns:
        dict: A dictionary of users within the radius, keyed by user_id.
    """
    result = {}

    try:
        cursor = connection.cursor()
        # Fetch only the required columns
        query = """
        SELECT user_id, user_lat, user_long, generated_unique_id
        FROM users
        WHERE user_type = 'retailer'
        """
        cursor.execute(query)
        users_data = cursor.fetchall()

        for retailer in users_data:
            # Ensure correct access to fields based on cursor type
            retailer_id = retailer["user_id"] if isinstance(retailer, dict) else retailer[0]
            retailer_lat = retailer["user_lat"] if isinstance(retailer, dict) else retailer[1]
            retailer_long = retailer["user_long"] if isinstance(retailer, dict) else retailer[2]
            retailer_unique_id = retailer["generated_unique_id"] if isinstance(retailer, dict) else retailer[3]

            # Calculate distance using the Haversine formula
            distance = haversine(lat, lon, retailer_lat, retailer_long)

            # Check if the user is within the radius
            if distance <= radius:
                result[retailer_id] = {
                    "user_lat": retailer_lat,
                    "user_long": retailer_long,
                    "generated_unique_id": retailer_unique_id,
                    "distance_km": distance
                }

    except Exception as e:
        print(f"Error fetching users: {e}")

    return result
