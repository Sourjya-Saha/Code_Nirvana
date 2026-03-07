from sql_connection import get_sql_connection
from datetime import date
import json


def add_products_to_cart_whole(connection, cart_id, products, user_id, cart_list, order_id):
    """
    Add multiple products to the cart or update their quantities if they already exist.
    Products with the same product_id will have their quantities aggregated.
    """
    cursor = connection.cursor()

    # Process cart_list for cart_involved column
    unique_carts = list(set(cart_list))
    cart_involved_json = json.dumps({
        str(i): {"cart_id": cart_id}
        for i, cart_id in enumerate(unique_carts)
    })

    try:
        # Aggregate products with same product_id
        product_aggregates = {}
        for product in products:
            product_id = product['product_id']
            if product_id in product_aggregates:
                product_aggregates[product_id]['quantity'] += product['quantity']
            else:
                product_aggregates[product_id] = {
                    'product_id': product_id,
                    'quantity': product['quantity']
                }

        # Convert aggregated products back to list format
        aggregated_products = list(product_aggregates.values())

        # Create products JSON where each product is indexed
        products_json = json.dumps({
            str(i): {
                "product_id": product['product_id'],
                "quantity": product['quantity']
            }
            for i, product in enumerate(aggregated_products)
        })

        reference_updates = []

        for product in aggregated_products:
            # Fetch current reference_cart JSON
            fetch_query = "SELECT reference_cart FROM products_whole WHERE id = %s"
            cursor.execute(fetch_query, (product['product_id'],))
            result = cursor.fetchone()

            if not result:
                continue

            current_reference = json.loads(result[0])
            remaining_quantity = product['quantity']
            updated_reference = {}
            indices_to_remove = []

            # Process each cart reference
            for idx in sorted(current_reference.keys()):
                cart_data = current_reference[idx]
                cart_quantity = cart_data['quantity']

                if remaining_quantity >= cart_quantity:
                    remaining_quantity -= cart_quantity
                    indices_to_remove.append(idx)
                else:
                    new_quantity = cart_quantity - remaining_quantity
                    cart_data['quantity'] = new_quantity
                    updated_reference[idx] = cart_data
                    remaining_quantity = 0

                if remaining_quantity == 0:
                    break

            # Add remaining cart references
            for idx in current_reference:
                if idx not in indices_to_remove and idx not in updated_reference:
                    updated_reference[idx] = current_reference[idx]

            # Reindex the dictionary
            final_reference = {
                str(i): data
                for i, data in enumerate(updated_reference.values())
            }

            # Collect data for batch updates
            reference_updates.append((
                json.dumps(final_reference),
                product['quantity'],
                product['product_id']
            ))

        # Batch update products_whole
        update_reference_query = """
            UPDATE products_whole 
            SET reference_cart = %s, 
                quantity_of_uom = quantity_of_uom - %s 
            WHERE id = %s
        """
        cursor.executemany(update_reference_query, reference_updates)

        # Single insert/update for cart_whole with products JSON
        cart_query = """
            INSERT INTO cart_whole (cart_id, products, user_id, cart_involved, order_id)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                products = VALUES(products),
                cart_involved = VALUES(cart_involved)
        """
        cursor.execute(cart_query, (
            cart_id,
            products_json,
            user_id,
            cart_involved_json,
            order_id
        ))

        connection.commit()
        return len(aggregated_products)  # Return number of unique products processed

    except Exception as e:
        connection.rollback()
        return str(e)

def get_cart_products_whole(connection, cart_id, user_id):
    """
    Fetch all products in a specific cart.

    connection: Database connection object.
    cart_id: Unique ID for the cart.
    List of products in the cart.
    """
    cursor = connection.cursor()

    query = """
        SELECT p.id AS product_id, p.name, p.price_per_unit, c.quantity, (p.price_per_unit * c.quantity) AS total_price
        FROM cart_whole c
        JOIN products_whole p ON c.product_id = p.id
        WHERE c.cart_id = %s AND c.user_id = %s
    """

    try:
        cursor.execute(query, (cart_id, user_id))
        products = cursor.fetchall()
        return products
    except Exception as e:
        return str(e)  # Return error message if something goes wrong


def get_all_cart_whole(connection, user_id):
    """
    Fetch all carts for a user, processing the JSON products column
    and joining with products_whole for price information.
    Using MySQL JSON functions.
    """
    cursor = connection.cursor()

    # Get all carts for the user
    cart_query = """
        SELECT cw.cart_id, cw.products, pw.id, pw.price_per_unit, pw.name, cw.order_id
        FROM cart_whole cw
        CROSS JOIN JSON_TABLE(
            cw.products,
            "$.*" COLUMNS (
                product_id INT PATH "$.product_id"
            )
        ) as p
        INNER JOIN products_whole pw ON pw.id = p.product_id
        WHERE cw.user_id = %s
        ORDER BY cw.cart_id;
    """

    try:
        cursor.execute(cart_query, (user_id,))
        response = {}

        for (cart_id, products_json, product_id, price_per_unit, name, order_id) in cursor:
            if cart_id not in response:
                response[cart_id] = {
                    'cart_id': cart_id,
                    'products': []
                }

            # Parse the products JSON string
            products_dict = json.loads(products_json) if isinstance(products_json, str) else products_json

            # Find the product in the JSON and add price information
            for product_data in products_dict.values():
                if product_data['product_id'] == product_id:
                    response[cart_id]['products'].append({
                        'product_id': product_id,
                        'quantity': product_data['quantity'],
                        'price_per_unit': float(price_per_unit) if price_per_unit else 0,
                        'name': name,
                        "order_id": order_id
                    })

        return list(response.values())

    except Exception as e:
        print(f"Error fetching cart data: {str(e)}")
        return []
    finally:
        cursor.close()


def delete_cart_whole(connection, cart_id):
    cursor = connection.cursor()
    query = "DELETE FROM cart_whole WHERE cart_id = %s"
    cursor.execute(query, (cart_id,))
    connection.commit()

    return cart_id