import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Button, Image, TouchableOpacity } from "react-native";

//camera
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library"

//themed components 
import ThemedButton from "../../components/ThemedButton"
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"

//icons
import { Ionicons } from "@expo/vector-icons";

import { useIsFocused } from "@react-navigation/native";

export default function CameraScreen() {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [hasMediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  //torch
  const [enableTorch, setEnableTorch] = useState(false);
  const [torchIcon, setTorchIcon] = useState("flash-off")

  //only renders the camera when the camera screen is open
  const isFocused = useIsFocused();

  //camera availability
  const [cameraAvailable, setCameraAvailable] = useState(null);

  useEffect(() => {
    const checkCamera = async () => {
      const available = await CameraView.isAvailableAsync();
      setCameraAvailable(available);
    };

    checkCamera();
  }, [])

  if (!permission) {
    // Permission state is still loading
    return <ThemedView />;
  }

  if (!permission.granted) {
    // Camera permission not granted yet
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </ThemedText>
        <ThemedView style={styles.buttonContainer}>
          <ThemedButton style={styles.buttonIcons} onPress={requestPermission} >
            <ThemedText>Grant permission</ThemedText>
          </ThemedButton>
        </ThemedView>
      </ThemedView>
    );
  }

  if(cameraAvailable === false){
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </ThemedText>
            <ThemedText>No Camera Available</ThemedText>
      </ThemedView>
    );
  }

  function toggleCameraFacing() {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }

  function toggleCameraTorch() {
    setEnableTorch((prev) => !prev)
    setTorchIcon((prev) => (prev === "flash-off" ? "flash-outline" : "flash-off"))
  }
  async function captureImage() {
    if (cameraRef.current) {
      const options = { quality: 0.8, base64: true, skipProcessing: true }
      const photoData = await cameraRef.current.takePictureAsync(options);
      setPhoto(photoData.uri)

      if (hasMediaLibraryPermission?.granted) {
        const asset = await MediaLibrary.createAssetAsync(photoData.uri);
        await MediaLibrary.createAlbumAsync("FoodXP Images", asset, false)
      } else {
        requestMediaLibraryPermission();
      }
    }
  }

  return (
    <ThemedView style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera} facing={facing}
          enableTorch={enableTorch}
          videoQuality="2160p"
          zoom={0}
          ref={cameraRef}
        >

          <ThemedView style={styles.buttonContainer}>

            <ThemedButton onPress={toggleCameraFacing} style={{ background: "transparent", width: 50 }}>
              <Ionicons
                name="camera-reverse"
                size={30}
                accessibilityLabel="Camera Face"
              />
            </ThemedButton>

            <ThemedButton onPress={captureImage} style={{ background: "transparent", width: 50, margin: 10 }}>
              <Ionicons
                name="camera-sharp"
                size={30}
                accessibilityLabel="Capture Image"
              />
            </ThemedButton>

            <ThemedButton onPress={toggleCameraTorch} style={{ background: "transparent", width: 50, marginRight: 10 }}>
              <Ionicons
                name={torchIcon}
                size={30}
                accessibilityLabel="Torch"
              />
            </ThemedButton>

          </ThemedView>

        </CameraView>

      )}

      {
        photo && (
          <ThemedView style={{ position: "absolute", bottom: 100, }}>
            <ThemedText>Image Captured</ThemedText>
            <TouchableOpacity onPress={() => setPhoto(null)}>
              <Ionicons
                name="close-outline"
                size={10}
                accessibilityLabel="Close"
            />
            </TouchableOpacity>
            <Image source={{ uri: photo }} style={styles.imagePreview} />
          </ThemedView>
        )
      }

    </ThemedView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", backgroundColor: "black" },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 50
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    margin: 20,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  buttonIcons: {
    background: "transparent",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10
  }
});