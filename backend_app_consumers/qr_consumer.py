import location_setter


def qr_code_details(connection, qr_data):
    cart_id = qr_data['cart_id']
    result = location_setter.get_location_from_met_add(connection, cart_id)
    connection.close()
    return result