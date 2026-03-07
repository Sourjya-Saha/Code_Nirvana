from sql_connection import get_sql_connection
from datetime import datetime
import base64


# -------------------------
# Helper: Convert date properly
# -------------------------
def format_date(date_string):
    """
    Converts:
    'Tue, 10 Mar 2026 00:00:00 GMT'
    OR
    '2026-03-10'
    → '2026-03-10'
    """
    try:
        # If coming in GMT format
        if "GMT" in date_string:
            dt = datetime.strptime(date_string, "%a, %d %b %Y %H:%M:%S %Z")
        else:
            dt = datetime.strptime(date_string, "%Y-%m-%d")

        return dt.strftime("%Y-%m-%d")

    except Exception:
        return None


# -------------------------
# GET PRODUCTS (with base64 image)
# -------------------------
def get_all_products_manu(connection, user_id):
    cursor = connection.cursor()

    query = """
        SELECT products_manu.id, products_manu.name, products_manu.price_per_unit,
               uom_table.uom_name, products_manu.quantity_of_uom,
               products_manu.category, products_manu.exp_date,
               products_manu.shelf_num, products_manu.picture_of_the_prod,
               products_manu.description
        FROM products_manu
        INNER JOIN uom_table
        ON products_manu.uom_id = uom_table.uom_id
        WHERE products_manu.user_id = %s
    """

    cursor.execute(query, (user_id,))

    response = []

    for (id, name, price_per_unit, uom_name, quantity_of_uom,
         category, exp_date, shelf_num, picture_blob, description) in cursor:

        # Convert BLOB → Base64
        encoded_image = None
        if picture_blob:
            encoded_image = base64.b64encode(picture_blob).decode("utf-8")

        response.append({
            'product_id': id,
            'name': name,
            'price_per_unit': float(price_per_unit),
            'uom_name': uom_name,
            'quantity_of_uom': quantity_of_uom,
            'category': category,
            'exp_date': exp_date.strftime("%Y-%m-%d") if exp_date else None,
            'shelf_num': shelf_num,
            'picture_of_the_prod': encoded_image,
            'description': description
        })

    return response


# -------------------------
# INSERT PRODUCT (with BLOB)
# -------------------------
def insert_new_product_manu(connection, product, user_id, image_blob):
    cursor = connection.cursor()

    formatted_date = format_date(product['exp_date'])

    query = """
        INSERT INTO products_manu
        (name, uom_id, price_per_unit, quantity_of_uom,
         category, exp_date, shelf_num,
         picture_of_the_prod, description, user_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    data = (
        product['name'],
        product['uom_id'],
        product['price_per_unit'],
        product['quantity_of_uom'],
        product['category'],
        formatted_date,
        product['shelf_num'],
        image_blob,   # ✅ BLOB
        product['description'],
        user_id
    )

    cursor.execute(query, data)
    connection.commit()

    return cursor.lastrowid


# -------------------------
# DELETE PRODUCT
# -------------------------
def delete_product_manu(connection, product_id):
    cursor = connection.cursor()
    cursor.execute("DELETE FROM products_manu WHERE id = %s", (product_id,))
    connection.commit()
    return product_id


# -------------------------
# EDIT PRODUCT (Date Fixed + Optional Image Update)
# -------------------------
def edit_product_manu(connection, product_id, updated_product, image_blob=None):
    cursor = connection.cursor()

    formatted_date = format_date(updated_product['expiry_date'])

    # If image is updated
    if image_blob:
        query = """
            UPDATE products_manu SET
                name = %s,
                price_per_unit = %s,
                quantity_of_uom = %s,
                category = %s,
                shelf_num = %s,
                description = %s,
                exp_date = %s,
                picture_of_the_prod = %s
            WHERE id = %s
        """

        data = (
            updated_product['name'],
            updated_product['price_per_unit'],
            updated_product['quantity_of_uom'],
            updated_product['category'],
            updated_product['shelf_num'],
            updated_product['description'],
            formatted_date,
            image_blob,
            product_id
        )

    else:
        query = """
            UPDATE products_manu SET
                name = %s,
                price_per_unit = %s,
                quantity_of_uom = %s,
                category = %s,
                shelf_num = %s,
                description = %s,
                exp_date = %s
            WHERE id = %s
        """

        data = (
            updated_product['name'],
            updated_product['price_per_unit'],
            updated_product['quantity_of_uom'],
            updated_product['category'],
            updated_product['shelf_num'],
            updated_product['description'],
            formatted_date,
            product_id
        )

    cursor.execute(query, data)
    connection.commit()

    return cursor.rowcount