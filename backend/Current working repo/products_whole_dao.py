from sql_connection import get_sql_connection
from datetime import date
import json
import base64

def get_all_products_whole(connection, user_id):
    cursor = connection.cursor()

    query = ("""
        SELECT products_whole.id, products_whole.name, products_whole.price_per_unit, uom_table.uom_name, 
               products_whole.quantity_of_uom, products_whole.category, products_whole.exp_date, 
               products_whole.shelf_num, products_whole.picture_of_the_prod, products_whole.description, products_whole.reference_cart
        FROM products_whole
        INNER JOIN uom_table ON products_whole.uom_id = uom_table.uom_id
        WHERE products_whole.user_id = %s
    """)

    cursor.execute(query, (user_id,))

    response = []

    for (
        id,
        name,
        price_per_unit,
        uom_name,
        quantity_of_uom,
        category,
        exp_date,
        shelf_num,
        picture_of_the_prod,
        description,
        reference_cart
    ) in cursor:

        image_base64 = None
        if picture_of_the_prod:
            image_base64 = base64.b64encode(picture_of_the_prod).decode("utf-8")

        response.append({
            "product_id": id,
            "name": name,
            "price_per_unit": price_per_unit,
            "uom_name": uom_name,
            "quantity_of_uom": quantity_of_uom,
            "category": category,
            "exp_date": exp_date,
            "shelf_num": shelf_num,
            "picture_of_the_prod": image_base64,
            "description": description,
            "reference_cart": reference_cart
        })

    return response


def insert_new_product_whole(connection, product, user_id, cart_id=None):
    cursor = connection.cursor()

    # Create initial reference_cart JSON with nested structure
    initial_reference = json.dumps({
        "0": {  # Start with index 0
            "cart_id": cart_id,
            "quantity": product['quantity_of_uom']
        }
    })

    query = ("""
        INSERT INTO products_whole 
        (name, uom_id, price_per_unit, quantity_of_uom, category, exp_date, 
         shelf_num, picture_of_the_prod, description, user_id, reference_cart)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """)

    data = (
        product['name'],
        product['uom_id'],
        product['price_per_unit'],
        product['quantity_of_uom'],
        product['category'],
        product['exp_date'],
        product['shelf_num'],
        product['picture_of_the_prod'],
        product['description'],
        user_id,
        initial_reference
    )

    cursor.execute(query, data)
    connection.commit()

    return cursor.lastrowid


def delete_product_whole(connection, product_id):
    cursor = connection.cursor()
    query = "DELETE FROM products_whole WHERE id = %s"
    cursor.execute(query, (product_id,))
    connection.commit()

    return product_id  # Return the deleted product ID directly



def edit_product_whole(connection, product_id, updated_product):
    cursor = connection.cursor()

    query = ("""
        UPDATE products_whole SET
        name = %s,
        price_per_unit = %s,
        quantity_of_uom = %s,
        category = %s,
        shelf_num = %s,
        description = %s,
        exp_date = %s,
        picture_of_the_prod = %s
        WHERE id = %s
    """)

    data = (
        updated_product['name'],
        updated_product['price_per_unit'],
        updated_product['quantity_of_uom'],
        updated_product['category'],
        updated_product['shelf_num'],
        updated_product['description'],
        updated_product['exp_date'],
        updated_product['picture_of_the_prod'],
        product_id
    )

    cursor.execute(query, data)
    connection.commit()

    return cursor.rowcount

def add_cart_products(connection, cart_id, user_id):
    cursor = connection.cursor()

    query = ("""
        SELECT p.name, p.uom_id, p.price_per_unit, c.quantity as cart_quantity, p.category, 
               p.exp_date, p.shelf_num, p.picture_of_the_prod, p.description
        FROM cart_manu c
        JOIN products_manu p ON c.product_id = p.id
        WHERE c.cart_id = %s
    """)

    cursor.execute(query, (cart_id,))
    products_in_cart = cursor.fetchall()

    inserted_or_updated_product_ids = []

    for product in products_in_cart:
        product_data = {
            'name': product[0],
            'uom_id': product[1],
            'price_per_unit': product[2],
            'quantity_of_uom': product[3],  # Using cart_quantity
            'category': product[4],
            'exp_date': product[5],
            'shelf_num': product[6],
            'picture_of_the_prod': product[7],
            'description': product[8]
        }

        # Check if product exists
        check_query = """
            SELECT id, quantity_of_uom, reference_cart 
            FROM products_whole 
            WHERE name = %s AND user_id = %s
        """
        cursor.execute(check_query, (product_data['name'], user_id))
        existing_product = cursor.fetchone()

        if existing_product:
            product_id = existing_product[0]
            existing_quantity = existing_product[1]
            existing_reference_cart = existing_product[2] or '{}'

            try:
                cart_references = json.loads(existing_reference_cart)
            except json.JSONDecodeError:
                cart_references = {}

            # Check if cart_id already exists in any of the cart references
            cart_id_exists = any(
                ref.get("cart_id") == cart_id
                for ref in cart_references.values()
            )

            if cart_id_exists:
                print(f"Cart ID {cart_id} already exists in reference_cart for product '{product_data['name']}'")
                continue  # Skip this product and move to the next one

            # If cart_id doesn't exist, proceed with adding it with expiry date
            next_index = str(len(cart_references))
            cart_references[next_index] = {
                "cart_id": cart_id,
                "quantity": product_data['quantity_of_uom'],
                "exp_date": product_data['exp_date'].isoformat() if product_data['exp_date'] else None
            }

            new_quantity = existing_quantity + product_data['quantity_of_uom']

            update_query = """
                UPDATE products_whole 
                SET quantity_of_uom = %s, reference_cart = %s 
                WHERE id = %s
            """
            cursor.execute(update_query, (
                new_quantity,
                json.dumps(cart_references),
                product_id
            ))
            print(f"Updated product '{product_data['name']}' with new quantity: {new_quantity}")

            inserted_or_updated_product_ids.append(product_id)
        else:
            # For new products, create initial reference_cart with the cart_id and expiry date
            new_product_id = insert_new_product_whole(connection, product_data, user_id, cart_id)
            print(f"Inserted new product '{product_data['name']}' with ID: {new_product_id}")

            inserted_or_updated_product_ids.append(new_product_id)

    connection.commit()
    return inserted_or_updated_product_ids