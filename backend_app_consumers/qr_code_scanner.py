import cv2
import pyzbar.pyzbar as pyzbar
from encrypt_qr import decrypt_qr
from flask import Flask, request, jsonify, session, g, send_from_directory, send_file
import mysql.connector
import json
from encrypt_qr import decrypt_cart_id

def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host='localhost',
            user='root',
            password='sourjya@1614',
            database='drug_inventory_2'
        )
    return g.db


def get_encryption_key(cart_id):
    connection = None
    cursor = None
    try:
        connection = get_db()
        if not connection.is_connected():
            print("Error: Database connection failed")
            return None

        cursor = connection.cursor()
        query = "SELECT encryption_key FROM encryption_keys WHERE cart_id = %s"
        cursor.execute(query, (cart_id,))
        result = cursor.fetchone()

        return result[0] if result else None

    except Exception as e:
        print(f"Error: Failed to retrieve encryption key: {str(e)}")
        return None
    finally:
        if cursor:
            cursor.close()


def scan_qr_codes(url):
    cap = None
    try:
        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            print(f"Error: Could not open video stream from {url}")
            return None

        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame")
                break

            frame = cv2.resize(frame, (0, 0), fx=0.50, fy=0.50)
            qr_codes = pyzbar.decode(frame)

            for qr_code in qr_codes:
                qr_data = qr_code.data.decode("utf-8")
                qr_type = qr_code.type

                if qr_type == "QRCODE":
                    try:
                        qr_data_json = json.loads(qr_data)
                        print(f"Parsed QR Data (JSON): {qr_data_json}")

                        # Decrypt cart_id first
                        cart_id_dict = decrypt_cart_id(qr_data_json)
                        if not cart_id_dict or "cart_id" not in cart_id_dict:
                            print("Error: Failed to decrypt cart_id")
                            continue

                        cart_id = cart_id_dict["cart_id"]
                        if not cart_id:
                            print("Error: Decrypted cart_id is empty")
                            continue

                        # Get encryption key
                        encryption_key = get_encryption_key(cart_id)
                        if not encryption_key:
                            print(f"Error: No encryption key found for cart_id: {cart_id}")
                            return None

                        # Decrypt full data
                        final_decrypted_data = decrypt_qr(cart_id, qr_data, encryption_key)
                        return final_decrypted_data

                    except json.JSONDecodeError as e:
                        print(f"Error: Invalid JSON format in QR data: {str(e)}")
                    except Exception as e:
                        print(f"Error processing QR code: {str(e)}")
                        return None

        return None
    finally:
        if cap:
            cap.release()

# Example usage
# scan_qr_codes("http://192.168.142.191:8080/video")