import hashlib
import random
import smtplib
from email.message import EmailMessage
import datetime
import math
import razorpay
import numpy as np
import mysql.connector
import cv2
from pyzbar import pyzbar
import json
from encrypt_qr import decrypt_qr_app, decrypt_field_app, decrypt_cart_id_app
from mysql.connector import Error



# Razorpay credentials (replace with your actual keys)
RAZORPAY_KEY_ID = 'rzp_test_2EpPSCTb8XHFCk'           #prvt details
RAZORPAY_KEY_SECRET = 'jHxKaISFIwGZ1byoWqtzldAB' #prvt details

# Razorpay client instance
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

#log in and sign up part
def sign_up(connection, username, password, user_type):
    cursor = connection.cursor()

    # Hash the password before storing it
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    try:
        # Check if the username already exists
        check_user_query = "SELECT COUNT(*) FROM users_app WHERE user_name = %s"
        cursor.execute(check_user_query, (username,))
        (user_count,) = cursor.fetchone()

        if user_count > 0:
            return "Error: Username already exists. Please choose a different username."

        # SQL query to insert a new user
        sign_up_query = "INSERT INTO users_app (user_name, password, user_type) VALUES (%s, %s, %s)"
        sign_up_data = (username, hashed_password, user_type)

        cursor.execute(sign_up_query, sign_up_data)
        connection.commit()
        return "User signed up successfully."

    except Exception as e:
        connection.rollback()
        # You might want to log the error here
        print(f"Error: {str(e)}")
        return f"An error occurred: {str(e)}"

    finally:
        cursor.close()

def sign_up_driver(connection, username, password, user_type, driver_org):
    cursor = connection.cursor()

    # Hash the password before storing it
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    try:
        # Check if the username already exists
        check_user_query = "SELECT COUNT(*) FROM users_app WHERE user_name = %s"
        cursor.execute(check_user_query, (username,))
        (user_count,) = cursor.fetchone()

        if user_count > 0:
            return "Error: Username already exists. Please choose a different username."

        # SQL query to insert a new user
        sign_up_query = "INSERT INTO users_app (user_name, password, user_type, driver_org) VALUES (%s, %s, %s, %s)"
        sign_up_data = (username, hashed_password, user_type, driver_org)

        cursor.execute(sign_up_query, sign_up_data)
        connection.commit()
        return "User signed up successfully."

    except Exception as e:
        connection.rollback()
        # You might want to log the error here
        print(f"Error: {str(e)}")
        return f"An error occurred: {str(e)}"

    finally:
        cursor.close()

def log_in(connection, username, password):
    cursor = connection.cursor()

    # Hash the entered password to match it with the stored one
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    # SQL query to find the user
    log_in_query = "SELECT * FROM users_app WHERE user_name = %s AND password = %s"
    log_in_data = (username, hashed_password)

    cursor.execute(log_in_query, log_in_data)
    user = cursor.fetchone()

    cursor.close()

    if user:
        # Return the unique user ID and a success status
        return {'status': 'success', 'generated_unique_id': user[0]}
    else:
        # Return an error message if login fails
        return {'status': 'failure', 'message': 'Error: Incorrect username or password.'}


def otpverification(to_mail):
    otp = ""
    for i in range(6):
        otp += str(random.randint(0,9))
    print(otp)
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()

    from_mail = 'nirvanahealthchain@gmail.com'
    server.login(from_mail, "cfev fhqu jfih mvkx")
    msg = EmailMessage()
    msg['Subject'] = "OTP Verification"
    msg['From'] = from_mail
    msg['To'] = to_mail
    msg.set_content("Your OTP is: " + otp)
    server.send_message(msg)

    print("email sent")
    start=datetime.datetime.now()

    return otp, start

def verify(otp, start, user_otp):
    end= datetime.datetime.now()
    if (end-start).total_seconds()<300:
        if user_otp==otp:
            return "verification successfull"
        else:
            return "wrong otp"
    else:
        return "exceeded time"

#location part

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

#nearest stores

