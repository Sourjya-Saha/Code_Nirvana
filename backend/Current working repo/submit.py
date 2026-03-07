from extractor import extract

def submit(file_path, file_format):
    try:
        # Call the extract function to process the document
        data = extract(file_path, file_format)
        return data, None  # Return data and no error

    except Exception as e:
        print(f"An error occurred: {e}")
        return None, str(e)  # Return no data and an error message
