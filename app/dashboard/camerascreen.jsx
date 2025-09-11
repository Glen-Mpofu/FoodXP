import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import ThemedButton from "../../components/ThemedButton"
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"

export default function CameraScreen() {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();

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
        <ThemedButton onPress={requestPermission} >
          <ThemedText>Grant permission</ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  }

  function toggleCameraFacing() {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>

        <ThemedView style={styles.buttonContainer}>
          <ThemedButton onPress={toggleCameraFacing}>
            <ThemedText>Flip Camera</ThemedText>
          </ThemedButton>
        </ThemedView>
        
      </CameraView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "", alignItems: "center" },
  camera: { flex: 1 },
  buttonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "column",
    margin: 20,
    alignItems: "center",
    justifyContent: "center"
  },
});