def get_all_products(connection, user_id):
    cursor = connection.cursor()

    query = ("""
        SELECT products.id, products.name, products.price_per_unit, uom_table.uom_name, 
               products.quantity_of_uom, products.category, products.exp_date, 
               products.shelf_num, products.picture_of_the_prod, products.description
        FROM products
        INNER JOIN uom_table ON products.uom_id = uom_table.uom_id
        WHERE products.user_id = %s
    """)

    # Execute the query with the provided user_id
    cursor.execute(query, (user_id,))

    response = []
    for (id, name, price_per_unit, uom_name, quantity_of_uom, category, exp_date, shelf_num, picture_of_the_prod,
         description) in cursor:
        response.append({
            'product_id': id,
            'name': name,
            'price_per_unit': price_per_unit,
            'uom_name': uom_name,
            'quantity_of_uom': quantity_of_uom,
            'category': category,
            'exp_date': exp_date,
            'shelf_num': shelf_num,
            'picture_of_the_prod': picture_of_the_prod,
            'description': description
        })

    return response

# Function to fetch order details by user_id
def fetch_orders_by_user_id(connection, user_id):
    try:
        cursor = connection.cursor(dictionary=True)

        # SQL query to fetch order details
        query = """
            SELECT order_id, customer_name, date_time, status, total, user_id, consumer_id 
            FROM orders_table 
            WHERE consumer_id = %s
        """
        cursor.execute(query, (user_id,))
        results = cursor.fetchall()

        return results

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return {"error": "Database query failed"}
    finally:
        # Cleanup
        if cursor:
            cursor.close()



#decode qr for app
def get_encryption_key(connection, cart_id):
    """
    Get encryption key from database with improved error handling
    """
    try:
        if not connection.is_connected():
            print("Error: Database connection failed")
            return None

        cursor = connection.cursor()
        query = "SELECT encryption_key FROM encryption_keys WHERE cart_id = %s"
        cursor.execute(query, (cart_id,))
        result = cursor.fetchone()

        if not result:
            print(f"Error: No encryption key found for cart_id: {cart_id}")
            return None

        return result[0]

    except Exception as e:
        print(f"Error: Failed to retrieve encryption key: {str(e)}")
        return None
    finally:
        if cursor:
            cursor.close()



def decode_qr_from_image_file(connection, image_file):
    """
    Enhanced QR code detection with better error and null value handling
    """
    try:
        print(f"Processing image file: {image_file.filename if hasattr(image_file, 'filename') else 'unknown'}")

        # Read and validate image
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        image_file.seek(0)

        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if image is None or image.size == 0 or len(image.shape) != 3:
            return {"status": "failure", "message": "Invalid image format or dimensions"}, 400

        # Convert to grayscale and try multiple decode attempts
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        qr_codes = pyzbar.decode(gray)

        if not qr_codes:
            # Try with different thresholds
            for threshold in [127, 100]:
                _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
                qr_codes = pyzbar.decode(binary)
                if qr_codes:
                    break

        if not qr_codes:
            return {"status": "failure", "message": "No QR code found in image"}, 404

        for qr_code in qr_codes:
            try:
                qr_data = qr_code.data.decode("utf-8")
                if qr_code.type != "QRCODE":
                    continue

                qr_data_json = json.loads(qr_data)
                cart_id = qr_data_json.get("cart_id")
                if not cart_id:
                    continue

                # Decrypt cart_id first
                decrypted_cart_id = decrypt_cart_id_app(cart_id)
                if not decrypted_cart_id or "cart_id" not in decrypted_cart_id:
                    continue

                cart_id = decrypted_cart_id["cart_id"]
                encryption_key = get_encryption_key(connection, cart_id)
                if not encryption_key:
                    continue

                final_decrypted_data = decrypt_qr_app(cart_id, qr_data, encryption_key)
                if final_decrypted_data:
                    return {"status": "success", "decrypted_data": final_decrypted_data}, 200

            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error processing QR code: {str(e)}")
                continue

        return {"status": "failure", "message": "No valid QR code found"}, 404

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return {"status": "failure", "message": str(e)}, 500

