import datetime
from sql_connection import get_sql_connection


def insert_order(connection, order, user_id):
    cursor = connection.cursor()

    try:
        # Step 1: Insert into the orders_table (initially total is set to 0)
        order_query = """
            INSERT INTO orders_table (customer_name, total, date_time, phone_num, status, user_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        order_data = (
            order['customer_name'],
            0,  # Placeholder for total, will be updated later
            datetime.datetime.now(),  # Ensure datetime is imported
            order['phone_num'],
            order['status'],
            user_id
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

        # Return the order ID
        return order_id

    except Exception as e:
        # Rollback in case of an error
        connection.rollback()
        return str(e)


import datetime

def update_order(connection, order_id, order):
    cursor = connection.cursor()

    try:
        # Step 1: Update the order in the orders_table
        update_order_query = """
            UPDATE orders_table 
            SET customer_name = %s, total = %s, date_time = %s, phone_num = %s, status = %s 
            WHERE order_id = %s
        """

        # Step 2: Fetch price_per_unit for each product and calculate grand total
        grand_total = 0
        order_details_data = []

        for detail in order['order_details']:
            # Query to get the price_per_unit and current stock
            fetch_price_query = "SELECT price_per_unit, quantity_of_uom FROM products WHERE id = %s"
            cursor.execute(fetch_price_query, (detail['product_id'],))
            result = cursor.fetchone()

            if result is None:
                raise ValueError(f"Product with ID {detail['product_id']} not found in products table.")

            price_per_unit, current_quantity = result

            # Query to fetch the previous quantity for this product in the order
            fetch_previous_quantity_query = """
                SELECT quantity FROM order_details 
                WHERE order_id = %s AND product_id = %s
            """
            cursor.execute(fetch_previous_quantity_query, (order_id, detail['product_id']))
            previous_quantity_result = cursor.fetchone()

            previous_quantity = float(previous_quantity_result[0]) if previous_quantity_result else 0

            # Calculate the quantity difference for this product
            quantity_difference = float(detail['quantity']) - previous_quantity

            # Validate stock availability if increasing the quantity
            if quantity_difference > 0 and current_quantity < quantity_difference:
                raise ValueError(f"Insufficient stock for product ID {detail['product_id']}.")

            # Update the stock based on the quantity difference
            update_stock_query = """
                UPDATE products 
                SET quantity_of_uom = quantity_of_uom - %s 
                WHERE id = %s
            """
            cursor.execute(update_stock_query, (quantity_difference, detail['product_id']))

            # Calculate total price for this order detail
            total_price = float(detail['quantity']) * price_per_unit
            grand_total += total_price

            # Prepare data for order details insertion
            order_details_data.append((order_id, detail['product_id'], detail['quantity'], total_price, price_per_unit))

        # Update the orders table with the new grand total
        update_order_data = (
            order['customer_name'],
            grand_total,
            datetime.datetime.now(),
            order['phone_num'],
            order['status'],
            order_id
        )
        cursor.execute(update_order_query, update_order_data)

        # Step 3: Delete existing order details
        delete_order_details_query = "DELETE FROM order_details WHERE order_id = %s"
        cursor.execute(delete_order_details_query, (order_id,))

        # Step 4: Insert the updated order details
        insert_order_details_query = """
            INSERT INTO order_details (order_id, product_id, quantity, total_price, price_per_unit)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_order_details_query, order_details_data)

        # Step 5: Commit the changes
        connection.commit()
        return order_id

    except Exception as e:
        connection.rollback()  # Rollback in case of any failure
        raise e  # Re-raise the exception for handling outside the function








def get_order_details(connection, order_id):
    """
    Fetch order details including product information for a given order ID.
    """
    cursor = connection.cursor()

    query = """
        SELECT order_details.order_id, products.id, order_details.quantity, order_details.total_price, 
               products.name AS product_name, products.price_per_unit
        FROM order_details
        LEFT JOIN products ON order_details.product_id = products.id
        WHERE order_details.order_id = %s
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


def get_all_orders(connection, user_id):
    """
    Fetch all orders for a given user, along with their respective order details.
    """
    cursor = connection.cursor()

    query = """
        SELECT order_id, customer_name, date_time, phone_num, status, total
        FROM orders_table
        WHERE user_id = %s
    """

    data = (user_id,)
    cursor.execute(query, data)

    orders = cursor.fetchall()  # Fetch all rows
    response = []

    for order in orders:
        order_dict = {'order_id': order[0], 'customer_name': order[1], 'datetime': order[2], 'phone_num': order[3],
                      'status': order[4], 'total': order[5], 'order_details': get_order_details(connection, order[0])}

        # Fetch order details for each order and append to the order
        response.append(order_dict)
    return response


def delete_order(connection, order_id):
    cursor = connection.cursor()

    try:
        # Step 1: Delete the order details for the specified order_id
        delete_order_details_query = "DELETE FROM order_details WHERE order_id = %s"
        cursor.execute(delete_order_details_query, (order_id,))

        # Step 2: Delete the order from orders_table
        delete_order_query = "DELETE FROM orders_table WHERE order_id = %s"
        cursor.execute(delete_order_query, (order_id,))

        # Step 3: Commit the changes
        connection.commit()

        return f"Order with ID {order_id} and its details have been successfully deleted."

    except Exception as e:
        # Rollback in case of any errors
        connection.rollback()
        return str(e)


if __name__ == '__main__':
    connection = get_sql_connection()
    print(get_all_orders(connection))
    # print(get_order_details(connection,4))
    # print(insert_order(connection, {
    #     'customer_name': 'dhaval',
    #     'total': '500',
    #     'datetime': datetime.now(),
    #     'order_details': [
    #         {
    #             'product_id': 1,
    #             'quantity': 2,
    #             'total_price': 50
    #         },
    #         {
    #             'product_id': 3,
    #             'quantity': 1,
    #             'total_price': 30
    #         }
    #     ]
    # }))