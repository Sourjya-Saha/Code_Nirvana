from flask import Flask, request, jsonify, session, g, send_from_directory, send_file
# from tensorboard.compat.tensorflow_stub.dtypes import double

from mysql.connector import Error
from io import BytesIO
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
import app_consumer_functions
import filter_by_loc
import location_setter
import razorpay
import qr_consumer
import products_whole_dao
import cart_whole_dao
import transactions
import transactions_ret_to_manu
import transactions_whole_to_manu
import transactions_ret_to_whole
from flask import request, jsonify
import json
import re
from datetime import datetime
from dateutil import parser
import traceback
# Razorpay credentials (replace with your actual keys)
RAZORPAY_KEY_ID = 'rzp_test_2EpPSCTb8XHFCk'           #prvt details
RAZORPAY_KEY_SECRET = 'jHxKaISFIwGZ1byoWqtzldAB' #prvt details

# Razorpay client instance
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = Flask(__name__)

CORS(app)

app.secret_key = 'your_secret_key'

global_qr_data = {}



#SQL connection
def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host='localhost',
            user='root',
            password='sourjya@1614',
            database='drug_inventory_2'
        )
    return g.db

@app.teardown_appcontext
def close_connection(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

#products retailer
@app.route('/getUOM', methods=['GET'])
def get_uom():
    connection = get_db()
    response = uom_dao.get_uoms(connection)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/getProducts', methods=['POST'])
def get_products():
    connection = get_db()
    request_payload = request.json
    user_id = request_payload['user_id']

    response = products_dao.get_all_products(connection, user_id)

    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/insertProduct', methods=['POST'])
def insert_product():
    connection = get_db()

    request_payload = json.loads(request.form['data'])
    user_id = request_payload.get('user_id')

    image_blob = None
    if 'image' in request.files:
        image_blob = request.files['image'].read()

    request_payload['picture_of_the_prod'] = image_blob

    product_id = products_dao.insert_new_product(
        connection,
        request_payload,
        user_id
    )

    response = jsonify({
        'product_id': product_id
    })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/deleteProduct/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        connection = get_db()

        return_id = products_dao.delete_product(connection, product_id)

        response = jsonify({
            'success': True,
            'product_id': return_id
        })

    except Exception as e:

        response = jsonify({
            'success': False,
            'error': str(e)
        })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/editProduct', methods=['POST'])
def edit_product():
    try:
        connection = get_db()

        request_payload = json.loads(request.form['data'])
        product_id = request_payload['product_id']

        image_blob = None
        if 'image' in request.files:
            image_blob = request.files['image'].read()

        updated_product = {
            'name': request_payload.get('name'),
            'price_per_unit': request_payload.get('price_per_unit'),
            'quantity_of_uom': request_payload.get('quantity_of_uom'),
            'category': request_payload.get('category'),
            'shelf_num': request_payload.get('shelf_num'),
            'description': request_payload.get('description'),
            'exp_date': request_payload.get('exp_date'),
            'picture_of_the_prod': image_blob
        }

        rows_affected = products_dao.edit_product(
            connection,
            product_id,
            updated_product
        )

        response = jsonify({
            'success': rows_affected > 0,
            'rows_affected': rows_affected
        })

        response.headers.add('Access-Control-Allow-Origin', '*')

        return response

    except Exception as e:
        print(e)
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/addCartToProducts', methods=['POST'])
def add_cart_products_route():
    connection = get_db()
    request_payload = request.json
    cart_id = request_payload.get('cart_id')  # Extract the cart_id from the request
    user_id = request_payload.get('user_id')  # Extract the user_id from the request

    # Call the add_cart_products function
    inserted_product_ids = products_dao.add_cart_products(connection, cart_id, user_id)

    response = jsonify({
        'inserted_product_ids': inserted_product_ids
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/addCartToProductsWholeInventory', methods=['POST'])
def add_cart_products_to_inventory_route_whole():
    connection = get_db()
    request_payload = request.json
    cart_id = request_payload.get('cart_id')  # Extract the cart_id from the request
    user_id = request_payload.get('user_id')  # Extract the user_id from the request

    # Call the add_cart_products function
    inserted_product_ids = products_dao.add_cart_products_whole(connection, cart_id, user_id)

    response = jsonify({
        'inserted_product_ids': inserted_product_ids
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response





#Orders page


@app.route('/getAllOrders', methods=['POST'])
def get_all_orders_route():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    user_id = request_data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = orders_dao.get_all_orders(connection, user_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/insertOrder', methods=['POST'])
def insert_order():
    connection = get_db()
    data = request.json

    user_id = data.get('user_id')
    order_details = data.get('order_details')
    customer_name = data.get('customer_name')
    phone_num = data.get('phone_num')
    status = data.get('status')

    # Input validation
    if not user_id or not order_details or not customer_name or not phone_num or not status:
        return jsonify({"error": "Missing required fields"}), 400

    # Prepare order data
    order = {
        'customer_name': customer_name,
        'phone_num': phone_num,
        'status': status,
        'order_details': order_details
    }

    order_id = orders_dao.insert_order(connection, order, user_id)

    if isinstance(order_id, str):  # If order_id is a string, it's an error message
        return jsonify({"error": order_id}), 500

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201


@app.route('/updateOrder', methods=['POST'])
def update_order_route():
    try:
        # Parse the incoming JSON request
        request_payload = request.json
        logging.info(f'Received payload: {request_payload}')


        # Ensure the order ID is included in the payload
        order_id = request_payload.get('order_id')
        if not order_id:
            return jsonify({"error": "Order ID is missing"}), 400

        # Get the connection to the database
        connection = get_db()  # Ensure this function returns the correct DB connection

        # Update the order using the fixed update_order function
        updated_order_id = orders_dao.update_order(connection, order_id, request_payload)
        logging.info(f'Order updated successfully: {updated_order_id}')

        # Check if the update was successful
        if isinstance(updated_order_id, str) and "error" in updated_order_id.lower():
            return jsonify({"error": updated_order_id}), 500

        # Return the updated order ID in the response
        response = jsonify({
            'order_id': updated_order_id
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to delete an order
@app.route('/delete_order/<int:order_id>', methods=['DELETE'])
def delete_order_route(order_id):
    connection = get_db()
    try:
        result = orders_dao.delete_order(connection, order_id)
        return jsonify({"message": result}), 200  # Success response
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Internal server error
    finally:
        connection.close()



# Razorpay payment
@app.route('/update_order_status_website', methods=['POST'])
def update_order_status_website():
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


@app.route('/create_razorpay_order_website', methods=['POST'])
def create_razorpay_order_website():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        order = data.get('order')
        user_id = data.get('user_id')

        if not order or not user_id:
            return jsonify({"error": "Missing order or user details"}), 400

        # Call the function to calculate total and create Razorpay order
        response = transactions.razorpay_order_consumer(connection, order, user_id)

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/confirm_order_payment_website', methods=['POST'])
def confirm_order_payment_website():
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
        order_id = transactions.insert_order_to_database(connection, temp_order_data, razorpay_order_id, razorpay_payment_id)

        return jsonify({"message": "Payment successful and order created", "order_id": order_id}), 201

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500





#log in and sign up page


@app.route('/login', methods=['POST'])
def login_route():
    data = request.json

    username = data.get('username')
    password = data.get('password')

    # Input validation
    if not username or not password:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = log_in.log_in(connection, username, password)

    if result['status'] == 'success':
        return jsonify({"message": "Login successful", "unique_user_id": result['unique_user_id']}), 200
    else:
        return jsonify({"error": result['message']}), 401



@app.route('/signup', methods=['POST'])
def signup_route():
    data = request.json

    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type')
    metamask_add = data.get('metamask_add')
    user_lat = data.get('user_lat')
    user_long = data.get('user_long')

    # Input validation (you can add more checks here)
    if not username or not password or not user_type or not user_lat or not user_long:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = sign_up.sign_up(connection, username, password, user_type, metamask_add, user_lat, user_long)

    if "Error" in result:
        return jsonify({"error": result}), 400
    else:
        return jsonify({"message": result}), 201


#OCR page


@app.route('/OCR')
def serve_index():
    # Serve the React app's index.html file
    return send_from_directory('../frontend/src/landing_page/warehouse', 'OCR.js')

@app.route('/<path:filename>')
def serve_static_file(filename):
    # Serve static files from the React app's build directory
    return send_from_directory('../frontend/src/landing_page/warehouse', filename)

@app.route('/extractFromDoc', methods=['POST'])
def extract_from_doc():
    file_format = request.form.get('file_format')
    file = request.files['file']

    # Save the uploaded file
    file_path = os.path.join("uploads", str(uuid.uuid4()) + ".pdf")
    file.save(file_path)

    # Call the submit function to extract the data
    data, error = submit(file_path, file_format)

    # Clean up the file after processing
    if os.path.exists(file_path):
        os.remove(file_path)

    if error:
        return jsonify({'status': 'error', 'message': error}), 500

    # Return the extracted data as a JSON response
    return jsonify({"message": data}), 201


#generate the qr

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    data = request.get_json()

    # Extract fields from request
    cart_id = data.get('cart_id')

    # Validate cart_id - this is required and cannot be empty
    if not cart_id or cart_id.strip() == "":
        return jsonify({"error": "Cart ID is required and cannot be empty"}), 400

    # Other fields can be None or empty
    receivers_addressM = data.get('receivers_addressM')
    receivers_addressW = data.get('receivers_addressW')
    receivers_addressR = data.get('receivers_addressR')
    date = data.get('date')

    try:
        # Generate the QR code and encryption key
        img_byte_arr, encryption_key = generate_qr_code(
            cart_id, receivers_addressM, receivers_addressW, receivers_addressR, date
        )

        if not encryption_key:
            return jsonify({"error": "Failed to generate encryption key"}), 500

        # Convert the BytesIO object to binary data
        img_byte_arr.seek(0)
        img_binary_data = img_byte_arr.read()

        if not img_binary_data:
            return jsonify({"error": "Failed to generate QR image"}), 500

        connection = None
        cursor = None

        try:
            connection = get_db()
            if not connection.is_connected():
                return jsonify({"error": "Failed to establish database connection"}), 500

            cursor = connection.cursor()

            # Check if cart_id already exists
            query_check = """
                SELECT COUNT(*) 
                FROM encryption_keys 
                WHERE cart_id = %s
            """
            cursor.execute(query_check, (cart_id,))
            result = cursor.fetchone()

            if result[0] > 0:
                return jsonify({
                    "error": f"QR already exists! Can't generate QR for cart id: {cart_id} again! "
                             f"If some mistake was made, generate another QR."
                }), 401

            # Insert new record - note that we're storing the encrypted data which already handles nulls
            query_insert = """
                INSERT INTO encryption_keys (cart_id, encryption_key, qr_image) 
                VALUES (%s, %s, %s)
            """
            cursor.execute(query_insert, (
                cart_id,  # Required, not null
                encryption_key,  # Required, not null
                img_binary_data  # Required, not null
            ))
            connection.commit()

        except mysql.connector.Error as db_error:
            if connection and connection.is_connected():
                connection.rollback()
            # Log the specific MySQL error for debugging
            print(f"MySQL Error: {db_error}")
            return jsonify({"error": "Database error occurred"}), 500

        finally:
            if cursor:
                cursor.close()

        # Return the QR image
        img_byte_arr.seek(0)
        return send_file(img_byte_arr, mimetype='image/png'), 200

    except Exception as e:
        print(f"Unexpected error: {str(e)}")  # Log the error
        return jsonify({"error": "Failed to process request"}), 500



#scan the qr code

# @app.route('/scan_qr', methods=['GET'])
# def scan_qr():
#     url = "http://192.168.10.101:8081/video"
#     try:
#         qr_data = scan_qr_codes(url)
#         global global_qr_data
#         global_qr_data = qr_data
#
#         if qr_data is not None:  # Changed from if qr_data to handle empty strings
#             return jsonify({"qr_data": qr_data}), 200
#         else:
#             return jsonify({"error": "No QR code detected or video stream error"}), 500
#     except Exception as e:
#         return jsonify({"error": f"Error scanning QR code: {str(e)}"}), 500


@app.route('/scan_qr', methods=['GET'])
def scan_qr():
    try:
        qr_data = scan_qr_codes(1)   # ✅ 0 = default laptop webcam

        global global_qr_data
        global_qr_data = qr_data

        if qr_data is not None:
            return jsonify({"qr_data": qr_data}), 200
        else:
            return jsonify({"error": "No QR code detected"}), 500

    except Exception as e:
        return jsonify({"error": f"Error scanning QR code: {str(e)}"}), 500


@app.route('/get_qr_data', methods=['GET'])
def get_qr_data():
    if global_qr_data:
        return jsonify({"qr_data": global_qr_data}), 200
    else:
        return jsonify({"error": "No QR data available"}), 404

@app.route('/fetch_qr_data', methods=['POST'])
def fetch_qr_data():
    try:
        # Get the JSON data from the request
        data = request.get_json()

        # Validate if 'cart_id' is present in the request
        if not data or 'cart_id' not in data:
            return jsonify({"error": "Missing 'cart_id' in the request"}), 400

        cart_id = data.get('cart_id')

        # Connect to the database
        connection = get_db()
        if connection.is_connected():
            print("SQL connection established")
            cursor = connection.cursor()

            # Query to fetch the data for the given cart_id
            query = """
                SELECT qr_image 
                FROM encryption_keys 
                WHERE cart_id = %s
            """
            cursor.execute(query, (cart_id,))
            result = cursor.fetchone()
            print(result)

            # Check if data exists for the provided cart_id
            if not result:
                return jsonify({"error": "No data found for the given cart_id"}), 404

            # Extract the data
            (qr_code_image, ) = result

            # Convert the binary QR code image data to a BytesIO object
            if qr_code_image:
                image_bytes_io = BytesIO(qr_code_image)
                image_bytes_io.seek(0)  # Ensure the stream position is at the start

                # Send the image file as a response
                return send_file(
                    image_bytes_io,
                    mimetype='image/png',
                    as_attachment=False,  # Set to True if you want it downloaded
                    download_name=f"{cart_id}_qr.png"  # Optional file name
                )

            # If no image exists in the database, return an error
            return jsonify({"error": "No QR code image found for the given cart_id"}), 404

    except Exception as e:
        return jsonify({"error": f"Failed to fetch QR data: {str(e)}"}), 500

    finally:
        # Close the cursor and connection
        if 'cursor' in locals():
            cursor.close()



#products_manu


@app.route('/getProductsManu', methods=['POST'])
def get_products_manu():
    connection = get_db()
    request_payload = request.json
    user_id = request_payload['user_id']
    response = products_manu_dao.get_all_products_manu(connection, user_id)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/insertProductManu', methods=['POST'])
def insert_product_manu():
    try:
        connection = get_db()

        # Product JSON data
        request_payload = json.loads(request.form['data'])
        user_id = request_payload.get('user_id')

        # Get image file
        image_file = request.files.get('image')
        image_blob = image_file.read() if image_file else None

        product_id = products_manu_dao.insert_new_product_manu(
            connection,
            request_payload,
            user_id,
            image_blob
        )

        response = jsonify({'product_id': product_id})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Insert error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/deleteProductManu/<int:product_id>', methods=['DELETE'])
def delete_product_manu(product_id):

    connection = get_db()
    try:
        return_id = products_manu_dao.delete_product_manu(connection, product_id)
        response = jsonify({
            'success': True,
            'product_id': return_id
        })
    except Exception as e:
        response = jsonify({
            'success': False,
            'error': str(e)
        })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response



@app.route('/editProductManu', methods=['POST'])
def edit_product_manu():
    try:
        connection = get_db()

        request_payload = json.loads(request.form['data'])
        product_id = request_payload['product_id']

        updated_product = {
            'name': request_payload['name'],
            'price_per_unit': request_payload['price_per_unit'],
            'quantity_of_uom': request_payload['quantity_of_uom'],
            'category': request_payload['category'],
            'shelf_num': request_payload['shelf_num'],
            'description': request_payload['description'],
            'expiry_date': request_payload['expiry_date']
        }

        # Optional new image
        image_file = request.files.get('image')
        image_blob = image_file.read() if image_file else None

        rows_affected = products_manu_dao.edit_product_manu(
            connection,
            product_id,
            updated_product,
            image_blob
        )

        response = jsonify({
            'success': rows_affected > 0,
            'rows_affected': rows_affected
        })

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Edit error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
#transactions for retailer to manufacturer

@app.route('/get_all_transactions_retailer', methods=['POST'])
def get_all_transactions_route_retailer():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    user_id = request_data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_ret_to_manu.get_all_orders_retailer(connection, user_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_all_transactions_manu', methods=['POST'])
def get_all_transactions_route_manu():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    manu_id = request_data.get('manu_id')

    if not manu_id:
        return jsonify({'error': 'manu_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_ret_to_manu.get_all_orders_manu(connection, manu_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/insert_transaction', methods=['POST'])
def insert_transaction():
    connection = get_db()
    data = request.json

    user_id = data.get('user_id')
    order_details = data.get('order_details')
    customer_name = data.get('customer_name')
    phone_num = data.get('phone_num')
    manu_id = data.get('manu_id')

    # Input validation
    if not user_id or not order_details or not customer_name or not phone_num:
        return jsonify({"error": "Missing required fields"}), 400

    # Prepare order data
    order = {
        'customer_name': customer_name,
        'phone_num': phone_num,
        'order_details': order_details
    }

    order_id = transactions_ret_to_manu.insert_transaction_to_manu(connection, order, user_id, manu_id)

    if isinstance(order_id, str):  # If order_id is a string, it's an error message
        return jsonify({"error": order_id}), 500

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201


# Route to delete an order
@app.route('/delete_transaction/<int:order_id>', methods=['DELETE'])
def delete_transaction_route(order_id):
    """
    API endpoint to delete a transaction and its associated details.

    Returns:
        JSON response with a success message or an error.
    """
    try:
        connection = get_db()

        if not order_id:
            return jsonify({"error": "Missing required parameter: order_id"}), 400

        message = transactions_ret_to_manu.delete_transaction(connection, order_id)
        return jsonify({"message": message}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@app.route('/get_manufacturer_users', methods=['GET'])
def get_manufacturer_users():
    """
    API endpoint to fetch all manufacturers' generated_unique_id and user_id.

    Returns:
        JSON response containing a dictionary of manufacturer IDs and user IDs.
    """
    try:
        connection = get_db()
        user_dict = transactions_ret_to_manu.get_all_manufacturers(connection)
        return jsonify(user_dict), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500



@app.route('/get_wholesaler_users', methods=['GET'])
def get_wholesaler_users():
    """
    API endpoint to fetch all wholesalers' generated_unique_id and user_id.

    Returns:
        JSON response containing a dictionary of wholesaler IDs and user IDs.
    """
    try:
        connection = get_db()
        user_dict = transactions_ret_to_whole.get_all_wholesaler(connection)
        return jsonify(user_dict), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500



@app.route('/get_name_of_retailer_by_user_id', methods=['POST'])
def get_user_by_generated_id():
    """
    API endpoint to fetch the user_id based on generated_unique_id.

    Returns:
        JSON response containing the user_id.
    """
    try:
        data = request.json
        connection = get_db()  # Replace with your database connection function
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        user_id = transactions_ret_to_manu.get_user_id_by_user_id(connection, user_id)
        return jsonify({"user_id": user_id}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500



#cart page


@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    connection = get_db()
    data = request.json  # Receive JSON data from the frontend
    cart_id = data.get('cart_id')  # Extract cart_id from the request
    products = data.get('products')  # Extract the list of products
    user_id = data.get('user_id')
    order_id = data.get('order_id')
    order_type = data.get('order_type')

    if not cart_id or not products:
        return jsonify({"error": "Invalid data"}), 400

    # Add the products to the cart using the add_products_to_cart function
    result = cart_manu_dao.add_products_to_cart(connection, cart_id, products, user_id, order_id, order_type)

    if isinstance(result, str):  # If result is a string, it's an error
        return jsonify({"error": result}), 500

    return jsonify({"message": "Products added to cart successfully", "rows_affected": result}), 200

@app.route('/get_meta_add_for_qr', methods=['POST'])
def get_meta_add_for_qr():
    db = None
    cursor = None
    try:
        # Get the cart_id from the POST request
        data = request.get_json()
        cart_id = data.get('cart_id')
        if not cart_id:
            return jsonify({"error": "cart_id is required"}), 400

        # Connect to the database
        db = get_db()
        cursor = db.cursor(dictionary=True, buffered=True)  # Added buffered=True

        # Query to get order_id and order_type
        cursor.execute("SELECT order_id, order_type FROM cart_manu WHERE cart_id = %s", (cart_id,))
        cart_data = cursor.fetchone()
        if not cart_data:
            return jsonify({"error": "No data found for the given cart_id"}), 404

        order_id = cart_data['order_id']
        order_type = cart_data['order_type']

        # Determine the next query based on order_type
        if order_type == 'wholesaler':
            query = "SELECT user_id, manu_id FROM whole_to_manu WHERE order_id = %s"
        elif order_type == 'retailer':
            query = "SELECT user_id, manu_id FROM retailer_to_manu WHERE order_id = %s"
        else:
            return jsonify({"error": "Invalid order_type"}), 400

        # Execute the second query
        cursor.execute(query, (order_id,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({"error": "No user/manufacturer data found for the given order_id"}), 404

        user_id = user_data['user_id']
        manu_id = user_data['manu_id']

        # Query to get metamask_add and user_type
        cursor.execute(
            "SELECT metamask_add, user_type FROM users WHERE generated_unique_id IN (%s, %s)",
            (user_id, manu_id)
        )
        metamask_data = cursor.fetchall()
        if not metamask_data:
            return jsonify({"error": "No metamask address or user type data found"}), 404

        # Prepare the response JSON
        response = {entry['user_type']: entry['metamask_add'] for entry in metamask_data}
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass  # Suppress any errors during cleanup


@app.route('/get_meta_add_for_qr_whole', methods=['POST'])
def get_meta_add_for_qr_whole():
    db = None
    cursor = None
    try:
        # Get the cart_id from the POST request
        data = request.get_json()
        print(f"data , {data}")
        cart_id = data.get('cart_id')
        if not cart_id:
            return jsonify({"error": "cart_id is required"}), 400

        # Connect to the database
        db = get_db()
        cursor = db.cursor(dictionary=True, buffered=True)

        # Query to get order_id from cart_whole
        cursor.execute("SELECT order_id FROM cart_whole WHERE cart_id = %s", (cart_id,))
        cart_data = cursor.fetchone()
        if not cart_data:
            return jsonify({"error": "No data found for the given cart_id"}), 404

        order_id = cart_data['order_id']

        # Get user IDs from retailer_to_whole table
        cursor.execute(
            "SELECT user_id, whole_id FROM retailer_to_whole WHERE order_id = %s",
            (order_id,)
        )
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({"error": "No user data found for the given order_id"}), 404

        user_id = user_data['user_id']
        whole_id = user_data['whole_id']

        # Query to get metamask addresses and user types
        cursor.execute(
            "SELECT metamask_add, user_type FROM users WHERE generated_unique_id IN (%s, %s)",
            (user_id, whole_id)
        )
        metamask_data = cursor.fetchall()
        if not metamask_data:
            return jsonify({"error": "No metamask address or user type data found"}), 404

        # Prepare the response JSON
        response = {entry['user_type']: entry['metamask_add'] for entry in metamask_data}
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass  # Suppress any errors during cleanup

@app.route('/get_cart/<cart_id>', methods=['POST'])
def get_cart(cart_id):
    connection = get_db()
    # The React frontend should pass the user_id in the JSON payload
    request_payload = request.json

    if not request_payload or 'user_id' not in request_payload:
        return jsonify({"error": "Missing user_id"}), 400

    user_id = request_payload['user_id']

    # Fetch the products in the cart using the `get_cart_products` function
    products = cart_manu_dao.get_cart_products(connection, cart_id, user_id)

    if isinstance(products, str):  # If products is a string, it's an error message
        return jsonify({"error": products}), 500

    return jsonify({"cart_id": cart_id, "user_id": user_id, "products": products}), 200



@app.route('/getCartsManu', methods=['POST'])
def get_cart_manu():
    request_payload = request.json
    user_id= request_payload['user_id']
    connection= get_db()
    response = cart_manu_dao.get_all_cart_manu(connection, user_id)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/deleteCartManu/<cart_id>', methods=['DELETE'])
def delete_cart_manu(cart_id):

    connection = get_db()
    try:
        return_id = cart_manu_dao.delete_cart(connection, cart_id)
        response = jsonify({
            'success': True,
            'cart_id': return_id
        })
    except Exception as e:
        response = jsonify({
            'success': False,
            'error': str(e)
        })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

#insert into transactions table from the webpage start supplychain button

@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    data = request.json
    cart_id = data.get('cart_id')
    manu_add = data.get('manu_add')
    whole_add = data.get('whole_add')
    ret_add = data.get('ret_add')

    try:
        connection = get_db()

        if connection.is_connected():
            transactions.insert_transaction(connection, cart_id, manu_add, whole_add, ret_add)
            return jsonify({"message": "Transaction added successfully!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

#WEBSCRAPER

# Flask route to handle the prediction using web-scraped data
@app.route('/predict_medications', methods=['GET'])
def predict():
    try:
        # Get top symptoms based on web-scraped data
        top_symptoms_df = top_10_indian()
        top_symptoms = top_symptoms_df['symptoms'].tolist()  # List of symptoms

        # Predict medications based on top symptoms
        symptom_medications_map = predict_medications(top_symptoms)

        response = jsonify(symptom_medications_map)
        response.data = json.dumps(symptom_medications_map, indent=4)  # Pretty print with indentation
        return response, 200
    except KeyError as e:
        return jsonify({"error": f"Symptom not found: {e}"}), 400
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/top_symptoms', methods=['GET'])
def get_top_symptoms():
    top_10_df = top_10_indian()

    # Directly convert DataFrame to JSON and return it
    return jsonify(top_10_df.to_dict(orient='records'))

#Mobile App routes
#Mobile App login signup

@app.route('/login_app', methods=['POST'])
def login_route_app():
    data = request.json

    username = data.get('username')
    password = data.get('password')

    # Input validation
    if not username or not password:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = app_consumer_functions.log_in(connection, username, password)
    print(result)

    if result['status'] == 'success':
        return jsonify({"message": "Login successful", "unique_user_id": result['generated_unique_id']}), 200
    else:
        return jsonify({"error": result['message']}), 401



@app.route('/signup_app', methods=['POST'])
def signup_route_app():
    data = request.json

    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type')

    # Input validation (you can add more checks here)
    if not username or not password or not user_type:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = app_consumer_functions.sign_up(connection, username, password, user_type)

    if "Error" in result:
        return jsonify({"error": result}), 400
    else:
        return jsonify({"message": result}), 201

@app.route('/get_retailers_within_radius', methods=['POST'])
def get_retailers_within_radius():
    try:
        data = request.json
        # Get input parameters
        radius = float(data.get('radius'))
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        print(radius, lat, lon)
        # Establish database connection
        connection = get_db()
        result = filter_by_loc.get_users_within_radius(connection, radius, lat, lon)
        connection.close()
        print(result)

        return jsonify(result), 200
    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/getProducts', methods=['POST'])
def get_products_consumers():
    connection = get_db()
    request_payload = request.json
    user_id= request_payload['user_id']
    response = app_consumer_functions.get_all_products(connection, user_id)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

# Flask route to fetch orders
@app.route('/get_orders/<int:user_id>', methods=['GET'])
def get_orders(user_id):
    """
    Endpoint to fetch orders for a specific user_id.
    URL: /get_orders/<user_id>
    """
    connection = get_db()
    orders = app_consumer_functions.fetch_orders_by_user_id(connection, user_id)

    if "error" in orders:
        return jsonify({"status": "failure", "message": "Failed to fetch orders"}), 500

    if not orders:
        return jsonify({"status": "success", "message": "No orders found", "data": []}), 200

    return jsonify({"status": "success", "data": orders}), 200


@app.route('/decode_qr', methods=['POST'])
def decode_qr():
    """
    Flask route with improved error handling and null value handling
    """
    if 'image' not in request.files:
        return jsonify({"status": "failure", "message": "No image file provided"}), 400

    connection = None
    try:
        connection = get_db()
        image_file = request.files['image']

        result, status_code = app_consumer_functions.decode_qr_from_image_file(connection, image_file)
        if status_code != 200:
            return jsonify(result), status_code

        decrypted_data = result["decrypted_data"]
        print(decrypted_data)

        # Handle potential None/null values in cart_id
        try:
            cart_id = decrypted_data.get("cart_id")
            if not cart_id:
                print("invalid cart_id")
                return jsonify({"status": "failure", "message": "Invalid cart ID"}), 400
        except (TypeError, ValueError):
            print("invalid cart_id format")
            return jsonify({"status": "failure", "message": "Invalid cart ID format"}), 400

        location_data = app_consumer_functions.get_supply_chain_data(connection, cart_id)
        return jsonify(location_data), 200

    except json.JSONDecodeError:
        print("invalid qr data format")
        return jsonify({"status": "failure", "message": "Invalid QR data format"}), 400
    except Exception as e:
        return jsonify({"status": "failure", "message": str(e)}), 500

@app.route('/insert_order_consumer', methods=['POST'])
def insert_order_consumer():
    connection = get_db()
    data = request.json

    consumer_id = data.get('consumer_id')
    user_id = data.get('user_id')
    order_details = data.get('order_details')
    customer_name = data.get('customer_name')
    phone_num = data.get('phone_num')
    payment_method = data.get('payment_method')

    # Input validation
    if not user_id or not order_details or not customer_name or not phone_num:
        return jsonify({"error": "Missing required fields"}), 400

    # Prepare order data
    order = {
        'customer_name': customer_name,
        'phone_num': phone_num,
        'payment_method': payment_method,
        'order_details': order_details
    }

    order_id = app_consumer_functions.insert_order_consumer(connection, order, user_id, consumer_id)

    if isinstance(order_id, str):  # If order_id is a string, it's an error message
        return jsonify({"error": order_id}), 500

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201






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



@app.route('/create_razorpay_order', methods=['POST'])
def create_razorpay_order():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        order = data.get('order')
        user_id = data.get('user_id')
        consumer_id = data.get('consumer_id')
        print(f"order:{order}")
        print(f"user_id:{user_id}")
        print(f"consumer_id:{consumer_id}")

        if not order or not user_id or not consumer_id:
            return jsonify({"error": "Missing order or user details"}), 400

        # Call the function to calculate total and create Razorpay order
        response = app_consumer_functions.razorpay_order_consumer(connection, order, user_id, consumer_id)
        print(f"responser: {response}")

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        order_id = app_consumer_functions.insert_order_to_database(connection, temp_order_data, razorpay_order_id, razorpay_payment_id)

        return jsonify({"message": "Payment successful and order created", "order_id": order_id}), 201

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

#app driver part

@app.route('/fetch_users', methods=['GET'])
def fetch_users():
    try:
        # Connect to the database
        connection = get_db()
        if connection.is_connected():
            print("SQL connection established")
            cursor = connection.cursor()

            # Query to fetch generated_unique_id and user_id for manufacturers or retailers
            query = """
                SELECT generated_unique_id, user_id
                FROM users
                WHERE user_type IN ('manufacturer', 'wholesaler')
            """
            cursor.execute(query)
            results = cursor.fetchall()

            # Check if results were found
            if not results:
                return jsonify({"error": "No users found with user_type 'manufacturer' or 'retailer'"}), 404

            # Prepare the response
            users_data = [{"generated_unique_id": row[0], "user_id": row[1]} for row in results]

            return jsonify({"users": users_data}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch user data: {str(e)}"}), 500

    finally:
        # Close the cursor and connection
        if 'cursor' in locals():
            cursor.close()


@app.route('/login_driver', methods=['POST'])
def login_route_driver():
    data = request.json

    username = data.get('username')
    password = data.get('password')

    # Input validation
    if not username or not password:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = app_consumer_functions.log_in(connection, username, password)

    if result['status'] == 'success':
        generated_unique_id = result['generated_unique_id']

        try:
            # Update driver_occupied and driver_online in the users_app table
            cursor = connection.cursor()

            query_update = """
                UPDATE users_app
                SET driver_online = 1
                WHERE generated_unique_id = %s
            """
            cursor.execute(query_update, (generated_unique_id,))

            connection.commit()  # Commit the transaction

            # Return the response with success message and unique_user_id
            return jsonify({"message": "Login successful", "unique_user_id": generated_unique_id}), 200

        except Exception as e:
            connection.rollback()  # Rollback in case of error
            return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

        finally:
            cursor.close()

    else:
        return jsonify({"error": result['message']}), 401

@app.route('/logout_driver', methods=['POST'])
def logout_route_driver():
    data = request.json

    generated_unique_id = data.get('generated_unique_id')

    # Input validation
    if not generated_unique_id:
        return jsonify({"error": "Missing required 'generated_unique_id' field"}), 400

    connection = get_db()

    try:
        # Update driver_occupied and driver_online to 0 in the users_app table
        cursor = connection.cursor()

        query_update = """
            UPDATE users_app
            SET driver_occupied = 0, driver_online = 0
            WHERE generated_unique_id = %s
        """
        cursor.execute(query_update, (generated_unique_id,))

        connection.commit()  # Commit the transaction

        # Return the response with success message
        return jsonify({"message": "Logout successful"}), 200

    except Exception as e:
        connection.rollback()  # Rollback in case of error
        return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

    finally:
        cursor.close()

@app.route('/set_driver_occupied_1', methods=['POST'])
def occupied_route_driver_1():
    data = request.json

    generated_unique_id = data.get('generated_unique_id')

    # Input validation
    if not generated_unique_id:
        return jsonify({"error": "Missing required 'generated_unique_id' field"}), 400

    connection = get_db()

    try:
        # Update driver_occupied and driver_online to 0 in the users_app table
        cursor = connection.cursor()

        query_update = """
            UPDATE users_app
            SET driver_occupied = 1
            WHERE generated_unique_id = %s
        """
        cursor.execute(query_update, (generated_unique_id,))

        connection.commit()  # Commit the transaction

        # Return the response with success message
        return jsonify({"message": "Logout successful"}), 200

    except Exception as e:
        connection.rollback()  # Rollback in case of error
        return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

    finally:
        cursor.close()

@app.route('/set_driver_occupied_0', methods=['POST'])
def occupied_route_driver_0():
    data = request.json

    generated_unique_id = data.get('generated_unique_id')

    # Input validation
    if not generated_unique_id:
        return jsonify({"error": "Missing required 'generated_unique_id' field"}), 400

    connection = get_db()

    try:
        # Update driver_occupied and driver_online to 0 in the users_app table
        cursor = connection.cursor()

        query_update = """
            UPDATE users_app
            SET driver_occupied = 0
            WHERE generated_unique_id = %s
        """
        cursor.execute(query_update, (generated_unique_id,))

        connection.commit()  # Commit the transaction

        # Return the response with success message
        return jsonify({"message": "Logout successful"}), 200

    except Exception as e:
        connection.rollback()  # Rollback in case of error
        return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

    finally:
        cursor.close()

@app.route('/set_driver_online_1', methods=['POST'])
def online_route_driver_1():
    data = request.json

    generated_unique_id = data.get('generated_unique_id')

    # Input validation
    if not generated_unique_id:
        return jsonify({"error": "Missing required 'generated_unique_id' field"}), 400

    connection = get_db()

    try:
        # Update driver_occupied and driver_online to 0 in the users_app table
        cursor = connection.cursor()

        query_update = """
            UPDATE users_app
            SET driver_occupied = 1
            WHERE generated_unique_id = %s
        """
        cursor.execute(query_update, (generated_unique_id,))

        connection.commit()  # Commit the transaction

        # Return the response with success message
        return jsonify({"message": "Logout successful"}), 200

    except Exception as e:
        connection.rollback()  # Rollback in case of error
        return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

    finally:
        cursor.close()

@app.route('/set_driver_online_0', methods=['POST'])
def online_route_driver_0():
    data = request.json

    generated_unique_id = data.get('generated_unique_id')

    # Input validation
    if not generated_unique_id:
        return jsonify({"error": "Missing required 'generated_unique_id' field"}), 400

    connection = get_db()

    try:
        # Update driver_occupied and driver_online to 0 in the users_app table
        cursor = connection.cursor()

        query_update = """
            UPDATE users_app
            SET driver_occupied = 0
            WHERE generated_unique_id = %s
        """
        cursor.execute(query_update, (generated_unique_id,))

        connection.commit()  # Commit the transaction

        # Return the response with success message
        return jsonify({"message": "Logout successful"}), 200

    except Exception as e:
        connection.rollback()  # Rollback in case of error
        return jsonify({"error": f"Failed to update driver status: {str(e)}"}), 500

    finally:
        cursor.close()

@app.route('/fetch_drivers_online', methods=['POST'])
def fetch_drivers_online():
    try:
        # Parse the incoming JSON data
        data = request.get_json()
        user_id = data.get('user_id')
        print(user_id)

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        # Database connection (update the path as needed)
        connection = get_db()
        cursor = connection.cursor()

        # Query to fetch available drivers
        query = """
        SELECT generated_unique_id, user_name, driver_org_actual
        FROM users_app
        WHERE driver_org = %s AND driver_occupied = 0 AND driver_online = 1
        """
        cursor.execute(query, (user_id,))
        drivers = cursor.fetchall()

        # Closing the database connection
        cursor.close()

        # Format the result as a list of dictionaries
        drivers_list = [
            {'generated_unique_id': row[0], 'user_name': row[1], 'distributor_id': row[2]} for row in drivers
        ]

        print(drivers_list)

        return jsonify({'drivers': drivers_list}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/assign_driver', methods=['POST'])
def assign_driver():
    try:
        data = request.json
        cart_id = data.get('cart_id')
        driver_id = data.get('driver_id')
        distributor_id = data.get('distributor_id')

        if not cart_id or not driver_id or not distributor_id:
            return jsonify({'error': 'cart_id, driver_id and distributor_id are required'}), 400

        conn = get_db()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)

        # Check if a driver is already assigned to the cart
        cursor.execute(
            "SELECT driver_id FROM transactions WHERE cart_id = %s",
            (cart_id,)
        )
        result = cursor.fetchone()

        if result and result['driver_id']:
            existing_driver_id = result['driver_id']

            # Set the driver_occupied to 0 for the previously assigned driver
            cursor.execute(
                "UPDATE users_app SET driver_occupied = 0 WHERE generated_unique_id = %s",
                (existing_driver_id,)
            )

        # Assign the new driver to the cart
        cursor.execute(
            "UPDATE transactions SET driver_id = %s, distributor_id = %s WHERE cart_id = %s",
            (driver_id, distributor_id, cart_id)
        )

        # Update the new driver's status to occupied
        cursor.execute(
            "UPDATE users_app SET driver_occupied = 1 WHERE generated_unique_id = %s",
            (driver_id,)
        )

        # Commit the transaction
        conn.commit()
        cursor.close()

        return jsonify({'message': 'Driver assigned successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/delete_assignment', methods=['POST'])
def delete_assignment():
    try:
        data = request.json
        cart_id = data.get('cart_id')
        driver_id = data.get('driver_id')

        if not cart_id or not driver_id:
            return jsonify({'error': 'cart_id and driver_id are required'}), 400

        conn = get_db()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor()

        # Reset driver_id in the transactions table
        cursor.execute(
            "UPDATE transactions SET driver_id = NULL WHERE cart_id = %s",
            (cart_id,)
        )

        # Update the users_app table
        cursor.execute(
            "UPDATE users_app SET driver_occupied = 0 WHERE generated_unique_id = %s",
            (driver_id,)
        )

        conn.commit()
        cursor.close()

        return jsonify({'message': 'Driver assignment deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/fetch_drivers_assigned', methods=['POST'])
def fetch_drivers_assigned():
    try:
        data = request.json
        cart_id = data.get('cart_id')
        print(f"Received cart_id: {cart_id}")

        if not cart_id:
            return jsonify({'error': 'cart_id is required'}), 400

        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT driver_id FROM transactions WHERE cart_id = %s", (cart_id,))
        transaction = cursor.fetchone()
        print(f"Transaction result: {transaction}")

        if not transaction:
            return jsonify({'error': 'No driver found for the given cart_id'}), 404

        driver_id = transaction['driver_id']
        print(f"Driver ID: {driver_id}")

        cursor.execute("SELECT generated_unique_id, user_name FROM users_app WHERE generated_unique_id = %s", (driver_id,))
        driver_details = cursor.fetchone()
        print(f"Driver details: {driver_details}")

        if not driver_details:
            return jsonify({'error': 'Driver details not found'}), 404

        return jsonify(driver_details), 200

    except mysql.connector.Error as err:
        print(f"MySQL error: {err}")
        return jsonify({'error': str(err)}), 500

    finally:
        if cursor:
            cursor.close()

@app.route('/fetch_notifications', methods=['POST'])
def fetch_notifications():
    try:
        data = request.json
        driver_id = data.get('driver_id')

        if not driver_id:
            return jsonify({'error': 'driver_id is required'}), 400

        conn = get_db()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)

        # Query to fetch cart_id and driver_id where driver_id matches the input
        cursor.execute(
            "SELECT cart_id, driver_id FROM transactions WHERE driver_id = %s",
            (driver_id,)
        )

        transactions = cursor.fetchall()

        if not transactions:
            cursor.close()
            return jsonify({'message': 'No notifications found for this driver'}), 200

        # Filter transactions by checking the status in route_status table
        active_notifications = []
        for transaction in transactions:
            cart_id = transaction['cart_id']

            # Query to check the status in the route_status table
            cursor.execute(
                "SELECT status FROM route_status WHERE cart_id = %s",
                (cart_id,)
            )
            status_result = cursor.fetchone()

            if status_result and status_result['status'] == 'ACTIVE':
                active_notifications.append(transaction)

        cursor.close()

        if active_notifications:
            return jsonify({'notifications': active_notifications}), 200
        else:
            return jsonify({'message': 'No active notifications found for this driver'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#products_whole


@app.route('/getProductsWhole', methods=['POST'])
def get_products_whole():
    connection = get_db()
    request_payload = request.json
    user_id = request_payload['user_id']
    response = products_whole_dao.get_all_products_whole(connection, user_id)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/insertProductWhole', methods=['POST'])
def insert_product_whole():
    connection = get_db()

    request_payload = json.loads(request.form['data'])
    user_id = request_payload.get('user_id')

    image_blob = None
    if 'image' in request.files:
        image_file = request.files['image']
        image_blob = image_file.read()

    request_payload['picture_of_the_prod'] = image_blob

    product_id = products_whole_dao.insert_new_product_whole(
        connection,
        request_payload,
        user_id
    )

    response = jsonify({
        'product_id': product_id
    })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/deleteProductWhole/<int:product_id>', methods=['DELETE'])
def delete_product_whole(product_id):

    connection = get_db()
    try:
        return_id = products_whole_dao.delete_product_whole(connection, product_id)
        response = jsonify({
            'success': True,
            'product_id': return_id
        })
    except Exception as e:
        response = jsonify({
            'success': False,
            'error': str(e)
        })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response




@app.route('/editProductWhole', methods=['POST'])
def edit_product_whole():
    connection = get_db()

    try:
        request_payload = json.loads(request.form['data'])

        product_id = request_payload['product_id']

        image_blob = None
        if 'image' in request.files:
            image_blob = request.files['image'].read()

        updated_product = {
            'name': request_payload.get('name'),
            'price_per_unit': request_payload.get('price_per_unit'),
            'quantity_of_uom': request_payload.get('quantity_of_uom'),
            'category': request_payload.get('category'),
            'shelf_num': request_payload.get('shelf_num'),
            'description': request_payload.get('description'),
            'exp_date': request_payload.get('exp_date'),
            'picture_of_the_prod': image_blob
        }

        rows_affected = products_whole_dao.edit_product_whole(
            connection,
            product_id,
            updated_product
        )

        response = jsonify({
            'success': rows_affected > 0,
            'rows_affected': rows_affected
        })

        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(e)
        return jsonify({'status': 'error', 'message': str(e)}), 500

#recieve cart from manufacture
@app.route('/addCartToProductsWhole', methods=['POST'])
def add_cart_products_route_whole():
    connection = get_db()
    request_payload = request.json
    cart_id = request_payload.get('cart_id')  # Extract the cart_id from the request
    user_id = request_payload.get('user_id')  # Extract the user_id from the request

    # Call the add_cart_products function
    inserted_product_ids = products_whole_dao.add_cart_products(connection, cart_id, user_id)

    response = jsonify({
        'inserted_product_ids': inserted_product_ids
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


#transactions for wholesaler to manufacturer

@app.route('/get_all_transactions_wholesaler', methods=['POST'])
def get_all_transactions_route_wholesaler():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    user_id = request_data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_whole_to_manu.get_all_orders_wholesaler(connection, user_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_all_transactions_whole_for_manu', methods=['POST'])

def get_all_transactions_route_whole_for_manu():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    manu_id = request_data.get('manu_id')

    if not manu_id:
        return jsonify({'error': 'manu_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_whole_to_manu.get_all_orders_manu(connection, manu_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/insert_transaction_whole_to_manu', methods=['POST'])
def insert_transaction_whole_to_manu():
    connection = get_db()
    data = request.json
    print(data)

    user_id = data.get('user_id')
    order_details = data.get('order_details')
    customer_name = data.get('customer_name')
    phone_num = data.get('phone_num')
    manu_id = data.get('manu_id')

    # Input validation
    if not user_id or not order_details or not customer_name or not phone_num:
        return jsonify({"error": "Missing required fields"}), 400

    # Prepare order data
    order = {
        'customer_name': customer_name,
        'phone_num': phone_num,
        'order_details': order_details
    }

    order_id = transactions_whole_to_manu.insert_transaction_to_manu(connection, order, user_id, manu_id)

    if isinstance(order_id, str):  # If order_id is a string, it's an error message
        return jsonify({"error": order_id}), 500

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201


# Route to delete an order
@app.route('/delete_transaction_whole/<int:order_id>', methods=['DELETE'])
def delete_transaction_route_whole(order_id):
    """
    API endpoint to delete a transaction and its associated details.

    Returns:
        JSON response with a success message or an error.
    """
    try:
        connection = get_db()

        if not order_id:
            return jsonify({"error": "Missing required parameter: order_id"}), 400

        message = transactions_whole_to_manu.delete_transaction(connection, order_id)
        return jsonify({"message": message}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


@app.route('/get_name_of_wholesaler_by_user_id', methods=['POST'])
def get_wholesaler_by_generated_id():
    """
    API endpoint to fetch the user_id based on generated_unique_id.

    Returns:
        JSON response containing the user_id.
    """
    try:
        data = request.json
        connection = get_db()  # Replace with your database connection function
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        user_id = transactions_whole_to_manu.get_user_id_by_user_id(connection, user_id)
        return jsonify({"user_id": user_id}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


#transactions for retailer to wholesaler

@app.route('/get_all_transactions_for_retailer_to_wholesaler', methods=['POST'])
def get_all_transactions_route_retailer_to_wholesaler():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    user_id = request_data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_ret_to_whole.get_all_orders_retailer_to_wholesaler(connection, user_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_all_transactions_for_wholesaler_to_retailer', methods=['POST'])
def get_all_transactions_route_for_wholesaler_to_retailer():
    # Get database connection
    connection = get_db()

    # Extract user_id from the JSON body of the POST request
    request_data = request.get_json()

    # Ensure user_id is provided in the request
    whole_id = request_data.get('whole_id')

    if not whole_id:
        return jsonify({'error': 'whole_id is required'}), 400

    try:
        # Call the get_all_orders function and pass the connection and user_id
        response_data = transactions_ret_to_whole.get_all_orders_whole(connection, whole_id)

        # Return the response as JSON
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/insert_transaction_retailer_to_wholesaler', methods=['POST'])
def insert_transaction_retailer_to_wholesaler():
    connection = get_db()
    data = request.json
    print(data)

    user_id = data.get('user_id')
    order_details = data.get('order_details')
    customer_name = data.get('customer_name')
    phone_num = data.get('phone_num')
    whole_id = data.get('whole_id')

    # Input validation
    if not user_id or not order_details or not customer_name or not phone_num:
        return jsonify({"error": "Missing required fields"}), 400

    # Prepare order data
    order = {
        'customer_name': customer_name,
        'phone_num': phone_num,
        'order_details': order_details
    }

    order_id = transactions_ret_to_whole.insert_transaction_to_whole(connection, order, user_id, whole_id)

    if isinstance(order_id, str):  # If order_id is a string, it's an error message
        return jsonify({"error": order_id}), 500

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201


# Route to delete an order
@app.route('/delete_transaction_retailer_to_wholesaler/<int:order_id>', methods=['DELETE'])
def delete_transaction_route_ret_to_whole(order_id):
    """
    API endpoint to delete a transaction and its associated details.

    Returns:
        JSON response with a success message or an error.
    """
    try:
        connection = get_db()

        if not order_id:
            return jsonify({"error": "Missing required parameter: order_id"}), 400

        message = transactions_ret_to_whole.delete_transaction(connection, order_id)
        return jsonify({"message": message}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


@app.route('/get_name_of_retailer_by_user_id', methods=['POST'])
def get_retailer_by_generated_id():
    """
    API endpoint to fetch the user_id based on generated_unique_id.

    Returns:
        JSON response containing the user_id.
    """
    try:
        data = request.json
        connection = get_db()  # Replace with your database connection function
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        user_id = transactions_ret_to_whole.get_user_id_by_user_id(connection, user_id)
        return jsonify({"user_id": user_id}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500







#cart page wholesaler


@app.route('/add_to_cart_whole', methods=['POST'])
def add_to_cart_whole():
    connection = get_db()
    data = request.json  # Receive JSON data from the frontend
    cart_id = data.get('cart_id')  # Extract cart_id from the request
    products = data.get('products')  # Extract the list of products
    user_id = data.get('user_id')
    cart_list = data.get('cart_list')
    order_id = data.get('order_id')

    if not cart_id or not products:
        return jsonify({"error": "Invalid data"}), 400

    # Add the products to the cart using the add_products_to_cart function
    result = cart_whole_dao.add_products_to_cart_whole(connection, cart_id, products, user_id, cart_list, order_id)

    if isinstance(result, str):  # If result is a string, it's an error
        return jsonify({"error": result}), 500

    return jsonify({"message": "Products added to cart successfully", "rows_affected": result}), 200



@app.route('/get_cart_products_whole/<int:cart_id>', methods=['POST'])
def get_cart_products_whole(cart_id):
    connection = get_db()
    # The React frontend should pass the user_id in the JSON payload
    request_payload = request.json

    if not request_payload or 'user_id' not in request_payload:
        return jsonify({"error": "Missing user_id"}), 400

    user_id = request_payload['user_id']

    # Fetch the products in the cart using the `get_cart_products` function
    products = cart_whole_dao.get_cart_products_whole(connection, cart_id, user_id)

    if isinstance(products, str):  # If products is a string, it's an error message
        return jsonify({"error": products}), 500

    return jsonify({"cart_id": cart_id, "user_id": user_id, "products": products}), 200



@app.route('/getCartsWhole', methods=['POST'])
def get_cart_whole():
    request_payload = request.json
    user_id= request_payload['user_id']
    connection= get_db()
    response = cart_whole_dao.get_all_cart_whole(connection, user_id)
    response = jsonify(response)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/deleteCartWhole/<cart_id>', methods=['DELETE'])
def delete_cart_whole(cart_id):

    connection = get_db()
    try:
        return_id = cart_whole_dao.delete_cart_whole(connection, cart_id)
        response = jsonify({
            'success': True,
            'cart_id': return_id
        })
    except Exception as e:
        response = jsonify({
            'success': False,
            'error': str(e)
        })

    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

#insert into transactions table from the webpage start supplychain button

@app.route('/add_transaction_wholesaler', methods=['POST'])
def add_transaction_wholesaler():
    data = request.json
    cart_id = data.get('cart_id')
    manu_add = data.get('manu_add')
    whole_add = data.get('whole_add')
    ret_add = data.get('ret_add')

    try:
        connection = get_db()

        if connection.is_connected():
            transactions.insert_transaction_wholesaler(connection, cart_id, manu_add, whole_add, ret_add)
            return jsonify({"message": "Transaction added successfully!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500




#distributor dashboard

@app.route('/signup_driver', methods=['POST'])
def signup_route_driver():
    data = request.json

    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type')
    driver_org = data.get('driver_org')
    distributor_id = data.get('distributor_id')

    # Input validation (you can add more checks here)
    if not username or not password or not user_type or not driver_org or not distributor_id:
        return jsonify({"error": "Missing required fields"}), 400

    connection = get_db()
    result = app_consumer_functions.sign_up_driver(connection, username, password, user_type, driver_org, distributor_id)

    if "Error" in result:
        return jsonify({"error": result}), 400
    else:
        return jsonify({"message": result}), 201

@app.route('/fetch_drivers_for_distributor', methods=['POST'])
def fetch_drivers_for_distributor():
    """Fetch all users from users_app where driver_org_actual matches the provided value."""
    data = request.get_json()  # Get JSON payload from POST request
    driver_org_actual = data.get('driver_org_actual')

    if not driver_org_actual:
        return jsonify({"error": "Missing required parameter: driver_org_actual"}), 400

    try:
        # Establish database connection
        connection = get_db()
        cursor = connection.cursor(dictionary=True)

        # Query to fetch users
        query = "SELECT * FROM users_app WHERE driver_org_actual = %s"
        cursor.execute(query, (driver_org_actual,))

        # Fetch all results
        users = cursor.fetchall()

        # Close connection
        cursor.close()
        connection.close()

        # Return results as JSON
        return jsonify({"users": users}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/fetch_shipments', methods=['POST'])
def fetch_shipments():
    """Fetch shipments of a driver by driver_id."""
    data = request.get_json()  # Get JSON payload from POST request
    driver_id = data.get('driver_id')

    if not driver_id:
        return jsonify({"error": "Missing required parameter: driver_id"}), 400

    try:
        # Establish database connection
        connection = get_db()
        cursor = connection.cursor(dictionary=True)

        # Step 1: Fetch cart_ids from transactions table for the given driver_id
        transaction_query = "SELECT cart_id, driver_id FROM transactions WHERE driver_id = %s"
        cursor.execute(transaction_query, (driver_id,))
        transactions = cursor.fetchall()

        if not transactions:
            return jsonify({"message": "No shipments found for the provided driver_id"}), 404

        # Extract cart_ids
        cart_ids = [transaction['cart_id'] for transaction in transactions]

        # Step 2: Fetch shipment details from route_status for the cart_ids
        shipment_details = []
        route_status_query = """
            SELECT cart_id, current_location, status, estimated_delivery_time, 
                   route_data, created_at, updated_at, deviation_data, current_deviation 
            FROM route_status 
            WHERE cart_id = %s
        """

        for cart_id in cart_ids:
            cursor.execute(route_status_query, (cart_id,))
            result = cursor.fetchone()
            if result:
                shipment_details.append(result)

        # Close connection
        cursor.close()

        # Return shipment details as JSON
        return jsonify({"shipments": shipment_details}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/get_lats_longs', methods=['POST'])
def get_location():
    cart_id = request.args.get('cart_id')

    try:
        connection = get_db()

        if connection.is_connected():
            result = location_setter.get_location_from_met_add(connection, cart_id)
            if result:
                return jsonify(result), 200
            else:
                return jsonify({"error": "No location data found."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if connection.is_connected():
            connection.close()
            print("MySQL connection is closed")


# Razorpay payment for supply chain whole to manu

@app.route('/create_razorpay_order_transactions_whole_to_manu', methods=['POST'])
def create_razorpay_order_transactions_whole_to_manu():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        cart_id = data.get('cart_id')

        if not cart_id:
            return jsonify({"error": "Missing cart_id"}), 400

        # Call the function to calculate total and create Razorpay order
        response = transactions_whole_to_manu.razorpay_order_whole_to_manu(connection, cart_id)

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/confirm_order_payment_transactions_whole_to_manu', methods=['POST'])
def confirm_order_payment_transactions_whole_to_manu():
    connection = get_db()
    data = request.json

    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        temp_order_data = data.get('temp_order_data')  # Received from initial order response
        order_id = temp_order_data["order"][0][0]

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
        row_count = transactions_whole_to_manu.update_order_status_transactions_whole_to_manu(connection, order_id)
        # Check if any row was updated
        if row_count == 0:
            return jsonify({"status": "failure", "message": "Order ID not found"}), 404

        return jsonify({"status": "success", "message": f"Order ID {order_id} status updated to 'paid'"}), 200

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

# Razorpay payment for supply chain ret to manu

@app.route('/create_razorpay_order_transactions_ret_to_manu', methods=['POST'])
def create_razorpay_order_transactions_ret_to_manu():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        cart_id = data.get('cart_id')
        print(f"cart_id: {cart_id}")

        if not cart_id:
            return jsonify({"error": "Missing cart_id"}), 400

        # Call the function to calculate total and create Razorpay order
        response = transactions_ret_to_manu.razorpay_order_ret_to_manu(connection, cart_id)

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/confirm_order_payment_transactions_ret_to_manu', methods=['POST'])
def confirm_order_payment_transactions_ret_to_manu():
    connection = get_db()
    data = request.json

    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        temp_order_data = data.get('temp_order_data')  # Received from initial order response
        order_id = temp_order_data["order"][0][0]

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
        row_count = transactions_ret_to_manu.update_order_status_transactions_ret_to_manu(connection, order_id)
        # Check if any row was updated
        if row_count == 0:
            return jsonify({"status": "failure", "message": "Order ID not found"}), 404

        return jsonify({"status": "success", "message": f"Order ID {order_id} status updated to 'paid'"}), 200

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500

# Razorpay payment for supply chain ret to whole

@app.route('/create_razorpay_order_transactions_ret_to_whole', methods=['POST'])
def create_razorpay_order_transactions_ret_to_whole():
    connection = get_db()  # Assume you have a function to get the DB connection
    data = request.json

    try:
        # Extract necessary details from the request
        cart_id = data.get('cart_id')

        if not cart_id:
            return jsonify({"error": "Missing cart_id"}), 400

        # Call the function to calculate total and create Razorpay order
        response = transactions_ret_to_whole.razorpay_order_ret_to_whole(connection, cart_id)

        if isinstance(response, str):  # Check if the response is an error message
            return jsonify({"error": response}), 400

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/confirm_order_payment_transactions_ret_to_whole', methods=['POST'])
def confirm_order_payment_transactions_ret_to_whole():
    connection = get_db()
    data = request.json

    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        temp_order_data = data.get('temp_order_data')  # Received from initial order response
        order_id = temp_order_data["order"][0][0]

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
        row_count = transactions_ret_to_whole.update_order_status_transactions_ret_to_whole(connection, order_id)
        # Check if any row was updated
        if row_count == 0:
            return jsonify({"status": "failure", "message": "Order ID not found"}), 404

        return jsonify({"status": "success", "message": f"Order ID {order_id} status updated to 'paid'"}), 200

    except Exception as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500


#get deviation data
#get deviation data
#get deviation data
#get deviation data
@app.route('/get_deviation_data', methods=['POST'])
def get_deviation_data():
    try:
        print("Received request to /get_deviation_data")

        data = request.get_json()
        print(f"Request data: {data}")

        cart_id = data.get('cart_id')
        print(f"Extracted cart_id: {cart_id}")

        if not cart_id:
            print("cart_id is missing in the request")
            return jsonify({"error": "cart_id is required"}), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)
        print("Database connection established")

        query = "SELECT deviation_data FROM route_status WHERE cart_id = %s"
        print(f"Executing query: {query} with cart_id: {cart_id}")
        cursor.execute(query, (cart_id,))
        result = cursor.fetchone()
        print(f"Query result: {result}")

        if not result or 'deviation_data' not in result or result['deviation_data'] is None:
            print(f"No deviation data found for cart_id: {cart_id}")
            return jsonify({"message": "No deviation data", "data": []}), 200

        deviation_data = json.loads(result['deviation_data'])
        print(f"Parsed deviation data: {deviation_data}")

        # Organize the data — skip incomplete entries missing 'start' or 'end'
        organized_data = {}
        valid_index = 0

        for index, item in enumerate(deviation_data):
            print(f"Processing deviation data at index: {index}")

            if 'start' not in item or 'end' not in item:
                print(f"Skipping index {index}: missing 'start' or 'end'")
                continue

            organized_data[valid_index] = {
                "start": {
                    "timestamp": item['start']['timestamp'],
                    "location": item['start']['location'],
                    "distance": item['start']['distance']
                },
                "end": {
                    "timestamp": item['end']['timestamp'],
                    "location": item['end']['location'],
                    "distance": item['end']['distance']
                }
            }
            print(f"Organized item for index {valid_index}: {organized_data[valid_index]}")
            valid_index += 1

        print("Final organized data:", organized_data)
        return jsonify(organized_data)

    except Exception as e:
        print(f"Exception occurred: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
            print("Database cursor closed")

# Add this route to your Flask application

@app.route('/api/get_all_users', methods=['GET'])
def get_all_users():
    """
    API endpoint to fetch all users from the database with their details.

    Returns:
        JSON response containing all users with their details.
    """
    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT user_id, generated_unique_id, metamask_add 
        FROM users 
        WHERE metamask_add IS NOT NULL
        """

        cursor.execute(query)
        users = cursor.fetchall()

        return jsonify({"users": users, "status": "success"}), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": "An unexpected error occurred",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    print("Starting Python Flask Server")
    app.run(host='0.0.0.0', debug=True, port=5000)

