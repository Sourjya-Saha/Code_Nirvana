from sql_connection import get_sql_connection
from datetime import date

def get_all_products_manu(connection, user_id):
    cursor = connection.cursor()

    query = ("""
            SELECT products_manu.id, products_manu.name, products_manu.price_per_unit, uom_table.uom_name, 
                   products_manu.quantity_of_uom, products_manu.category, products_manu.exp_date, 
                   products_manu.shelf_num, products_manu.picture_of_the_prod, products_manu.description
            FROM products_manu
            INNER JOIN uom_table ON products_manu.uom_id = uom_table.uom_id
            WHERE products_manu.user_id = %s
        """)

    # Execute the query with the provided user_id
    cursor.execute(query, (user_id,))


    response = []
    for (id, name, price_per_unit, uom_name, quantity_of_uom, category, exp_date, shelf_num, picture_of_the_prod, description) in cursor:
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


def insert_new_product_manu(connection, product, user_id):
    cursor = connection.cursor()
    query = ("INSERT INTO products_manu "
             "(name, uom_id, price_per_unit, quantity_of_uom, category, exp_date, shelf_num, picture_of_the_prod, description, user_id) "
             "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)")
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
        user_id  # Adding the user_id to the insert query
    )

    cursor.execute(query, data)
    connection.commit()

    return cursor.lastrowid


def delete_product_manu(connection, product_id):
    cursor = connection.cursor()
    query = "DELETE FROM products_manu WHERE id = %s"
    cursor.execute(query, (product_id,))
    connection.commit()

    return product_id  # Return the deleted product ID directly



def edit_product_manu(connection, product_id, updated_product):
    cursor = connection.cursor()
    query = ("UPDATE products_manu SET "
             "name = %s, "
             "price_per_unit = %s, "
             "quantity_of_uom = %s, "
             "category = %s, "
             "shelf_num = %s, "
             "description = %s, "
             "exp_date = %s "
             "WHERE id = %s")

    data = (
        updated_product['name'],
        updated_product['price_per_unit'],
        updated_product['quantity_of_uom'],
        updated_product['category'],
        updated_product['shelf_num'],
        updated_product['description'],
        updated_product['expiry_date'],
        product_id
    )

    cursor.execute(query, data)
    connection.commit()

    return cursor.rowcount





if __name__ == '__main__':
    connection = get_sql_connection()
    print(get_all_products_manu(connection))
    print(insert_new_product_manu(connection, {
        'name': "Bspirin",
        'uom_id': 1,
        'price_per_unit': 50,
        'quantity_of_uom': 100,
        'category': 'fever',
        'exp_date': date(2025, 4, 19),
        'shelf_num': 4,
        'picture_of_the_prod': 'link',
        'description': 'description'
    }, 1))

    # delete_product_manu(connection, 1)