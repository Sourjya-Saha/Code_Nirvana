import mysql.connector
from mysql.connector import Error
import sql_connection

def get_location_from_met_add(connection, cart_id):
    try:
        cursor = connection.cursor(dictionary=True)

        # Query to fetch addresses from transactions
        print(f"cart_id={cart_id}")
        fetch_transaction_query = """
        SELECT manu_add, whole_add, ret_add FROM transactions WHERE cart_id = %s
        """
        cursor.execute(fetch_transaction_query, (cart_id,))
        transaction_result = cursor.fetchone()
        print(f"transaction result: {transaction_result}")

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

if __name__ == "__main__":
    connection = sql_connection.get_sql_connection()
    print(get_location_from_met_add(connection, 1))
