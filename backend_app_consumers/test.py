import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='aritra',  # or '' if blank
        database='drug_inventory'
    )
    print("Connection successful!")
    conn.close()
except mysql.connector.Error as err:
    print("Connection failed:", err)
