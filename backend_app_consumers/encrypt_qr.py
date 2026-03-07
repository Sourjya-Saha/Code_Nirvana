import random
import string
import json

# Generate characters and their shuffled keys
chars = " " + string.punctuation + string.digits + string.ascii_letters
chars = list(chars)

# Use the provided fixed key for cart_id encryption
FIXED_KEY = "Z&oEi'h)zFu7^3V_kn.<>1e8]X5*2cdbrC-4jsRNWJ`v,|UgMQ!AwfOSP\\a?@/96HKtI G\"(x=mD$[#~lq0+LB;}%{TypY:"


def generate_key():
    key_list = chars.copy()
    random.shuffle(key_list)
    return "".join(key_list)  # Return key as a string


def encrypt_field(value, key):
    """
    Encrypt a single field using a given key.
    Handles null values by returning an empty string.
    """
    if value is None:
        return ""  # Return empty string for null values

    encrypted_value = ""
    for char in str(value):
        index = chars.index(char)
        encrypted_value += key[index]
    return encrypted_value


def encrypt_qr(qr_data):
    """
    Encrypts all fields of the QR data. Uses a fixed key for cart_id encryption.

    Args:
        qr_data (dict): The QR data to encrypt.

    Returns:
        dict: Encrypted QR data along with the encryption key (as a string).
    """
    dynamic_key = generate_key()  # Generate a dynamic key as a string
    print(f"Dynamic Key: {dynamic_key}")
    encrypted_data = {}

    for field, value in qr_data.items():
        if field == "cart_id":
            # Encrypt cart_id with the fixed key
            encrypted_data[field] = encrypt_field(value, FIXED_KEY)
        else:
            # Encrypt other fields with the dynamic key
            encrypted_data[field] = encrypt_field(value, dynamic_key)

    return {"encrypted_qr_data": encrypted_data, "encryption_key": dynamic_key}


def decrypt_qr(cart_id, encrypted_qr_data, encryption_key):

    print(encrypted_qr_data)
    key_list = list(encryption_key)  # Convert key string back to list
    print(f'key list: {key_list}')
    encrypted_qr_data = json.loads(encrypted_qr_data)
    print(f"Parsed QR Data (JSON): {encrypted_qr_data}")
    decrypted_data = {"cart_id": cart_id}  # Preserve cart_id as is
    print(f'decrypted data: {decrypted_data}')

    for field, value in encrypted_qr_data.items():
        if field == "cart_id":
            continue
        decrypted_value = ""
        for char in value:
            index = key_list.index(char)
            decrypted_value += chars[index]
        decrypted_data[field] = decrypted_value
    print(decrypted_data)

    return decrypted_data


def decrypt_field(value, key):
    """
    Decrypt a single field using a given key.
    Returns empty string for null/empty values.
    """
    if not value:  # Handle null/empty values
        return ""

    decrypted_value = ""
    for char in value:
        try:
            index = key.index(char)
            decrypted_value += chars[index]
        except ValueError as e:
            print(f"Error: Character '{char}' not found in key")
            raise

    return decrypted_value


def decrypt_cart_id(encrypted_qr_data):
    try:
        decrypted_cart_id = {}
        cart_id_value = encrypted_qr_data.get("cart_id")

        if not cart_id_value:
            print("Error: No cart_id found in encrypted data")
            return None

        decrypted_cart_id["cart_id"] = decrypt_field(cart_id_value, FIXED_KEY)
        return decrypted_cart_id

    except Exception as e:
        print(f"Error decrypting cart_id: {str(e)}")
        return None

# for app
def decrypt_qr_app(cart_id, encrypted_qr_data, encryption_key):
    """
    Decrypt QR data with null value handling
    """
    try:
        key_list = list(encryption_key)
        encrypted_data = json.loads(encrypted_qr_data)
        decrypted_data = {"cart_id": cart_id}

        for field, value in encrypted_data.items():
            if field == "cart_id":
                continue

            # Handle empty strings (null values from encryption)
            if value == "":
                decrypted_data[field] = None
                continue

            try:
                decrypted_value = decrypt_field(value, key_list)
                # Convert empty strings back to None
                decrypted_data[field] = None if decrypted_value == "" else decrypted_value
            except Exception as e:
                print(f"Error decrypting field {field}: {str(e)}")
                decrypted_data[field] = None

        return decrypted_data

    except Exception as e:
        print(f"Error in decrypt_qr: {str(e)}")
        return None


def decrypt_field_app(value, key):
    """
    Decrypt a single field with null value handling
    """
    if not value:
        return ""

    try:
        decrypted_value = ""
        for char in value:
            index = key.index(char)
            decrypted_value += chars[index]
        return decrypted_value
    except ValueError as e:
        print(f"Error: Invalid character in encrypted data")
        raise


def decrypt_cart_id_app(encrypted_cart_id):
    """
    Decrypt cart_id with better error handling
    """
    try:
        if not encrypted_cart_id:
            print("Error: Empty cart_id provided")
            return None

        decrypted_value = decrypt_field(encrypted_cart_id, FIXED_KEY)
        return {"cart_id": decrypted_value} if decrypted_value else None

    except Exception as e:
        print(f"Error decrypting cart_id: {str(e)}")
        return None


# Example Usage
if __name__ == "__main__":
    qr_data = {
        "cart_id": "6177",
        "recivers_addressM": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "recivers_addressW": "0xd7BfC29983527b31724F98a6dA8Bb13473023E84",
        "recivers_addressR": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "Date": "2024-12-13"
    }

    # Encrypt the QR data
    result = encrypt_qr(qr_data)
    encrypted_qr = result["encrypted_qr_data"]
    encryption_key = result["encryption_key"]

    print("Original QR Data:", qr_data)
    print("Encrypted QR Data:", encrypted_qr)
    print("Encryption Key (Dynamic):", encryption_key)

    # Decrypt the QR data
    decrypted_qr = decrypt_qr(json.dumps(encrypted_qr), encryption_key)
    print("Decrypted QR Data:", decrypted_qr)
