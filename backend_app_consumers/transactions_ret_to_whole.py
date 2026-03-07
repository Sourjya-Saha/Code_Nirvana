import datetime
import razorpay

# Razorpay credentials (replace with your actual keys)
RAZORPAY_KEY_ID = 'rzp_test_2EpPSCTb8XHFCk'
RAZORPAY_KEY_SECRET = 'jHxKaISFIwGZ1byoWqtzldAB'

# Razorpay client instance
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))



def insert_transaction_to_whole(connection, order, user_id, whole_id):
    cursor = connection.cursor()

    try:
        print(f"order: {order}")
        # Step 1: Insert into the orders_table (initially total is set to 0)
        order_query = """
            INSERT INTO retailer_to_whole (customer_name, total, date_time, phone_num, user_id, whole_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        order_data = (
            order['customer_name'],
            0,  # Placeholder for total, will be updated later
            datetime.datetime.now(),
            order['phone_num'],
            user_id,
            whole_id
        )

        # Execute the order query
        cursor.execute(order_query, order_data)
        print("this statement is getting executed")

        # Get the last inserted ID (order ID)
        transaction_id = cursor.lastrowid
        print(transaction_id)

        total_price = 0  # Initialize total price for the order

        # Step 2: Process each order detail
        for detail in order['order_details']:
            # Query to get the price_per_unit and quantity from products table
            fetch_price_query = "SELECT price_per_unit FROM products_whole WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))  # Single-item tuple
            result = cursor.fetchone()
            print(result)

            # Check if result is None
            if result is None:
                raise ValueError(f"Product with ID {detail['product_id']} not found in products_whole table.")

            price_per_unit = result[0]

            # Calculate total price for this detail
            quantity = float(detail['quantity'])
            total_price_for_detail = quantity * price_per_unit

            # Calculate dynamic discount
            discount_percentage = 0.008 * quantity  # Base discount of 0.01% per unit
            if quantity > 500:
                discount_percentage += 2  # Additional 3% discount
            if quantity > 1000:
                discount_percentage += 3  # Additional 5% discount

            discount_amount = (discount_percentage / 100) * total_price_for_detail
            total_price_for_detail_after_discount = total_price_for_detail - discount_amount




            total_price += total_price_for_detail_after_discount

            # Step 3: Insert into order_details table
            order_details_query = """
                INSERT INTO retailer_to_whole_details (order_id, product_id, quantity, total_price, price_per_unit)
                VALUES (%s, %s, %s, %s, %s)
            """

            cursor.execute(order_details_query, (
                transaction_id,
                int(detail['product_id']),
                float(detail['quantity']),
                total_price_for_detail,
                price_per_unit
            ))

        # Step 4: Update the total price in orders_table
        update_total_query = """
            UPDATE retailer_to_whole
            SET total = %s 
            WHERE order_id = %s
        """
        cursor.execute(update_total_query, (total_price, transaction_id))

        # Commit the transaction
        connection.commit()

        # Return the order ID
        return transaction_id

    except Exception as e:
        print(e)
        # Rollback in case of an error
        connection.rollback()
        return str(e)


def insert_transaction_to_manu(connection, order, user_id, manu_id):
    cursor = connection.cursor()

    try:
        # Step 1: Insert into the orders_table (initially total is set to 0)
        order_query = """
            INSERT INTO retailer_to_manu (customer_name, total, date_time, phone_num, user_id, manu_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        order_data = (
            order['customer_name'],
            0,  # Placeholder for total, will be updated later
            datetime.datetime.now(),
            order['phone_num'],
            user_id,
            manu_id
        )

        # Execute the order query
        cursor.execute(order_query, order_data)

        # Get the last inserted ID (order ID)
        transaction_id = cursor.lastrowid
        print(transaction_id)

        total_price = 0  # Initialize total price for the order

        # Step 2: Process each order detail
        for detail in order['order_details']:
            # Query to get the price_per_unit and quantity from products table
            fetch_price_query = "SELECT price_per_unit FROM products_manu WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))  # Single-item tuple
            result = cursor.fetchone()
            print(result)

            # Check if result is None
            if result is None:
                raise ValueError(f"Product with ID {detail['product_id']} not found in product_manu table.")

            price_per_unit = result[0]

            # Calculate total price for this detail
            quantity = float(detail['quantity'])
            total_price_for_detail = quantity * price_per_unit

            # Calculate dynamic discount
            discount_percentage = 0.005 * quantity  # Base discount of 0.01% per unit
            if quantity > 500:
                discount_percentage += 1  # Additional 3% discount
            if quantity > 1000:
                discount_percentage += 2.5  # Additional 5% discount

            discount_amount = (discount_percentage / 100) * total_price_for_detail
            total_price_for_detail_after_discount = total_price_for_detail - discount_amount




            total_price += total_price_for_detail_after_discount

            # Step 3: Insert into order_details table
            order_details_query = """
                INSERT INTO retailer_to_manu_details (order_id, product_id, quantity, total_price, price_per_unit)
                VALUES (%s, %s, %s, %s, %s)
            """

            cursor.execute(order_details_query, (
                transaction_id,
                int(detail['product_id']),
                float(detail['quantity']),
                total_price_for_detail,
                price_per_unit
            ))

        # Step 4: Update the total price in orders_table
        update_total_query = """
            UPDATE retailer_to_manu 
            SET total = %s 
            WHERE order_id = %s
        """
        cursor.execute(update_total_query, (total_price, transaction_id))

        # Commit the transaction
        connection.commit()

        # Return the order ID
        return transaction_id

    except Exception as e:
        # Rollback in case of an error
        connection.rollback()
        return str(e)


def get_order_details(connection, order_id):
    """
    Fetch order details including product information for a given order ID.
    """
    cursor = connection.cursor()

    query = """
        SELECT retailer_to_whole_details.order_id, products_whole.id, retailer_to_whole_details.quantity, retailer_to_whole_details.total_price, 
               products_whole.name AS product_name, products_whole.price_per_unit
        FROM retailer_to_whole_details
        LEFT JOIN products_whole ON retailer_to_whole_details.product_id = products_whole.id
        WHERE retailer_to_whole_details.order_id = %s
    """

    data = (order_id,)
    cursor.execute(query, data)

    records = cursor.fetchall()  # Fetch all rows

    details = []
    for row in records:
        details.append({
            'order_id': row[0],
            'product_id': row[1],
            'quantity': row[2],
            'total_price': row[3],
            'product_name': row[4],
            'price_per_unit': row[5]
        })

    cursor.close()
    return details


def get_all_orders_retailer_to_wholesaler(connection, user_id):
    """
    Fetch all orders for a given user, along with their respective order details.
    """
    cursor = connection.cursor()

    query = """
        SELECT order_id, customer_name, date_time, phone_num, status, total, whole_id
        FROM retailer_to_whole
        WHERE user_id = %s
    """

    data = (user_id,)
    cursor.execute(query, data)

    orders = cursor.fetchall()  # Fetch all rows
    response = []

    for order in orders:
        order_dict = {'order_id': order[0], 'customer_name': order[1], 'datetime': order[2], 'phone_num': order[3],
                      'status': order[4], 'total': order[5], 'whole_id': order[6],
                      'order_details': get_order_details(connection, order[0])}

        # Fetch order details for each order and append to the order
        response.append(order_dict)
    return response


def get_all_orders_whole(connection, whole_id):
    """
    Fetch all orders for a given user, along with their respective order details.
    """
    cursor = connection.cursor()

    query = """
        SELECT order_id, customer_name, date_time, phone_num, status, total, user_id
        FROM retailer_to_whole
        WHERE whole_id = %s
    """

    data = (whole_id,)
    cursor.execute(query, data)

    orders = cursor.fetchall()  # Fetch all rows
    response = []

    for order in orders:
        order_dict = {'order_id': order[0], 'customer_name': order[1], 'datetime': order[2], 'phone_num': order[3],
                      'status': order[4], 'total': order[5], 'user_id': order[6],
                      'order_details': get_order_details(connection, order[0])}

        # Fetch order details for each order and append to the order
        response.append(order_dict)
    return response


def delete_transaction(connection, order_id):
    cursor = connection.cursor()

    try:
        # Step 1: Delete the order details for the specified order_id
        delete_order_details_query = "DELETE FROM retailer_to_whole_details WHERE order_id = %s"
        cursor.execute(delete_order_details_query, (order_id,))

        # Step 2: Delete the order from orders_table
        delete_order_query = "DELETE FROM retailer_to_whole WHERE order_id = %s"
        cursor.execute(delete_order_query, (order_id,))

        # Step 3: Commit the changes
        connection.commit()

        return f"Order with ID {order_id} and its details have been successfully deleted."

    except Exception as e:
        # Rollback in case of any errors
        connection.rollback()
        return str(e)


def get_all_wholesaler(connection):
    """
    Fetch all manufacturers' generated_unique_id and user_id from the users table and return them as a dictionary.

    Args:
        connection: Database connection object.

    Returns:
        dict: A dictionary where the keys are generated_unique_id and the values are user_id.

    Raises:
        ValueError: If no manufacturer users are found.
    """
    cursor = connection.cursor()

    try:
        # Query to fetch all manufacturers' IDs
        fetch_user_query = """
            SELECT generated_unique_id, user_id FROM users
            WHERE user_type = "wholesaler"
        """
        cursor.execute(fetch_user_query)
        users_result = cursor.fetchall()

        # Check if a result was found
        if not users_result:
            raise ValueError("No Wholesaler found at this moment. Please try again later.")

        # Create a dictionary from the results
        user_dict = {user[1]: user[0] for user in users_result}
        return user_dict

    except Exception as e:
        raise ValueError(f"Error fetching user_id: {e}")



def get_user_id_by_user_id(connection, user_id):
    cursor = connection.cursor()

    try:
        # Query to fetch the user_id based on manu_id
        fetch_user_query = """
            SELECT user_id FROM users WHERE generated_unique_id = %s
        """
        cursor.execute(fetch_user_query, (user_id,))
        user_result = cursor.fetchone()

        # Check if a result was found
        if user_result is None:
            raise ValueError(f"No user found with generated_unique_id = {user_id}")

        # Extract user_id from the result
        user_id = user_result[0]
        return user_id

    except Exception as e:
        raise ValueError(f"Error fetching user_id: {e}")



# razorpay

def razorpay_order_ret_to_whole(connection, cart_id):
    cursor = connection.cursor(buffered=True)  # Use buffered cursor for MySQL

    try:
        print(f"Debug: Starting Razorpay order consumer for cart_id: {cart_id}")

        # Step 1: Fetch order ID from cart
        fetch_order_id_query = "SELECT order_id FROM cart_whole WHERE cart_id = %s"
        cursor.execute(fetch_order_id_query, (cart_id,))
        result = cursor.fetchone()
        print(f"Debug: Result from fetch_order_id_query: {result}")

        if result is None:
            raise ValueError(f"Debug: No order_id found for cart_id {cart_id}.")

        order_id = result[0]
        print(f"Debug: Fetched order_id: {order_id}")

        # Step 2: Fetch order details from retailer_to_whole
        fetch_order_query = """
            SELECT order_id, customer_name, total, user_id, whole_id
            FROM retailer_to_whole
            WHERE order_id = %s
        """
        cursor.execute(fetch_order_query, (order_id,))
        result = cursor.fetchone()
        print(f"Debug: Result from fetch_order_query: {result}")

        if result is None:
            raise ValueError(f"Debug: No details found for order_id {order_id}.")

        # Unpack values for clarity and safety
        order_id, customer_name, total, user_id, manu_id = result
        print(f"Debug: Order details fetched - Order ID: {order_id}, Customer Name: {customer_name}, Total: {total}")

        # Step 3: Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(total * 100),  # Amount in paise
            "currency": "INR",
            "receipt": f"temp_order_{datetime.datetime.now().timestamp()}",
            "notes": {
                "customer_name": customer_name
            }
        })
        print(f"Debug: Razorpay order created - Order ID: {razorpay_order['id']}")

        # Step 4: Fetch order details for products
        fetch_order_details_query = """
            SELECT order_id, product_id, quantity, total_price, price_per_unit
            FROM retailer_to_whole_details
            WHERE order_id = %s
        """
        cursor.execute(fetch_order_details_query, (order_id,))
        order_details = cursor.fetchall()
        print(f"Debug: Result from fetch_order_details_query: {order_details}")

        if not order_details:
            raise ValueError(f"Debug: No details found for order_id {order_id}.")

        # Step 5: Return Razorpay order details
        response = {
            "razorpay_order_id": razorpay_order['id'],
            "total_amount": total,
            "convenience_fee": 50,
            "delivery_charge": 100,
            "temp_order_data": {
                "order": order_details,
                "user_id": user_id,
                "whole_id": manu_id,
                "final_total": total
            }
        }
        print(f"Debug: Final response: {response}")
        return response

    except Exception as e:
        connection.rollback()
        print(f"Debug: Exception occurred - {e}")
        return {"error": str(e)}

    finally:
        cursor.close()
        print("Debug: Cursor closed")

def update_order_status_transactions_ret_to_whole(connection, order_id):
    """
    Route to update the status of an order to 'paid' based on order_id.
    """
    try:
        cursor = connection.cursor()
        print(f"Debug: Starting status update for order_id: {order_id}")

        # Update the status column for the given order_id
        update_query = "UPDATE retailer_to_whole SET status = 'paid' WHERE order_id = %s"
        cursor.execute(update_query, (order_id,))
        print(f"Debug: Executed update query. Rows affected: {cursor.rowcount}")

        if cursor.rowcount > 0:
            connection.commit()
            print(f"Debug: Transaction committed successfully for order_id: {order_id}")
            return {"status": "success", "row_count": cursor.rowcount}
        else:
            print(f"Debug: No rows updated for order_id: {order_id}")
            return {"status": "failure", "message": "Order ID not found or already updated"}

    except Exception as e:
        connection.rollback()
        print(f"Error: Exception occurred - {e}")
        return {"status": "failure", "message": str(e)}

    finally:
        # Ensure the cursor is closed
        if 'cursor' in locals() and cursor is not None:
            cursor.close()
            print("Debug: Cursor closed")
