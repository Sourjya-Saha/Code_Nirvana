import qrcode
import json
import io
import base64
from encrypt_qr import encrypt_qr, decrypt_qr
from flask import Flask, request, jsonify, session, g, send_from_directory, send_file
import mysql.connector

#SQL connection
def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host='localhost',
            user='root',
            password='sourjya@1614',
            database='drug_inventory_2'
        )
    return g.db

def generate_qr_code(cart_id, receivers_addressM, receivers_addressW, receivers_addressR, date):
    # Create a dictionary to store the data
    qr_data = {
        'cart_id': cart_id,
        'receivers_addressM': receivers_addressM if receivers_addressM is not None else "",
        'receivers_addressW': receivers_addressW if receivers_addressW is not None else "",
        'receivers_addressR': receivers_addressR if receivers_addressR is not None else "",
        'date': date
    }
    print(qr_data)

    # Encrypt the data
    encrypted_qr_data_dict = encrypt_qr(qr_data)
    print(f'this is getting printed in the qr_code_generator function: {encrypted_qr_data_dict}')
    encrypted_qr_data = encrypted_qr_data_dict["encrypted_qr_data"]
    encryption_key = encrypted_qr_data_dict["encryption_key"]

    # Ensure we are passing the correct data into the QR code
    print(f"Encrypted QR Data (JSON): {json.dumps(encrypted_qr_data)}")

    # Convert the encrypted data to a JSON formatted string
    qr_data_json = json.dumps(encrypted_qr_data)

    # Generate the QR code
    img = qrcode.make(qr_data_json)

    # Convert the image to binary data using a BytesIO object
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)

    return img_byte_arr, encryption_key
#Example usage
# print(generate_qr_code(
#     cart_id='06',
#     receivers_addressW='0xf39fd6e5laad88f6f4ce6ab8827279cfffb92266',
#     receivers_addressR='0xc123',
#     date='2024-09-20',
#     distance='32 km',
#     price_per_unit='100'
# ))
