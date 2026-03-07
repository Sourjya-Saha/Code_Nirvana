from flask import Flask, request, jsonify
import requests
import face_recognition
import cv2
import os
import mysql.connector
from mysql.connector import Error
import json

app = Flask(__name__)

# DigiLocker API Configuration
DIGILOCKER_AUTH_URL = "https://api.digitallocker.gov.in/public/oauth2/1/authorize"
DIGILOCKER_TOKEN_URL = "https://api.digitallocker.gov.in/public/oauth2/1/token"
DIGILOCKER_FETCH_DOC_URL = "https://api.digitallocker.gov.in/public/oauth2/1/fetch"
CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
REDIRECT_URI = "YOUR_REDIRECT_URI"

# Database Configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "your_username",
    "password": "your_password",
    "database": "your_database"
}

REQUIRED_DOCUMENTS = {
    "aadhaar": "Aadhaar Card",
    "pan": "PAN Card",
    "business_registration": "Business Registration Certificate"
}


def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Database connection error: {e}")
        return None


@app.route("/start_kyc", methods=["POST"])
def start_kyc():
    """
    Starts the KYC process by fetching user details from the users table and redirecting to DigiLocker.
    """
    user_name = request.json.get("user_name")
    if not user_name:
        return jsonify({"error": "User name is required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = "SELECT generated_unique_id, user_name, user_num FROM users WHERE user_name = %s"
        cursor.execute(query, (user_name,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        user_id = user["generated_unique_id"]
        name = user["user_name"]
        number = user["user_num"]

        # Insert initial KYC record
        cursor.execute(
            "INSERT INTO kyc (user_id, name, number) VALUES (%s, %s, %s)",
            (user_id, name, number)
        )
        connection.commit()

        auth_url = f"{DIGILOCKER_AUTH_URL}?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&state={user_id}"
        return jsonify({"auth_url": auth_url})

    finally:
        connection.close()


@app.route("/digilocker_callback", methods=["GET"])
def digilocker_callback():
    """
    Handles DigiLocker OAuth2 callback to fetch the authorization code.
    """
    code = request.args.get("code")
    state = request.args.get("state")

    if not code or not state:
        return jsonify({"error": "Invalid callback request"}), 400

    token_response = requests.post(
        DIGILOCKER_TOKEN_URL,
        data={
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )

    if token_response.status_code != 200:
        return jsonify({"error": "Failed to fetch token"}), 500

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE kyc SET access_token = %s WHERE user_id = %s",
            (access_token, state)
        )
        connection.commit()
        return jsonify({"message": "DigiLocker authentication successful"})
    finally:
        connection.close()


@app.route("/fetch-documents", methods=["POST"])
def fetch_documents():
    """
    Fetches documents from DigiLocker using the access token and verifies the required documents.
    """
    user_id = request.json.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT access_token FROM kyc WHERE user_id = %s", (user_id,))
        kyc_record = cursor.fetchone()

        if not kyc_record or not kyc_record["access_token"]:
            return jsonify({"error": "User not authenticated"}), 400

        access_token = kyc_record["access_token"]
        fetch_response = requests.get(
            DIGILOCKER_FETCH_DOC_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if fetch_response.status_code != 200:
            return jsonify({"error": "Failed to fetch documents"}), 500

        documents = fetch_response.json().get("documents", [])
        cursor.execute(
            "UPDATE kyc SET documents = %s WHERE user_id = %s",
            (json.dumps(documents), user_id)
        )
        connection.commit()

        # Validate required documents
        missing_docs = [
            doc_name
            for key, doc_name in REQUIRED_DOCUMENTS.items()
            if not any(doc.get("name") == doc_name for doc in documents)
        ]

        if missing_docs:
            return jsonify({"error": "Missing required documents", "missing": missing_docs}), 400

        return jsonify({"message": "Documents fetched and verified successfully", "documents": documents})

    finally:
        connection.close()

@app.route("/verify-face", methods=["POST"])
def verify_face():
    """
    Verifies the user's face by comparing the uploaded image with the stored reference image.
    """
    user_id = request.form.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    if "image" not in request.files:
        return jsonify({"error": "Image file is required"}), 400

    uploaded_image = request.files["image"]

    # Save the uploaded image temporarily
    temp_image_path = "temp_uploaded_image.jpg"
    uploaded_image.save(temp_image_path)

    connection = get_db_connection()
    if not connection:
        os.remove(temp_image_path)  # Clean up temporary file
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cursor = connection.cursor(dictionary=True)

        # Fetch the reference image path for the user
        cursor.execute("SELECT reference_image_path FROM kyc WHERE user_id = %s", (user_id,))
        kyc_record = cursor.fetchone()

        if not kyc_record or not kyc_record["reference_image_path"]:
            os.remove(temp_image_path)  # Clean up temporary file
            return jsonify({"error": "No reference image found for the user"}), 404

        reference_image_path = kyc_record["reference_image_path"]

        # Load and compare the images
        uploaded_image_loaded = face_recognition.load_image_file(temp_image_path)
        reference_image_loaded = face_recognition.load_image_file(reference_image_path)

        # Encode faces
        uploaded_image_encoding = face_recognition.face_encodings(uploaded_image_loaded)
        reference_image_encoding = face_recognition.face_encodings(reference_image_loaded)

        # Ensure both images contain faces
        if len(uploaded_image_encoding) == 0 or len(reference_image_encoding) == 0:
            os.remove(temp_image_path)  # Clean up temporary file
            return jsonify({"error": "Face not detected in one or both images"}), 400

        # Compare the faces
        matches = face_recognition.compare_faces(
            [reference_image_encoding[0]], uploaded_image_encoding[0]
        )
        result = matches[0]

        os.remove(temp_image_path)  # Clean up temporary file

        if result:
            return jsonify({"message": "Face verification successful"})
        else:
            return jsonify({"error": "Face verification failed"}), 400

    except Exception as e:
        os.remove(temp_image_path)  # Clean up temporary file
        return jsonify({"error": f"An error occurred during face verification: {e}"}), 500

    finally:
        connection.close()


if __name__ == "__main__":
    app.run(debug=True)
