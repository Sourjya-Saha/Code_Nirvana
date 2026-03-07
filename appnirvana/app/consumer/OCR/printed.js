import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from 'react-native-paper'; // Using Paper for better UI components

export default function Printed({ route, navigation }) {
  const { uniqueid, storeid, storename } = route.params;
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [error, setError] = useState(null);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        Alert.alert('Cancelled', 'File selection was cancelled.');
        return;
      }

      // In Expo, the file object structure is different
      const file = {
        name: result.assets[0].name,
        size: result.assets[0].size,
        uri: result.assets[0].uri,
        type: 'application/pdf'
      };
      
      setSelectedFile(file);
      Alert.alert('File Selected', `File: ${file.name}`);
    } catch (error) {
      Alert.alert('Error', `Error selecting file: ${error.message}`);
    }
  };

  const handleExtract = () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please upload a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: selectedFile.uri,
      type: 'application/pdf',
      name: selectedFile.name
    });
    formData.append('file_format', 'prescription');

    setLoading(true);
    fetch('http://127.0.0.1:5000/extractFromDoc', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          let filteredData = data.message;
          if (filteredData.medicines && Array.isArray(filteredData.medicines)) {
            filteredData.medicines = filteredData.medicines.filter(med => med.length > 1);
          }
          setExtractedData(filteredData);
          setError(null);
        } else {
          setError(data.error || 'Unknown error occurred.');
        }
      })
      .catch(err => {
        setError('Error occurred while extracting data.');
        console.error('Error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSubmit = () => {
    if (extractedData.medicines && extractedData.medicines.length > 0) {
      navigation.navigate('Store', {
        searchMedicines: extractedData.medicines,
        uniqueid,
        storeid,
        storename,
      });
    } else {
      Alert.alert('Error', 'No medicines found to search.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Printed Prescription</Text>
      <Text style={styles.subtitle}>Store ID: {storeid} | User: {uniqueid}</Text>

      <Button
        mode="contained"
        onPress={handleFilePick}
        style={styles.button}
      >
        Select PDF File
      </Button>

      {selectedFile && (
        <Text style={styles.fileInfo}>
          Selected File: {selectedFile.name} ({selectedFile.size} bytes)
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleExtract}
        style={styles.button}
        disabled={!selectedFile}
      >
        Extract Data from File
      </Button>

      {loading && <ActivityIndicator size="large" color="#6200ee" />}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {extractedData.medicines && extractedData.medicines.length > 0 && (
        <View style={styles.medicinesContainer}>
          <Text style={styles.medicinesTitle}>Medicines:</Text>
          <ScrollView style={styles.scrollView}>
            {extractedData.medicines.map((medicine, index) => (
              <Text key={index} style={styles.medicineItem}>{medicine}</Text>
            ))}
          </ScrollView>
        </View>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.button}
        disabled={!(extractedData.medicines && extractedData.medicines.length > 0)}
      >
        Search Medicine
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    color: '#6200ee',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    marginVertical: 10,
    width: '100%',
    borderRadius: 8,
  },
  fileInfo: {
    marginVertical: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: '#B00020',
    marginVertical: 10,
  },
  medicinesContainer: {
    marginTop: 20,
    alignItems: 'flex-start',
    width: '100%',
    maxHeight: 200,
  },
  scrollView: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  medicinesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1c1c1c',
  },
  medicineItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});