def get_location_from_met_add(connection, cart_id):
    try:
        cursor = connection.cursor(dictionary=True)

        # Query to fetch addresses from transactions
        fetch_transaction_query = """
        SELECT manu_add, whole_add, ret_add FROM transactions WHERE cart_id = %s
        """
        cursor.execute(fetch_transaction_query, (cart_id,))
        transaction_result = cursor.fetchone()
        print(transaction_result)

        if not transaction_result:
            raise ValueError(f"No transaction found with cart_id {cart_id}")

        manu_add = transaction_result['manu_add']
        whole_add = transaction_result['whole_add']
        ret_add = transaction_result['ret_add']
        print(manu_add,  whole_add,  ret_add)

        # Query to fetch latitudes and longitudes from users
        fetch_users_query = """
        SELECT user_type, user_lat, user_long FROM users 
        WHERE metamask_add = %s OR metamask_add = %s OR metamask_add = %s
        """
        cursor.execute(fetch_users_query, (manu_add, whole_add, ret_add))
        user_results = cursor.fetchall()
        print(user_results)

        if not user_results:
            raise ValueError("No matching addresses found in users table")

        result = {}
        for user in user_results:
            if user['user_type'] == 'manufacturer':
                result[user['user_type']] = {
                    'manufacturer_lat': user['user_lat'],
                    'manufacturer_long': user['user_long']
                }
            elif user['user_type'] == 'wholesaler':
                result[user['user_type']] = {
                    'wholesaler_lat': user['user_lat'],
                    'wholesaler_long': user['user_long']
                }
            if user['user_type'] == 'retailer':
                result[user['user_type']] = {
                    'retailer_lat': user['user_lat'],
                    'retailer_long': user['user_long']
                }

        return result

    except Error as e:
        print(f"Error: {e}")
        return None
    finally:
        cursor.close()


