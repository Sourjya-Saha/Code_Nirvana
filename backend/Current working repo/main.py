from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from extractor import extract
import uuid
from submit import submit

app = Flask(__name__)
CORS(app)  # This will allow all origins by default

@app.route('/')
def serve_index():
    # Serve the React app's index.html file
    return send_from_directory('../frontend/src/landing_page/warehouse', 'OCR.js')

@app.route('/<path:filename>')
def serve_static_file(filename):
    # Serve static files from the React app's build directory
    return send_from_directory('../frontend/src/landing_page/warehouse', filename)

@app.route('/extractFromDoc', methods=['POST'])
def extract_from_doc():
    file_format = request.form.get('file_format')
    file = request.files['file']

    # Save the uploaded file
    file_path = os.path.join("uploads", str(uuid.uuid4()) + ".pdf")
    file.save(file_path)

    # Call the submit function to extract the data
    data, error = submit(file_path, file_format)

    # Clean up the file after processing
    if os.path.exists(file_path):
        os.remove(file_path)

    if error:
        return jsonify({'status': 'error', 'message': error}), 500

    # Return the extracted data as a JSON response
    return jsonify({"message": data}), 201

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)





