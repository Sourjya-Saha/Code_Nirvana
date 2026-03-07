from mysql.connector import Error
import json

import datetime
import razorpay

# Razorpay credentials (replace with your actual keys)
RAZORPAY_KEY_ID = 'rzp_test_2EpPSCTb8XHFCk'
RAZORPAY_KEY_SECRET = 'jHxKaISFIwGZ1byoWqtzldAB'

# Razorpay client instance
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def insert_transaction(connection, cart_id, manu_add, whole_add, ret_add):
    """
    Insert transaction with null value support and improved error handling
    """
    cursor = None
    try:
        print("\n=== Starting Transaction Insert ===")
        print(f"Inserting transaction for cart_id: {cart_id}")

        if not connection or not connection.is_connected():
            raise ValueError("Invalid database connection")

        if not cart_id:
            raise ValueError("cart_id is required")

        cursor = connection.cursor()

        # Insert query with support for null values
        insert_query = """
        INSERT INTO transactions 
            (cart_id, manu_add, whole_add, ret_add)
        VALUES 
            (%s, NULLIF(%s,''), NULLIF(%s,''), NULLIF(%s,''))
        """

        # Convert empty strings to None for database consistency
        manu_add = manu_add if manu_add else None
        whole_add = whole_add if whole_add else None
        ret_add = ret_add if ret_add else None

        print(f"""Executing query with values:
        Cart ID: {cart_id}
        Manufacturer Address: {manu_add if manu_add else 'NULL'}
        Wholesaler Address: {whole_add if whole_add else 'NULL'}
        Retailer Address: {ret_add if ret_add else 'NULL'}
        """)

        # Execute the query
        cursor.execute(insert_query, (cart_id, manu_add, whole_add, ret_add))
        connection.commit()

        print("Transaction inserted successfully")
        return True

    except Error as e:
        print(f"Database error in insert_transaction: {str(e)}")
        connection.rollback()
        raise
    except Exception as e:
        print(f"Unexpected error in insert_transaction: {str(e)}")
        connection.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
            print("Cursor closed")


def insert_transaction_wholesaler(connection, cart_id, manu_add, whole_add, ret_add):
    """
    Insert transaction with null value support and improved error handling
    """
    cursor = None
    try:
        print("\n=== Starting Transaction Insert ===")
        print(f"Inserting transaction for cart_id: {cart_id}")

        if not connection or not connection.is_connected():
            raise ValueError("Invalid database connection")

        if not cart_id:
            raise ValueError("cart_id is required")

        cursor = connection.cursor()

        # Step 1: Fetch cart_involved from cart_whole
        cart_query = "SELECT cart_involved FROM cart_whole WHERE cart_id = %s"
        cursor.execute(cart_query, (cart_id,))
        cart_result = cursor.fetchone()

        if not cart_result:
            raise ValueError(f"No cart found with cart_id: {cart_id}")

        cart_involved = json.loads(cart_result[0])
        involved_cart_ids = [data['cart_id'] for data in cart_involved.values()]

        # Step 2: Fetch existing authorised values
        auth_query = "SELECT cart_id, authorised FROM transactions WHERE cart_id IN ({})".format(
            ','.join(['%s'] * len(involved_cart_ids))
        )
        cursor.execute(auth_query, involved_cart_ids)
        auth_results = cursor.fetchall()

        # Create a dictionary of existing authorised values
        auth_dict = {}
        for result in auth_results:
            cart = result[0]
            auth = result[1] if result[1] else '{}'
            auth_dict[cart] = json.loads(auth)

        # Step 3: Update authorised values for each cart
        updates = []
        for involved_cart in involved_cart_ids:
            current_auth = auth_dict.get(involved_cart, {})
            # Get the next index for the new authorization
            next_index = str(len(current_auth))
            # Add new authorization
            current_auth[next_index] = {"cart_id": cart_id}
            updates.append((json.dumps(current_auth), involved_cart))

        # Update transactions table with new authorised values
        if updates:
            update_query = """
                UPDATE transactions 
                SET authorised = %s 
                WHERE cart_id = %s
            """
            cursor.executemany(update_query, updates)

        # Step 4: Insert new transaction
        insert_query = """
        INSERT INTO transactions 
            (cart_id, manu_add, whole_add, ret_add)
        VALUES 
            (%s, NULLIF(%s,''), NULLIF(%s,''), NULLIF(%s,''))
        """

        # Convert empty strings to None for database consistency
        manu_add = manu_add if manu_add else None
        whole_add = whole_add if whole_add else None
        ret_add = ret_add if ret_add else None

        print(f"""Executing final insert with values:
        Cart ID: {cart_id}
        Manufacturer Address: {manu_add if manu_add else 'NULL'}
        Wholesaler Address: {whole_add if whole_add else 'NULL'}
        Retailer Address: {ret_add if ret_add else 'NULL'}
        """)

        # Execute the final insert
        cursor.execute(insert_query, (cart_id, manu_add, whole_add, ret_add))
        connection.commit()

        print("Transaction inserted successfully")
        return True

    except Error as e:
        print(f"Database error in insert_transaction: {str(e)}")
        if connection:
            connection.rollback()
        raise
    except Exception as e:
        print(f"Unexpected error in insert_transaction: {str(e)}")
        if connection:
            connection.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
            print("Cursor closed")



