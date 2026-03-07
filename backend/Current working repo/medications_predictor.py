import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load the medications dataset
medications_df = pd.read_csv('medications.csv')

# Preprocess the data
disease_list = medications_df['Disease'].unique()
disease_to_index = {disease: i for i, disease in enumerate(disease_list)}
medications_df['Disease_Index'] = medications_df['Disease'].map(disease_to_index)

X = []
y = []
for _, row in medications_df.iterrows():
    disease_index = row['Disease_Index']
    medications = row['Medication'].split(', ')
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

# Define a function to predict medications based on symptoms
def predict_medications(top_symptoms):
    symptom_indices = [disease_to_index[symptom] for symptom in top_symptoms]
    X_input = np.array(symptom_indices).reshape(1, -1)
    predicted_medications = model.predict(X_input)
    return predicted_medications

# Example usage
# top_10_symptoms = top_10_indian()
# predicted_medications = predict_medications(top_10_symptoms.index)
# print("Predicted medications for the top 10 symptoms in India:")
# for medication in predicted_medications:
#     print(medication)