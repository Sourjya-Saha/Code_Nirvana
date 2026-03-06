from flask import Flask, request, jsonify, session, g, send_from_directory, send_file
from sympy.codegen.ast import continue_

from sql_connection import get_sql_connection
import mysql.connector
import json
import os
import uuid
import cv2
import io

import hashlib

import sign_up
import log_in
from pyzbar import pyzbar

import products_dao
import orders_dao
import uom_dao
from flask_cors import CORS
from submit import submit
# from bar_code_scanner import scan_barcodes
from qr_code_generator import generate_qr_code
from qr_code_scanner import scan_qr_codes
import products_manu_dao
import cart_manu_dao
from WEBSCRAPER import get_symptom_data, predict_medications, top_10_indian
import logging
import App_login
import filter_by_loc
import location_setter
import qr_consumer
import numpy as np
import datetime
from encrypt_qr import encrypt_qr, decrypt_qr
import razorpay

# Razorpay credentials (replace with your actual keys)
RAZORPAY_KEY_ID = 'rzp_test_2EpPSCTb8XHFCk'
RAZORPAY_KEY_SECRET = 'jHxKaISFIwGZ1byoWqtzldAB'

# Razorpay client instance
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))





app = Flask(__name__)

CORS(app)

app.secret_key = 'your_secret_key'

connection = get_sql_connection()

global_qr_data={}

#SQL connection
def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host='localhost',
            user='root',
            password='sourjya@1614',
            database='drug_inventory'
        )
    return g.db

