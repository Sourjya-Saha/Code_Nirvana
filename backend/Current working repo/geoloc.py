import eventlet
eventlet.monkey_patch()

import math
from datetime import datetime, timezone
from typing import Dict, Any, List
from mysql.connector import connect, Error
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import json
import traceback
import logging
from sympy.codegen import Print

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=60,  # Increase ping timeout
    ping_interval=25, # Adjust ping interval
    async_mode='eventlet'  # Use eventlet for better WebSocket support
)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'april@1904',
    'database': 'drug_inventory'
}


class DatabaseManager:
    @staticmethod
    def get_connection():
        return connect(**DB_CONFIG)

    @staticmethod
    def fetch_route_data(cart_id):
        query = "SELECT route_data FROM route_status WHERE cart_id = %s"
        try:
            with DatabaseManager.get_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, (cart_id,))
                    result = cursor.fetchone()  # Fetch the first matching row
                    return result['route_data'] if result else None
        except Exception as e:
            # Log the error for debugging purposes
            print(f"Error fetching route data for cart_id {cart_id}: {e}")
            return None

    @staticmethod
    def fetch_active_route(cart_id):
        query = """
                SELECT cart_id, route_data, status
                FROM route_status 
                WHERE cart_id = %s AND status = 'ACTIVE'
            """
        try:
            with DatabaseManager.get_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, (cart_id,))
                    return cursor.fetchone()  # Fetch the active route row
        except Exception as e:
            print(f"Error fetching active route for cart_id {cart_id}: {e}")
            return None

    @staticmethod
    def get_shipment_participants(cart_id: str) -> Dict[str, str]:
        """Fetch all participants involved in a shipment."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # First query: fetch manu_add, whole_add, ret_add, and driver_id
                query1 = """
                    SELECT manu_add, whole_add, ret_add, driver_id  
                    FROM transactions 
                    WHERE cart_id = %s
                """
                cursor.execute(query1, (cart_id,))
                result = cursor.fetchone()

                if not result:
                    return None

                addresses = [result["manu_add"], result["whole_add"], result["ret_add"]]
                placeholders = ', '.join(['%s'] * len(addresses))

                # Second query: fetch unique IDs
                query2 = f"""
                    SELECT metamask_add, generated_unique_id 
                    FROM users 
                    WHERE metamask_add IN ({placeholders})
                """
                cursor.execute(query2, addresses)
                unique_ids = {row["metamask_add"]: row["generated_unique_id"]
                            for row in cursor.fetchall()}

                return {
                    "manufacturer_id": unique_ids.get(result["manu_add"]),
                    "wholesaler_id": unique_ids.get(result["whole_add"]),
                    "retailer_id": unique_ids.get(result["ret_add"]),
                    "driver_id": result["driver_id"]
                }

        except Error as e:
            print(f"Database error: {e}")
            return None

    @staticmethod
    def save_route(cart_id: str, route_data: Dict[str, Any]) -> bool:
        """Save or update route data in the route_status table."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # Check if route exists
                check_query = "SELECT 1 FROM route_status WHERE cart_id = %s"
                cursor.execute(check_query, (cart_id,))
                exists = cursor.fetchone()

                if exists:
                    # Update existing route
                    update_query = """
                            UPDATE route_status 
                            SET route_data = %s,
                                status = 'ACTIVE',
                                updated_at = NOW()
                            WHERE cart_id = %s
                        """
                    cursor.execute(update_query, (json.dumps(route_data), cart_id))
                else:
                    # Insert new route
                    insert_query = """
                            INSERT INTO route_status 
                            (cart_id, route_data, status, current_location, estimated_delivery_time)
                            VALUES (%s, %s, 'ACTIVE', %s, %s)
                        """
                    # Get start location and estimated delivery time from route data
                    start_location = json.dumps(route_data['waypoints'][0]) if route_data.get('waypoints') else None
                    estimated_delivery = route_data.get('estimated_delivery_time')

                    cursor.execute(insert_query, (
                        cart_id,
                        json.dumps(route_data),
                        start_location,
                        estimated_delivery
                    ))

                conn.commit()
                return True

        except Error as e:
            print(f"Database error saving route: {e}")
            return False

    @staticmethod
    def update_driver_location(cart_id: str, location_data: Dict[str, Any]) -> bool:
        """Update current location in route_status table."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                update_query = """
                        UPDATE route_status 
                        SET current_location = %s,
                            updated_at = NOW()
                        WHERE cart_id = %s
                    """
                cursor.execute(update_query, (json.dumps(location_data), cart_id))
                conn.commit()
                return True

        except Error as e:
            print(f"Database error updating location: {e}")
            return False

    @staticmethod
    def verify_shipment_access(cart_id: str, user_id: str, role: str) -> bool:
        """Verify if a user has access to view a specific shipment."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                if role == 'driver':
                    driver_query = """
                            SELECT 1
                            FROM transactions
                            WHERE cart_id = %s AND driver_id = %s
                            LIMIT 1
                        """
                    cursor.execute(driver_query, (cart_id, user_id))
                    if cursor.fetchone():
                        return True

                # First get the metamask address for this user_id
                user_query = """
                            SELECT metamask_add
                            FROM users
                            WHERE generated_unique_id = %s
                        """
                cursor.execute(user_query, (user_id,))
                user_result = cursor.fetchone()

                if not user_result:
                    return False

                user_address = user_result['metamask_add']

                # Now verify access using metamask address
                query = """
                            SELECT 1
                            FROM transactions
                            WHERE cart_id = %s
                            AND (manu_add = %s 
                                 OR whole_add = %s 
                                 OR ret_add = %s)
                            LIMIT 1
                        """
                cursor.execute(query, (cart_id, user_address, user_address, user_address))
                result = cursor.fetchone()
                return bool(result)
        except Error as e:
            print(f"Database error: {e}")
            return False

    @staticmethod
    def update_route_deviation(cart_id, new_deviation_data):
        """
        Update the deviation data for a specific route.
        Args:
            cart_id (str): The ID of the cart/route
            new_deviation_data (dict): The deviation data to update.
                                     Should include either 'start' or 'end' key.
        """
        try:
            with DatabaseManager.get_connection() as conn:
                with conn.cursor() as cur:
                    # First, fetch the current deviation data
                    cur.execute("""
                        SELECT deviation_data
                        FROM route_status
                        WHERE cart_id = %s AND status = 'ACTIVE'
                    """, (cart_id,))
                    result = cur.fetchone()

                    if not result:
                        print(f"No active route found for cart {cart_id}")
                        return False

                    # Initialize or parse existing deviation_data
                    try:
                        deviation_data = json.loads(result[0]) if result[0] else []
                        if not isinstance(deviation_data, list):
                            deviation_data = []
                    except (json.JSONDecodeError, TypeError):
                        deviation_data = []

                    if 'start' in new_deviation_data:
                        # Check if we have an incomplete record (one without an end)
                        has_incomplete_record = any(
                            'start' in record and 'end' not in record
                            for record in deviation_data
                        )

                        if not has_incomplete_record:
                            # Only add new start if there's no incomplete record
                            new_record = {
                                "start": new_deviation_data['start']
                            }
                            deviation_data.append(new_record)

                    elif 'end' in new_deviation_data:
                        # Find the most recent record without an end
                        for i in range(len(deviation_data) - 1, -1, -1):
                            if 'start' in deviation_data[i] and 'end' not in deviation_data[i]:
                                deviation_data[i]['end'] = new_deviation_data['end']
                                break

                    # Clean up any malformed records
                    cleaned_deviation_data = []
                    for record in deviation_data:
                        if 'start' in record:
                            cleaned_record = {'start': record['start']}
                            if 'end' in record:
                                cleaned_record['end'] = record['end']
                            cleaned_deviation_data.append(cleaned_record)

                    # Update deviation history
                    deviation_data_json = json.dumps(cleaned_deviation_data)
                    cur.execute("""
                        UPDATE route_status
                        SET deviation_data = %s
                        WHERE cart_id = %s AND status = 'ACTIVE'
                    """, (deviation_data_json, cart_id))

                    conn.commit()
                    return True

        except Exception as e:
            print(f"Error updating route deviation: {str(e)}")
            traceback.print_exc()
            return False

    @staticmethod
    def get_shipment_details(cart_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch detailed information about a specific shipment."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # First get the metamask address for this user_id
                user_query = """
                    SELECT metamask_add
                    FROM users
                    WHERE generated_unique_id = %s
                """
                cursor.execute(user_query, (user_id,))
                user_result = cursor.fetchone()

                if not user_result:
                    return None

                user_address = user_result['metamask_add']

                # Now fetch shipment details using the metamask address
                query = """
                    SELECT t.*,
                           r.current_location,
                           r.status,
                           r.estimated_delivery_time,
                           r.route_data,
                           u.user_name as user_name
                    FROM transactions t
                    LEFT JOIN route_status r ON t.cart_id = r.cart_id
                    LEFT JOIN users_app u ON t.driver_id = u.generated_unique_id
                    WHERE t.cart_id = %s
                    AND (t.manu_add = %s 
                         OR t.whole_add = %s 
                         OR t.ret_add = %s 
                         OR t.driver_id = %s)
                """
                cursor.execute(query, (cart_id, user_address, user_address, user_address, user_id))
                result = cursor.fetchone()
                return result if result else None

        except Error as e:
            print(f"Database error: {e}")
            return None

    @staticmethod
    def update_route_status(cart_id: str, status: str) -> bool:
        """Update the status of a route in the route_status table."""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                update_query = """
                    UPDATE route_status 
                    SET status = %s,
                        updated_at = NOW()
                    WHERE cart_id = %s
                """
                cursor.execute(update_query, (status, cart_id))
                conn.commit()
                return True
        except Error as e:
            print(f"Database error updating route status: {e}")
            return False





class StateManager:
    def __init__(self):
        self.connected_users: Dict[str, Dict[str, Any]] = {}
        self.active_routes: Dict[str, Dict[str, Any]] = {}
        self.cart_rooms: Dict[str, List[str]] = {}  # Maps cart_id to list of participant IDs
        self.user_rooms: Dict[str, List[str]] = {}  # Maps user_id to list of cart_ids they're involved in

    def create_cart_room(self, cart_id: str, participants: Dict[str, str]):
        """Create a room for a specific cart and its participants."""
        self.cart_rooms[cart_id] = list(participants.values())
        for user_id in participants.values():
            if user_id not in self.user_rooms:
                self.user_rooms[user_id] = []
            self.user_rooms[user_id].append(cart_id)

    def calculate_distance(self, point1: Dict[str, float], point2: Dict[str, float]) -> float:
        """Calculate distance between two geographic points using Haversine formula."""
        R = 6371e3
        φ1 = math.radians(point1['lat'])
        φ2 = math.radians(point2['lat'])
        Δφ = math.radians(point2['lat'] - point1['lat'])
        Δλ = math.radians(point2['lng'] - point1['lng'])

        a = (math.sin(Δφ / 2) * math.sin(Δφ / 2) +
             math.cos(φ1) * math.cos(φ2) *
             math.sin(Δλ / 2) * math.sin(Δλ / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c


# Global state
state = StateManager()


@socketio.on('connect')
def handle_connect():
    """Handle new socket connection with access verification and error handling."""
    try:
        print(f"Client attempting connection: {request.sid}")
        user_id = request.args.get('user_id')
        cart_id = request.args.get('cart_id')
        role = request.args.get('role')

        print(f"Connection attempt with user_id: {user_id}, cart_id: {cart_id}, role: {role}")

        if not user_id or not cart_id or not role:
            print("Missing connection parameters")
            return False

        try:
            has_access = DatabaseManager.verify_shipment_access(cart_id, user_id, role)
        except Exception as db_error:
            print(f"Database error during access verification: {str(db_error)}")
            return False

        if has_access:
            try:
                join_room(cart_id)
                state.connected_users[request.sid] = {
                    'user_id': user_id,
                    'cart_id': cart_id,
                    'role': role,
                    'last_update': datetime.now(timezone.utc)
                }
                print(f"Client successfully connected and joined room: {request.sid}")
                return True
            except Exception as room_error:
                print(f"Error joining room: {str(room_error)}")
                return False

        print(f"Access denied for client: {request.sid}")
        return False

    except Exception as e:
        print(f"Unexpected error in handle_connect: {str(e)}")
        traceback.print_exc()
        return False


@socketio.on('route-created')
def handle_route_creation(data):
    """Handle route creation event with cart-specific broadcasting and database storage."""
    print('route-created method is calling')
    cart_id = data.get('cart_id')
    route_data = data.get('route_data')
    print(f"RouteData:{route_data}")

    # First check if an active route already exists
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT 1
                FROM route_status
                WHERE cart_id = %s
                AND status = 'ACTIVE'
            """
            cursor.execute(query, (cart_id,))
            existing_route = cursor.fetchone()

            if existing_route:
                emit('route-error', {
                    'message': 'Active route already exists for this shipment',
                    'cart_id': cart_id
                }, to=cart_id)
                print("Exsisting route")
                return

    except Error as e:
        print(f"Database error checking existing route: {e}")
        emit('route-error', {
            'message': 'Failed to check existing route',
            'cart_id': cart_id
        }, to=cart_id)
        return

    # Fetch participants from database
    participants = DatabaseManager.get_shipment_participants(cart_id)
    if not participants:
        print(not participants)
        return

    # Save route to database
    if not DatabaseManager.save_route(cart_id, route_data):
        emit('route-error', {
            'message': 'Failed to save route',
            'cart_id': cart_id
        }, to=cart_id)
        print("Entered into if block")
        return

    # Create cart room if it doesn't exist
    if cart_id not in state.cart_rooms:
        state.create_cart_room(cart_id, participants)

    # Store route data in memory
    state.active_routes[cart_id] = route_data
    print(f"Actiev Route getting created{state.active_routes[cart_id]}")
    # Broadcast only to room participants
    emit('route-broadcast', {
        'cart_id': cart_id,
        'route_data': route_data
    }, to=cart_id)


@socketio.on('driver-location-update')
def handle_driver_location(data):
    """Handle driver location updates with cart-specific broadcasting and frontend-provided deviation tracking."""
    try:
        print(f"Received location update data: {data}")
        cart_id = data.get('cart_id')
        user_info = state.connected_users.get(request.sid, {})

        print(f"Processing update for cart_id: {cart_id}, user_info: {user_info}")

        if user_info.get('role') != 'driver':
            print(f"Error: Non-driver user tried to update location. Role: {user_info.get('role')}")
            return

        # Verify that the user is the driver for the shipment
        participants = DatabaseManager.get_shipment_participants(cart_id)
        print(f"Shipment participants: {participants}")

        try:
            user_id_int = int(user_info['user_id'])
            participant_values = [int(float(value)) for value in participants.values()]
            print(f"Checking authorization - user_id: {user_id_int}, valid participants: {participant_values}")
        except Exception as e:
            print(f"Error converting user IDs: {e}")
            return

        if not participants or user_id_int not in participant_values:
            print("Error: Unauthorized driver attempted location update")
            return

        # Prepare location data
        current_location = {
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'last_update': datetime.now(timezone.utc).isoformat()
        }
        print(f"Updated location data: {current_location}")

        # Save driver location to the database
        if not DatabaseManager.update_driver_location(cart_id, current_location):
            print("Error: Failed to update driver location in database")
            return

        # Handle deviation based on frontend data
        deviation_data = data.get('deviation_data')
        if deviation_data:
            print(f"Processing deviation data: {deviation_data}")

            # Update deviation info in database
            if not DatabaseManager.update_route_deviation(cart_id, deviation_data):
                print("Error: Failed to update route deviation in database")
                return

            # Check if this is a start or end of deviation
            if 'start' in deviation_data and not 'end' in deviation_data:
                print("New deviation started")
                start_data = deviation_data.get('start', {})
                current_point = start_data.get('location', {})
                distance = start_data.get('distance', 0)

                # Emit deviation notification
                emit('route-deviation', {
                    'cart_id': cart_id,
                    'type': 'start',
                    'location': current_point,
                    'distance': distance,
                    'message': f"Driver deviated {round(distance)}m from planned route"
                }, to=cart_id)

            elif 'end' in deviation_data:
                print("Deviation ended")
                end_data = deviation_data.get('end', {})
                end_point = end_data.get('location', {})

                # Emit deviation end notification
                emit('route-deviation', {
                    'cart_id': cart_id,
                    'type': 'end',
                    'location': end_point,
                    'distance': 0,
                    'message': "Driver returned to route"
                }, to=cart_id)

        # Broadcast location update to clients in the cart room
        print(f"Broadcasting location update to room: {cart_id}")
        emit('driver-location-update', current_location, to=cart_id)
        print("Location update successfully processed")

    except Exception as e:
        print(f"Error in handle_driver_location: {str(e)}")
        print(traceback.format_exc())


@socketio.on('request-initial-state')
def handle_initial_state_request(data):
    """Send initial state to newly connected clients."""
    user_info = state.connected_users.get(request.sid, {})
    user_id = user_info.get('user_id')
    cart_id = data.get('cart_id')

    # Verify user is part of the shipment
    participants = DatabaseManager.get_shipment_participants(cart_id)

    # Convert user_id and participant values to same type for comparison
    user_id_int = int(user_id)
    participant_values = [int(float(value)) for value in participants.values()]
    print(f"Participants:{participant_values}")
    if not participants or user_id_int not in participant_values:
        return

    # Fetch route data from the route_status table
    route_data = DatabaseManager.fetch_route_data(cart_id)
    print(f"active route data:{route_data}")

    if not route_data:
        emit('error', {'message': 'No route data found for the given cart ID'})
        return

    # Send cart-specific state with fetched route data
    emit('initial-state', {
        'cart_id': cart_id,
        'route': route_data
    },to=cart_id)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    user_info = state.connected_users.get(request.sid, {})
    user_id = user_info.get('user_id')

    # Leave all rooms
    if user_id in state.user_rooms:
        for cart_id in state.user_rooms[user_id]:
            leave_room(cart_id)

    state.connected_users.pop(request.sid, None)
    print(f"Client disconnected: {request.sid}")

@socketio.on_error_default
def default_error_handler(e):
    """Default error handler for all namespaces and events."""
    print(f"SocketIO error occurred: {str(e)}")
    traceback.print_exc()


@app.route("/api/shipment/<cart_id>/participants")
def get_shipment_participants(cart_id):
    """Get all participants involved in a shipment."""
    participants = DatabaseManager.get_shipment_participants(cart_id)
    if participants:
        return jsonify(participants), 200
    return jsonify({"error": "Shipment not found"}), 404


@socketio.on('fetch-route')
def handle_route_fetch(data):
    """
    Handle route fetch requests from supply chain participants.
    Returns existing route data without creating or modifying the database.
    """
    print("This route is getting called")
    cart_id = data.get('cart_id')
    print(f"CART ID: {cart_id}")
    user_info = state.connected_users.get(request.sid, {})
    print(f"UserInfo: {user_info}")
    user_id = user_info.get('user_id')

    if not cart_id or not user_id:
        emit('route-error', {
            'message': 'Missing cart_id or user_id',
            'cart_id': cart_id
        }, to=cart_id)
        return

    # Verify user has access to this shipment
    participants = DatabaseManager.get_shipment_participants(cart_id)
    if not participants or user_id not in participants.values():
        emit('route-error', {
            'message': 'Unauthorized access to shipment',
            'cart_id': cart_id
        }, to=cart_id)
        return

    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor(dictionary=True)

            # Fetch existing route data
            query = """
                SELECT route_data, current_location, status, estimated_delivery_time
                FROM route_status
                WHERE cart_id = %s
                AND status = 'ACTIVE'
            """
            cursor.execute(query, (cart_id,))
            result = cursor.fetchone()

            if result and result['route_data']:
                # Join the cart room if not already joined
                if cart_id not in state.cart_rooms:
                    state.create_cart_room(cart_id, participants)
                join_room(cart_id)

                # Parse the JSON route data
                route_data = json.loads(result['route_data'])

                # Add additional status information
                response_data = {
                    'cart_id': cart_id,
                    'route_data': route_data,
                    'current_location': json.loads(result['current_location']) if result['current_location'] else None,
                    'status': result['status'],
                    'estimated_delivery_time': result['estimated_delivery_time'].isoformat() if result[
                        'estimated_delivery_time'] else None
                }

                # Store route in memory if not already stored
                if cart_id not in state.active_routes:
                    state.active_routes[cart_id] = route_data

                emit('route-fetched', response_data, to=cart_id)
            else:
                emit('route-error', {
                    'message': 'No active route found for this shipment',
                    'cart_id': cart_id
                }, to=cart_id)

    except Error as e:
        print(f"Database error fetching route: {e}")
        emit('route-error', {
            'message': 'Failed to fetch route data',
            'cart_id': cart_id
        }, to=cart_id)

@app.route("/api/shipment/verify-access", methods=['POST'])
def verify_shipment_access():
    """Verify if a user has access to view a specific shipment."""
    data = request.json
    cart_id = data.get('cart_id')
    user_id = data.get('user_id')
    role = data.get('role')

    if not cart_id or not user_id:
        return jsonify({
            "success": False,
            "error": "Missing cart_id or user_id"
        }), 400

    has_access = DatabaseManager.verify_shipment_access(cart_id, user_id, role)

    if has_access:
        # If authorized, fetch shipment details
        shipment = DatabaseManager.get_shipment_details(cart_id, user_id)
        return jsonify({
            "success": True,
            "authorized": True,
            "shipment": shipment
        }), 200

    return jsonify({
        "success": False,
        "authorized": False,
        "error": "Unauthorized access"
    }),403

@app.route('/update_route_status', methods=['POST'])
def update_route_status():
    try:
        print(f"successfully called", flush=True)
        data = request.json
        cart_id = data.get('cart_id')
        print(f"successfully extracted cart_id {cart_id}")


        if not cart_id:
            return jsonify({'error': 'cart_id is required'}), 400

        # Fetch the current location from route_status
        conn = DatabaseManager.get_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT current_location FROM route_status WHERE cart_id = %s",
                (cart_id,)
            )
            location_result = cursor.fetchone()
            print(f"successfully fetched location_result {location_result}")

        if not location_result:
            return jsonify({'error': 'No data found for this cart_id'}), 404

        current_location = json.loads(location_result['current_location'])
        print(f"successfully fetched current_location {current_location}")

        # Fetch the active route for the given cart_id
        route_info = DatabaseManager.fetch_active_route(cart_id)
        if not route_info:
            return jsonify({'error': 'No active route found for this cart_id'}), 404

        # Parse the route data and extract waypoints
        route_data = json.loads(route_info.get('route_data', '{}'))
        waypoints = route_data.get('waypoints', [])

        if not waypoints:
            return jsonify({'error': 'No waypoints found in route data'}), 404

        # Calculate distance to the final waypoint
        final_waypoint = waypoints[-1]
        print(f"successfully fetched final_waypoint {final_waypoint}")
        current_point = {
            'lat': current_location['latitude'],
            'lng': current_location['longitude']
        }
        distance_to_final = state.calculate_distance(current_point, final_waypoint)

        # Check if the distance to the final waypoint is within the threshold
        if distance_to_final <= 50:
            try:
                with conn.cursor() as cursor:
                    update_query = """
                        UPDATE route_status 
                        SET status = %s,
                            updated_at = NOW()
                        WHERE cart_id = %s
                    """
                    cursor.execute(update_query, ('COMPLETED', cart_id))
                    conn.commit()
                return jsonify({'message': 'Route status updated successfully'}), 200
            except Exception as e:
                return jsonify({'error': f'Database error updating route status: {e}'}), 500

        # Return if the cart is not near the final waypoint
        return jsonify({'message': 'Cart is not near the final waypoint'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':

    socketio.run(
        app,
        host='0.0.0.0',
        port=8000,
        debug=True,
        use_reloader=False,  # Disable reloader in debug mode
        allow_unsafe_werkzeug=True
    )