#consumer order cod
def insert_order_consumer(connection, order, user_id, consumer_id):
    cursor = connection.cursor()

    try:
        # Step 1: Insert into the orders_table (initially total is set to 0)
        order_query = """
            INSERT INTO orders_table (customer_name, total, date_time, phone_num, user_id, consumer_id, payment_method)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        order_data = (
            order['customer_name'],
            0,  # Placeholder for total, will be updated later
            datetime.datetime.now(),  # Ensure datetime is imported
            order['phone_num'],
            order['payment_method'],
            user_id,
            consumer_id
        )

        # Execute the order query
        cursor.execute(order_query, order_data)

        # Get the last inserted ID (order ID)
        order_id = cursor.lastrowid
        print(order_id)

        total_price = 0  # Initialize total price for the order

        # Step 2: Process each order detail
        for detail in order['order_details']:
            # Query to get the price_per_unit and quantity from products table
            fetch_price_query = "SELECT price_per_unit, quantity_of_uom FROM products WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))
            result = cursor.fetchone()

            # Check if result is None
            if result is None:
                raise ValueError(f"Product with ID {detail['product_id']} not found in products table.")

            price_per_unit, current_quantity = result  # Get price and current stock

            # Check if there's enough stock
            if current_quantity < float(detail['quantity']):
                raise ValueError(f"Insufficient stock for product ID {detail['product_id']}.")

            # Calculate total price for this detail
            total_price_for_detail = float(detail['quantity']) * price_per_unit
            total_price += total_price_for_detail

            # Step 3: Insert into order_details table
            order_details_query = """
                INSERT INTO order_details (order_id, product_id, quantity, total_price, price_per_unit)
                VALUES (%s, %s, %s, %s, %s)
            """

            cursor.execute(order_details_query, (
                order_id,
                int(detail['product_id']),
                float(detail['quantity']),
                total_price_for_detail,
                price_per_unit
            ))

        # Step 4: Update the total price in orders_table
        update_total_query = """
            UPDATE orders_table 
            SET total = %s 
            WHERE order_id = %s
        """
        cursor.execute(update_total_query, (total_price, order_id))

        # Step 5: Update the quantity in products table
        update_query = """
            UPDATE products 
            SET quantity_of_uom = quantity_of_uom - %s 
            WHERE id = %s
        """
        products_quantity_data = [(float(detail['quantity']), detail['product_id']) for detail in order['order_details']]
        cursor.executemany(update_query, products_quantity_data)

        # Commit the transaction
        connection.commit()
        cursor.close()

        # Return the order ID
        return order_id

    except Exception as e:
        # Rollback in case of an error
        connection.rollback()
        return str(e)

#razorpay order

def razorpay_order_consumer(connection, order, user_id, consumer_id):
    cursor = connection.cursor()

    try:
        # Step 1: Calculate total price
        total_price = 0
        print(f"order:{order}")
        print(f"user_id:{user_id}")
        print(f"consumer_id:{consumer_id}")

        for detail in order['order_details']:
            fetch_price_query = "SELECT price_per_unit, quantity_of_uom FROM products WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))
            result = cursor.fetchone()

            if result is None:
                raise ValueError(f"Product with ID {detail['product_id']} not found in products table.")

            price_per_unit, current_quantity = result

            if current_quantity < float(detail['quantity']):
                raise ValueError(f"Insufficient stock for product ID {detail['product_id']}.")

            total_price_for_detail = float(detail['quantity']) * price_per_unit
            total_price += total_price_for_detail

        # Add convenience fee and delivery charge
        convenience_fee = (10/100)*total_price
        delivery_charge = (30/100)*total_price
        final_total = total_price + convenience_fee + delivery_charge

        # Step 2: Create Razorpay order (but do not commit the database yet)
        if order['payment_method'].lower() == 'online':
            razorpay_order = razorpay_client.order.create({
                "amount": int(final_total * 100),  # Amount in paise
                "currency": "INR",
                "receipt": f"temp_order_{datetime.datetime.now().timestamp()}",
                "notes": {
                    "customer_name": order['customer_name']
                }
            })

            # Return Razorpay order details to the frontend
            return {
                "razorpay_order_id": razorpay_order['id'],
                "total_amount": final_total,
                "convenience_fee": convenience_fee,
                "delivery_charge": delivery_charge,
                "temp_order_data": {
                    "order": order,
                    "user_id": user_id,
                    "consumer_id": consumer_id,
                    "final_total": final_total
                }
            }

        raise ValueError("Payment method is not supported.")

    except Exception as e:
        connection.rollback()
        return str(e)
    finally:
        if 'connection' in locals():
            cursor.close()




def insert_order_to_database(connection, temp_order_data, razorpay_order_id, razorpay_payment_id):
    cursor = connection.cursor()
    try:
        order = temp_order_data['order']
        user_id = temp_order_data['user_id']
        consumer_id = temp_order_data['consumer_id']
        final_total = temp_order_data['final_total']

        # Step 1: Insert into the orders_table
        order_query = """
            INSERT INTO orders_table (customer_name, total, date_time, phone_num, user_id, consumer_id, payment_method, razorpay_order_id, razorpay_payment_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(order_query, (
            order['customer_name'],
            final_total,
            datetime.datetime.now(),
            order['phone_num'],
            user_id,
            consumer_id,
            order['payment_method'],
            razorpay_order_id,
            razorpay_payment_id
        ))

        order_id = cursor.lastrowid

        # Step 2: Insert order details
        for detail in order['order_details']:
            order_details_query = """
                INSERT INTO order_details (order_id, product_id, quantity, total_price, price_per_unit)
                VALUES (%s, %s, %s, %s, %s)
            """
            fetch_price_query = "SELECT price_per_unit FROM products WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))
            price_per_unit = cursor.fetchone()[0]

            total_price_for_detail = float(detail['quantity']) * price_per_unit

            cursor.execute(order_details_query, (
                order_id,
                detail['product_id'],
                float(detail['quantity']),
                total_price_for_detail,
                price_per_unit
            ))

        # Step 3: Update product quantities
        update_query = """
            UPDATE products 
            SET quantity_of_uom = quantity_of_uom - %s 
            WHERE id = %s
        """
        products_quantity_data = [(float(detail['quantity']), detail['product_id']) for detail in order['order_details']]
        cursor.executemany(update_query, products_quantity_data)

        # Commit the transaction
        connection.commit()

        return order_id

    except Exception as e:
        connection.rollback()
        raise e


def get_supply_chain_data(connection, cart_id):
    """
    Fetches and compiles supply chain data including authorized retailers,
    participant details, and product information.

    Args:
        connection: Database connection object
        cart_id: String identifier for the cart

    Returns:
        dict: Compiled supply chain data including participants and products
    """
    try:
        cursor = connection.cursor(dictionary=True)

        # Step 1: Fetch transaction data and authorized retailers
        fetch_transaction_query = """
        SELECT manu_add, whole_add, ret_add, authorised 
        FROM transactions 
        WHERE cart_id = %s
        """
        cursor.execute(fetch_transaction_query, (cart_id,))
        transaction_data = cursor.fetchone()

        if not transaction_data:
            raise ValueError(f"No transaction found for cart_id: {cart_id}")

        # Parse authorized retailers JSON
        authorized_json = json.loads(transaction_data['authorised'])
        authorized_cart_ids = [entry['cart_id'] for entry in authorized_json.values()]

        # Step 2: Fetch retailer addresses for authorized cart IDs
        authorized_retailers_query = """
        SELECT cart_id, ret_add 
        FROM transactions 
        WHERE cart_id IN (%s)
        """
        format_strings = ','.join(['%s'] * len(authorized_cart_ids))
        cursor.execute(authorized_retailers_query % format_strings, tuple(authorized_cart_ids))
        retailer_data = cursor.fetchall()

        # Get unique retailer addresses
        retailer_addresses = list(set(row['ret_add'] for row in retailer_data if row['ret_add']))

        # Create authorized retailers dictionary
        authorized_retailers = {
            str(idx): addr
            for idx, addr in enumerate(retailer_addresses)
        }

        # Step 3: Fetch participant details (retailers, manufacturer, wholesaler)
        all_addresses = retailer_addresses + [
            transaction_data['manu_add'],
            transaction_data['whole_add']
        ]
        all_addresses = [addr for addr in all_addresses if addr]

        participants_query = """
        SELECT user_id, generated_unique_id, user_lat, user_long, metamask_add, user_type 
        FROM users 
        WHERE metamask_add IN (%s)
        """
        format_strings = ','.join(['%s'] * len(all_addresses))
        cursor.execute(participants_query % format_strings, tuple(all_addresses))
        participant_details = cursor.fetchall()

        # Create mapping between metamask addresses and user_ids
        address_to_userid = {
            p['metamask_add']: p['user_id']
            for p in participant_details
        }

        # Create mapping between cart_ids and retailer user_ids
        cart_to_userid = {}
        for row in retailer_data:
            if row['ret_add'] and row['ret_add'] in address_to_userid:
                cart_to_userid[row['cart_id']] = address_to_userid[row['ret_add']]

        # Step 4: Fetch products from all authorized carts
        cart_products_query = """
        SELECT cart_id, products 
        FROM cart_whole 
        WHERE cart_id IN (%s)
        """
        format_strings = ','.join(['%s'] * len(authorized_cart_ids))
        cursor.execute(cart_products_query % format_strings, tuple(authorized_cart_ids))
        cart_data_all = cursor.fetchall()

        if not cart_data_all:
            raise ValueError(f"No carts found for authorized cart IDs")

        # Collect all product IDs across all carts
        all_products_by_cart = {}
        all_product_ids = set()

        for cart in cart_data_all:
            products_json = json.loads(cart['products'])
            all_products_by_cart[cart['cart_id']] = products_json
            for item in products_json.values():
                all_product_ids.add(item['product_id'])

        # Step 5: Fetch product details
        products_query = """
        SELECT id, name, price_per_unit, category, 
               exp_date, shelf_num, picture_of_the_prod, description, 
               uom_id, user_id
        FROM products_whole 
        WHERE id IN (%s)
        """
        format_strings = ','.join(['%s'] * len(all_product_ids))
        cursor.execute(products_query % format_strings, tuple(all_product_ids))
        product_details = cursor.fetchall()

        # Compile final response
        response = {
            "manufacturer_add": transaction_data['manu_add'],
            "wholesaler_add": transaction_data['whole_add'],
            "authorised_retailers": authorized_retailers,
            "participants": {
                "manufacturer": next(
                    (p for p in participant_details if p['user_type'] == 'manufacturer'),
                    None
                ),
                "wholesaler": next(
                    (p for p in participant_details if p['user_type'] == 'wholesaler'),
                    None
                ),
                "retailers": [
                    p for p in participant_details if p['user_type'] == 'retailer'
                ]
            },
            "cart_products": {
                cart_to_userid.get(cart_id, cart_id): {  # Use retailer user_id if available, fall back to cart_id
                    str(idx): {
                        "product_details": {
                            **next(
                                (p for p in product_details if p['id'] == product_data['product_id']),
                                {}
                            ),
                            "quantity": product_data['quantity']  # Override with quantity from cart
                        }
                    }
                    for idx, product_data in cart_products.items()
                }
                for cart_id, cart_products in all_products_by_cart.items()
                if cart_id in cart_to_userid  # Only include carts that have an associated retailer
            }
        }

        return {"status": "success", "data": response}, 200

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return {"status": "error", "message": "Invalid JSON data"}, 400
    except ValueError as e:
        print(f"Validation error: {str(e)}")
        return {"status": "error", "message": str(e)}, 404
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"status": "error", "message": "Internal server error"}, 500
    finally:
        cursor.close()
