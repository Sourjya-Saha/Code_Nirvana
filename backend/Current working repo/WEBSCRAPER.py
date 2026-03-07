from flask import Flask, jsonify
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from pytrends.request import TrendReq
import time

app = Flask(__name__)

# Load the medications dataset
medications_df = pd.read_csv('medications.csv')

symptoms1 = ["itching", "skin rash", "continuous sneezing", "shivering", "chills"]
symptoms2 = ["headache", "vomiting", "cough", "fever", "muscle pain"]

# Preprocess the data
disease_list = medications_df['Disease'].unique()
disease_to_index = {disease: i for i, disease in enumerate(disease_list)}
medications_df['Disease_Index'] = medications_df['Disease'].map(disease_to_index)

# Prepare training data
X = []
y = []
for _, row in medications_df.iterrows():
    disease_index = row['Disease_Index']
    medications = eval(row['Medication'])  # Convert string representation of list to actual list
    for medication in medications:
        X.append([disease_index])
        y.append(medication)

X = np.array(X)
y = np.array(y)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the RandomForestClassifier model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Define a mapping of symptoms to diseases
symptom_disease_mapping = {
    "itching": ["Fungal infection", "Allergy", "Jaundice"],
    "skin rash": ["Allergy", "Psoriasis", "Impetigo"],
    "continuous sneezing": ["Allergy"],
    "shivering": ["Malaria", "Pneumonia"],
    "chills": ["Malaria", "Pneumonia"],
    "headache": ["Migraine", "Hypertension"],
    "vomiting": ["Gastroenteritis", "Migraine"],
    "cough": ["Bronchial Asthma", "Pneumonia"],
    "fever": ["Malaria", "Dengue"],
    "muscle pain": ["Flu", "Fibromyalgia"],
}


# Function to get data for a specific region
def get_symptom_data(region_code, symptoms):
    pytrends = TrendReq(hl='en-US', tz=360)
    pytrends.build_payload(symptoms, cat=0, timeframe='today 1-m', geo=region_code, gprop='')
    symptom_data = pytrends.interest_over_time()
    symptom_data = symptom_data.drop(columns=['isPartial'], errors='ignore')

    # Summing the interest for each symptom
    total_interest = symptom_data.sum().sort_values(ascending=False)

    # Creating a DataFrame with the specified column names
    symptom_df = pd.DataFrame(total_interest).reset_index()
    symptom_df.columns = ['symptoms', 'frequency']

    return symptom_df


# Function to get top 10 searched symptoms in India
def top_10_indian():
    india_interest1 = get_symptom_data('IN', symptoms=symptoms1)
    time.sleep(5)
    india_interest2 = get_symptom_data('IN', symptoms=symptoms2)

    # Concatenate and get top 10 symptoms
    top_10_india = pd.concat([india_interest1, india_interest2]).sort_values(by='frequency', ascending=False).head(10)


    filtered_top_10_india=top_10_india[top_10_india.frequency>top_10_india.frequency.quantile(0.001)]
    print(filtered_top_10_india)
    return filtered_top_10_india


# Define a function to predict medications based on symptoms
def predict_medications(top_symptoms):
    symptom_medications_map = {}

    for symptom in top_symptoms:
        if symptom in symptom_disease_mapping:
            diseases = symptom_disease_mapping[symptom]
            symptom_medications_map[symptom] = []  # Initialize list for this symptom

            for disease in diseases:
                if disease in disease_to_index:  # Check if disease exists in mapping
                    disease_index = disease_to_index[disease]
                    X_input = np.array([[disease_index]])  # Reshape to 1 feature
                    predicted_medications = model.predict(X_input)
                    symptom_medications_map[symptom].extend(predicted_medications)  # Collect medications

            # Remove duplicates for the symptom's medications
            symptom_medications_map[symptom] = list(set(symptom_medications_map[symptom]))

    # Format the map to return as key-value pairs (first medication per symptom or a list)
    formatted_medications_map = {}
    for symptom, medications in symptom_medications_map.items():
        # You can choose to return the first medication or all medications in a list
        formatted_medications_map[symptom] = medications if medications else ["No medications found"]

    return formatted_medications_map


# Flask route to handle the prediction using web-scraped data
@app.route('/predict_medications', methods=['GET'])
def predict():
    try:
        # Get top symptoms based on web-scraped data
        top_symptoms_df = top_10_indian()
        top_symptoms = top_symptoms_df['symptoms'].tolist()  # List of symptoms

        # Predict medications based on top symptoms
        symptom_medications_map = predict_medications(top_symptoms)

        # Return the predicted medications as a JSON response
        return jsonify(symptom_medications_map), 200  # Return the structured map
    except KeyError as e:
        return jsonify({"error": f"Symptom not found: {e}"}), 400
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8000)
