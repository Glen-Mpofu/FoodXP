import { StyleSheet, Text, View } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import React, { useState, useEffect, useRef } from 'react';

const CameraScreen = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaPermission, setHasMediaPermission] = useState(null);
  const [type, setType] = useState('back');
  const [flash, setFlash] = useState('off');
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPermission(mediaStatus === 'granted');
    })();
  }, []);

  if (hasCameraPermission === null || hasMediaPermission === null) {
    // Permissions are still loading
    return <View><Text>Loading permissions...</Text></View>;
  }

  if (!hasCameraPermission) {
    return <View><Text>No access to camera</Text></View>;
  }

  if (!hasMediaPermission) {
    return <View><Text>No access to media library</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Camera
          style = {styles.camera}
          type = {type}
          ref = {cameraRef}
      />

    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  camera: {

  }
});
