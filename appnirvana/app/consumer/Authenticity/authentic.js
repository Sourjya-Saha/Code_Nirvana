import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as ExCamera from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function Authentic({ navigation, route }) {
  const { uniqueid } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [mediaPermission, setMediaPermission] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const getPermissions = async () => {
      try {
        const cameraStatus = await ExCamera.Camera.requestCameraPermissionsAsync();
        const mediaStatus = await MediaLibrary.requestPermissionsAsync();
        setHasPermission(cameraStatus.status === 'granted');
        setMediaPermission(mediaStatus.status === 'granted');
      } catch (error) {
        setHasPermission(false);
      }
    };

    getPermissions();
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      timerRef.current = setTimeout(() => {
        setIsCameraActive(false);
      }, 10000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isCameraActive]);

  const capturePhoto = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          exif: true,
        });

        if (mediaPermission) {
          const asset = await MediaLibrary.createAssetAsync(photo.uri);
          navigation.navigate('Qrdetails', { photoPath: asset.uri });
        } else {
          Alert.alert('Permission Required', 'Media library permission is needed to save photos.');
        }
      }
    } catch (error) {
      Alert.alert('Error', `Failed to save photo: ${error.message}`);
    }
  };

  const handleTapToActivateCamera = () => {
    setIsCameraActive(true);
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Product QR for Details</Text>

      <TouchableOpacity 
        style={styles.cameraContainer} 
        onPress={handleTapToActivateCamera}
      >
        {isCameraActive ? (
          <ExCamera.CameraView
            ref={cameraRef}
            style={styles.camera}
          >
            <View style={styles.cameraContent} />
          </ExCamera.CameraView>
        ) : (
          <View style={styles.inactiveCamera}>
            <Text style={styles.inactiveText}>Camera Off - Tap to Turn On</Text>
          </View>
        )}
      </TouchableOpacity>

      {isCameraActive && (
        <Button 
          title="Capture Photo" 
          onPress={capturePhoto} 
          disabled={!isCameraActive} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f4f7ff',
  },
  cameraContainer: {
    width: '90%',
    height: '50%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraContent: {
    flex: 1,
  },
  inactiveCamera: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  inactiveText: {
    color: '#555',
    fontSize: 16,
  },
  title: {
    color: '#0a47f0',
    fontSize: 18,
    marginBottom: 10,
  },
});