@app.teardown_appcontext
def close_connection(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()






# def get_all_products(connection, user_id):
#     cursor = connection.cursor()

#     query = ("""
#         SELECT products.id, products.name, products.price_per_unit, uom_table.uom_name,
#                products.quantity_of_uom, products.category, products.exp_date,
#                products.shelf_num, products.picture_of_the_prod, products.description
#         FROM products
#         INNER JOIN uom_table ON products.uom_id = uom_table.uom_id
#         WHERE products.user_id = %s
#     """)

#     # Execute the query with the provided user_id
#     cursor.execute(query, (user_id,))

#     response = []
#     for (id, name, price_per_unit, uom_name, quantity_of_uom, category, exp_date, shelf_num, picture_of_the_prod,
#          description) in cursor:
#         response.append({
#             'product_id': id,
#             'name': name,
#             'price_per_unit': price_per_unit,
#             'uom_name': uom_name,
#             'quantity_of_uom': quantity_of_uom,
#             'category': category,
#             'exp_date': exp_date,
#             'shelf_num': shelf_num,
#             'picture_of_the_prod': picture_of_the_prod,
#             'description': description
#         })

#     return response

# @app.route('/getProducts', methods=['POST'])
# def get_products():
#     connection = get_db()
#     request_payload = request.json
#     user_id= request_payload['user_id']
#     response = products_dao.get_all_products(connection, user_id)
#     response = jsonify(response)
#     response.headers.add('Access-Control-Allow-Origin', '*')
#     return response

# # Function to fetch order details by user_id
# def fetch_orders_by_user_id(user_id):
#     try:
#         # Establish a database connection
#         connection = get_db()
#         cursor = connection.cursor(dictionary=True)

#         # SQL query to fetch order details
#         query = """
#             SELECT order_id, customer_name, date_time, status, total, user_id, consumer_id
#             FROM orders_table
#             WHERE consumer_id = %s
#         """
#         cursor.execute(query, (user_id,))
#         results = cursor.fetchall()

#         return results

#     except mysql.connector.Error as err:
#         print(f"Error: {err}")
#         return {"error": "Database query failed"}
#     finally:
#         # Cleanup
#         if cursor:
#             cursor.close()
#         if connection:
#             connection.close()

# # Flask route to fetch orders
# @app.route('/get_orders/<int:user_id>', methods=['GET'])
# def get_orders(user_id):
#     """
#     Endpoint to fetch orders for a specific user_id.
#     URL: /get_orders/<user_id>
#     """
#     orders = fetch_orders_by_user_id(user_id)

#     if "error" in orders:
#         return jsonify({"status": "failure", "message": "Failed to fetch orders"}), 500

#     if not orders:
#         return jsonify({"status": "success", "message": "No orders found", "data": []}), 200

#     return jsonify({"status": "success", "data": orders}), 200


# def get_encryption_key(cart_id):
#     # Fetch the encryption key from the database using cart_id
#     encryption_key = None
#     try:
#         connection = get_db()
#         cursor = connection.cursor()
#         if connection.is_connected():
#             cursor = connection.cursor()
#             query = "SELECT encryption_key FROM encryption_keys WHERE cart_id = %s"
#             cursor.execute(query, (cart_id,))
#             result = cursor.fetchone()
#             if result:
#                 encryption_key = result[0]
#             else:
#                 print(f"Error: No encryption key found for cart_id: {cart_id}")
#     except Exception as e:
#         print(f"Error: Failed to retrieve encryption key: {str(e)}")

#     return encryption_key


# def decode_qr_from_image_file(image_file):
#     """
#     Decodes and decrypts a QR code from an uploaded image file.
#     :param image_file: FileStorage object (uploaded file)
#     :return: Decoded and decrypted QR data or an error message
#     """
#     try:
#         # Read the uploaded file into a NumPy array
#         file_bytes = np.frombuffer(image_file.read(), np.uint8)

#         # Decode the NumPy array into an OpenCV image
#         image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

#         if image is None:
#             return {"status": "failure", "message": "Failed to decode image"}, 400

#         # Detect and decode QR codes from the image
#         qr_codes = pyzbar.decode(image)

#         # Loop through detected QR codes
#         for qr_code in qr_codes:
#             qr_data = qr_code.data.decode("utf-8")
#             qr_type = qr_code.type

#             # Only process QR codes
#             if qr_type == "QRCODE":
#                 try:
#                     # Attempt to parse the QR data as JSON (to extract cart_id)
#                     qr_data_json = json.loads(qr_data)
#                     cart_id = qr_data_json.get("cart_id")

#                     if not cart_id:
#                         return {"status": "failure", "message": "No cart_id found in the QR data"}, 400

#                     # Fetch the encryption key from the database using cart_id
#                     encryption_key = get_encryption_key(cart_id)

#                     if not encryption_key:
#                         return {"status": "failure", "message": f"No encryption key found for cart_id: {cart_id}"}, 404

#                     # Decrypt the QR data using the encryption key
#                     final_decrypted_data = decrypt_qr(qr_data, encryption_key)

#                     return {"status": "success", "decrypted_data": final_decrypted_data}, 200

#                 except json.JSONDecodeError:
#                     return {"status": "failure", "message": "QR data is not in valid JSON format"}, 400
#                 except Exception as e:
#                     return {"status": "failure", "message": f"Decryption error: {str(e)}"}, 500

#         return {"status": "failure", "message": "No QR code found in the image"}, 404

#     except Exception as e:
#         return {"status": "failure", "message": f"Error processing image: {str(e)}"}, 500

# @app.route('/decode_qr', methods=['POST'])
# def decode_qr():
#     """
#     Flask route to decode and decrypt QR code from an uploaded image file.
#     """
#     # Check if an image file is included in the request
#     if 'image' not in request.files:
#         return jsonify({"status": "failure", "message": "No image file provided"}), 400

#     try:
#         connection = get_db()
#         # Get the uploaded file
#         image_file = request.files['image']

#         # Decode the QR code
#         result, status_code = decode_qr_from_image_file(image_file)
#         print(f"the result is:{result} and the statuscode is: {status_code}")

#         if status_code != 200:
#             print("it is entering this if else")
#             return jsonify(result), status_code

#         # Parse the decrypted data
#         decrypted_data = result["decrypted_data"]
#         print(f"the decrypted_data is: {decrypted_data} after doing json.loads")

#         # Extract the cart_id
#         cart_id = int(decrypted_data["cart_id"])

#         # Get location data using cart_id
#         location_data = location_setter.get_location_from_met_add(connection, cart_id)

#         return jsonify(location_data), 200

#     except json.JSONDecodeError:
#         return jsonify({"status": "failure", "message": "Invalid decrypted data format"}), 400

#     except Exception as e:
#         return jsonify({"status": "failure", "message": "Internal server error"}), 500



# @app.route('/extractFromDoc', methods=['POST'])
# def extract_from_doc():
#     file_format = request.form.get('file_format')
#     file = request.files['file']

#     # Save the uploaded file
#     file_path = os.path.join("uploads", str(uuid.uuid4()) + ".pdf")
#     file.save(file_path)

#     # Call the submit function to extract the data
#     data, error = submit(file_path, file_format)

#     # Clean up the file after processing
#     if os.path.exists(file_path):
#         os.remove(file_path)

#     if error:
#         return jsonify({'status': 'error', 'message': error}), 500

#     # Return the extracted data as a JSON response
#     return jsonify({"message": data}), 201

# def insert_order_consumer(connection, order, user_id, consumer_id):
#     cursor = connection.cursor()

#     try:
#         # Step 1: Insert into the orders_table (initially total is set to 0)
#         order_query = """
#             INSERT INTO orders_table (customer_name, total, date_time, phone_num, user_id, consumer_id, payment_method)
#             VALUES (%s, %s, %s, %s, %s, %s, %s)
#         """
#         order_data = (
#             order['customer_name'],
#             0,  # Placeholder for total, will be updated later
#             datetime.datetime.now(),  # Ensure datetime is imported
#             order['phone_num'],
#             order['payment_method'],
#             user_id,
#             consumer_id
#         )

#         # Execute the order query
#         cursor.execute(order_query, order_data)

#         # Get the last inserted ID (order ID)
#         order_id = cursor.lastrowid
#         print(order_id)

#         total_price = 0  # Initialize total price for the order

#         # Step 2: Process each order detail
#         for detail in order['order_details']:
#             # Query to get the price_per_unit and quantity from products table
#             fetch_price_query = "SELECT price_per_unit, quantity_of_uom FROM products WHERE id = %s"
#             cursor.execute(fetch_price_query, (detail['product_id'],))
#             result = cursor.fetchone()

#             # Check if result is None
#             if result is None:
#                 raise ValueError(f"Product with ID {detail['product_id']} not found in products table.")

#             price_per_unit, current_quantity = result  # Get price and current stock

#             # Check if there's enough stock
#             if current_quantity < float(detail['quantity']):
#                 raise ValueError(f"Insufficient stock for product ID {detail['product_id']}.")

#             # Calculate total price for this detail
#             total_price_for_detail = float(detail['quantity']) * price_per_unit
#             total_price += total_price_for_detail

#             # Step 3: Insert into order_details table
#             order_details_query = """
#                 INSERT INTO order_details (order_id, product_id, quantity, total_price, price_per_unit)
#                 VALUES (%s, %s, %s, %s, %s)
#             """

#             cursor.execute(order_details_query, (
#                 order_id,
#                 int(detail['product_id']),
#                 float(detail['quantity']),
#                 total_price_for_detail,
#                 price_per_unit
#             ))

#         # Step 4: Update the total price in orders_table
#         update_total_query = """
#             UPDATE orders_table
#             SET total = %s
#             WHERE order_id = %s
#         """
#         cursor.execute(update_total_query, (total_price, order_id))

#         # Step 5: Update the quantity in products table
#         update_query = """
#             UPDATE products
#             SET quantity_of_uom = quantity_of_uom - %s
#             WHERE id = %s
#         """
#         products_quantity_data = [(float(detail['quantity']), detail['product_id']) for detail in order['order_details']]
#         cursor.executemany(update_query, products_quantity_data)

#         # Commit the transaction
#         connection.commit()
#         cursor.close()

#         # Return the order ID
#         return order_id

#     except Exception as e:
#         # Rollback in case of an error
#         connection.rollback()
#         return str(e)

# @app.route('/insert_order_consumer', methods=['POST'])
# def insert_order_consumer():
#     connection = get_db()
#     data = request.json

#     consumer_id = data.get('consumer_id')
#     user_id = data.get('user_id')
#     order_details = data.get('order_details')
#     customer_name = data.get('customer_name')
#     phone_num = data.get('phone_num')
#     payment_method = data.get('payment_method')

#     # Input validation
#     if not user_id or not order_details or not customer_name or not phone_num:
#         return jsonify({"error": "Missing required fields"}), 400

#     # Prepare order data
#     order = {
#         'customer_name': customer_name,
#         'phone_num': phone_num,
#         'payment_method': payment_method,
#         'order_details': order_details
#     }

#     order_id = insert_order_consumer(connection, order, user_id, consumer_id)

#     if isinstance(order_id, str):  # If order_id is a string, it's an error message
#         return jsonify({"error": order_id}), 500

#     return jsonify({"message": "Order created successfully", "order_id": order_id}), 201





#Razorpay payment
@app.route('/update_order_status', methods=['POST'])
def update_order_status():
    """
    Route to update the status of an order to 'paid' based on order_id.
    """
    try:
        # Get JSON data from request
        data = request.json
        if not data or 'order_id' not in data:
            return jsonify({"status": "failure", "message": "Missing order_id in request"}), 400

        order_id = data.get('order_id')

        # Establish database connection
        connection = get_db()
        cursor = connection.cursor()

        # Update the status column for the given order_id
        update_query = "UPDATE orders_table SET status = 'paid' WHERE order_id = %s"
        cursor.execute(update_query, (order_id,))
        connection.commit()

        # Check if any row was updated
        if cursor.rowcount == 0:
            return jsonify({"status": "failure", "message": "Order ID not found"}), 404

        return jsonify({"status": "success", "message": f"Order ID {order_id} status updated to 'paid'"}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "failure", "message": "Internal server error"}), 500

    finally:
        # Close the database connection
        if 'connection' in locals():
            cursor.close()