# razorpay

def razorpay_order_consumer(connection, order, user_id):
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
                    "final_total": final_total
                }
            }

        raise ValueError("Payment method is not supported.")

    except Exception as e:
        connection.rollback()
        return str(e)


def insert_order_to_database(connection, temp_order_data, razorpay_order_id, razorpay_payment_id):
    cursor = connection.cursor()
    try:
        order = temp_order_data['order']
        user_id = temp_order_data['user_id']
        final_total = temp_order_data['final_total']

        print(f"order {order}")
        print(f"user_id {user_id}")
        print(f"final_total {final_total}")
        print(f"customer_name {order['customer_name']}")
        print(f"razorpay_order_id {razorpay_order_id}")
        print(f"razorpay_payment_id {razorpay_payment_id}")

        # Step 1: Insert into the orders_table
        order_query = """
            INSERT INTO orders_table (customer_name, total, date_time, phone_num, user_id, payment_method, razorpay_order_id, razorpay_payment_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        print("before executing order query")
        cursor.execute(order_query, (
            order['customer_name'],
            final_total,
            datetime.datetime.now(),
            order['phone_num'],
            user_id,
            order['payment_method'],
            razorpay_order_id,
            razorpay_payment_id
        ))
        print("after executing order query")
        order_id = cursor.lastrowid
        print(f"Generated order_id: {order_id}")

        # Step 2: Insert order details
        for detail in order['order_details']:
            fetch_price_query = "SELECT price_per_unit FROM products WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))
            price_row = cursor.fetchone()
            if not price_row:
                raise ValueError(f"Product ID {detail['product_id']} not found in products table.")
            price_per_unit = price_row[0]

            total_price_for_detail = float(detail['quantity']) * price_per_unit
            order_details_query = """
                INSERT INTO order_details (order_id, product_id, quantity, total_price, price_per_unit)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(order_details_query, (
                order_id,
                detail['product_id'],
                float(detail['quantity']),
                total_price_for_detail,
                price_per_unit
            ))
            print(
                f"Inserted order detail for product_id {detail['product_id']} with total price {total_price_for_detail}")

        # Step 3: Update product quantities
        update_query = """
            UPDATE products 
            SET quantity_of_uom = quantity_of_uom - %s 
            WHERE id = %s
        """
        products_quantity_data = [(float(detail['quantity']), detail['product_id']) for detail in
                                  order['order_details']]
        cursor.executemany(update_query, products_quantity_data)

        # Commit the transaction
        connection.commit()
        print("Transaction committed successfully.")

        return order_id

    except Exception as e:
        connection.rollback()
        print(f"Error occurred: {e}")
        raise e