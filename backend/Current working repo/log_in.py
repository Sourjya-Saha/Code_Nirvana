import hashlib

def log_in(connection, username, password):
    cursor = connection.cursor()

    # Hash the entered password to match it with the stored one
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    # SQL query to find the user
    log_in_query = "SELECT * FROM users WHERE user_id = %s AND password = %s"
    log_in_data = (username, hashed_password)

    cursor.execute(log_in_query, log_in_data)
    user = cursor.fetchone()

    cursor.close()

    if user:
        # Return the unique user ID and a success status
        return {'status': 'success', 'unique_user_id': user[0]}
    else:
        # Return an error message if login fails
        return {'status': 'failure', 'message': 'Error: Incorrect username or password.'}