def razorpay_order_consumer(connection, order, user_id, consumer_id):
    cursor = connection.cursor()

    try:
        # Step 1: Calculate total price
        total_price = 0

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
        convenience_fee = 50  # Example: INR 50
        delivery_charge = 100  # Example: INR 100
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

@app.route('/create_razorpay_order', methods=['POST'])
def create_razorpay_order():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        order = data.get('order')
        user_id = data.get('user_id')
        consumer_id = data.get('consumer_id')

        if not order or not user_id or not consumer_id:
            return jsonify({"error": "Missing order or user details"}), 400

        # Call the function to calculate total and create Razorpay order
        response = razorpay_order_consumer(connection, order, user_id, consumer_id)

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/confirm_order_payment', methods=['POST'])
def confirm_order_payment():
    connection = get_db()
    data = request.json

    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        temp_order_data = data.get('temp_order_data')  # Received from initial order response

        if not razorpay_payment_id or not razorpay_order_id or not razorpay_signature:
            return jsonify({"error": "Missing Razorpay payment details"}), 400

        # Verify Razorpay payment signature
        try:
            razorpay_client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
        except razorpay.errors.SignatureVerificationError:
            return jsonify({"error": "Razorpay signature verification failed"}), 400

        # Payment is verified; now insert the order and commit to the database
        order_id = insert_order_to_database(connection, temp_order_data, razorpay_order_id, razorpay_payment_id)

        return jsonify({"message": "Payment successful and order created", "order_id": order_id}), 201

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/get_razorpay_order_details', methods=['GET'])
def get_razorpay_order_details():
    # The data you want to send in response
    order_details = {
        "convenience_fee": 50,
        "delivery_charge": 100,
        "razorpay_order_id": "order_PYgH3v8CJ6ukpa",
        "temp_order_data": {
            "consumer_id": 1,
            "final_total": 582.97,
            "order": {
                "customer_name": "John Doe",
                "order_details": [
                    {
                        "product_id": 7,
                        "quantity": 2
                    },
                    {
                        "product_id": 16,
                        "quantity": 3
                    }
                ],
                "payment_method": "online",
                "phone_num": "9876543210"
            },
            "user_id": 1
        },
        "total_amount": 582.97
    }

    return jsonify(order_details)


if __name__ == "__main__":
    print("Starting Python Flask Server")
    app.run(debug=True, port=5000)

