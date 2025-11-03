import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, Platform, ImageBackground, Alert, ScrollView, Modal, Dimensions, useColorScheme } from "react-native";

//camera
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library"
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/legacy";

//themed components 
import ThemedButton from "../../../components/ThemedButton"
import ThemedView from "../../../components/ThemedView"
import ThemedText from "../../../components/ThemedText"

import { API_BASE_URL } from "@env"

//icons
import { Ionicons } from "@expo/vector-icons";

import { useIsFocused } from "@react-navigation/native";
import { Toast } from "toastify-react-native";
import axios from "axios"
import { router, useRouter } from "expo-router";
import ThemedTextInput from "../../../components/ThemedTextInput";
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Colors } from "../../../constants/Colors";

export default function CameraScreen() {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const cameraRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [hasMediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  //torch
  const [enableTorch, setEnableTorch] = useState(false);
  const [torchIcon, setTorchIcon] = useState("flash-off")

  //only renders the camera when the camera screen is open
  const isFocused = useIsFocused();

  const { height, width } = Dimensions.get("window")

  //camera availability
  const [cameraAvailable, setCameraAvailable] = useState(null);
  const [prediction, setPrediction] = useState(null)
  let response = useState(null)

  const [name, onNameChange] = useState("")
  const [quantity, onQuantityChange] = useState("")
  const [date, setDate] = useState(new Date())
  const [show, setShow] = useState(false)

  // modal for the food data input
  const [modalVisible, setModalVisible] = useState()

  const onChangeDate = (event, selectedDate) => {
    setShow(Platform.OS === 'ios') // keep picker open on iOS
    if (selectedDate) setDate(selectedDate)
  }

  const openModal = () => {
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)

  useEffect(() => {
    const init = async () => {
      // TOKEN VERIFICATION
      const token = await AsyncStorage.getItem("userToken")
      if (!token) {
        return router.replace("/")
      }
      setUserToken(token)
      //CAMERA AVAILABILITY CHECK
      try {
        const { status } = await requestPermission();
        if (status != "granted") {
          setCameraAvailable(false);
          Toast.show({
            type: "info",
            text1: "Permission Denied to Access Camera",
            useModal: false
          })
          return;
        }

        setCameraAvailable(true)
      } catch (error) {
        console.log("Camera check failed", error)
        setCameraAvailable(false)
      }
    };

    init();
  }, [])

  //if the app is in web, allow for uploading
  /*
    npx expo install expo-image-picker
  */
  if (cameraAvailable == false || !permission) {
    return (
      <ThemedView style={{ alignItems: "center" }}>
        <ThemedText>No Camera Available. Upload Images</ThemedText>
        <TouchableOpacity onPress={() => {
          router.replace("/dashboard/uploadscreen")
        }}>
          <Ionicons name="cloud-upload" size={30} />
        </TouchableOpacity>
      </ThemedView>
    )
  }

  if (!permission) {
    // Permission state is still loading
    return <ThemedView />;
  }

  if (!permission.granted) {
    // Camera permission not granted yet
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
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

  function toggleCameraFacing() {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }

  function toggleCameraTorch() {
    setEnableTorch((prev) => !prev)
    setTorchIcon((prev) => (prev === "flash-off" ? "flash-outline" : "flash-off"))
  }
  async function captureImage() {
    if (cameraRef.current) {
      const options = { quality: 0.8, base64: true, skipProcessing: true, androidCaptureSound: false, }
      const photoData = await cameraRef.current.takePictureAsync(options);
      setPhoto(photoData.uri)

      await classifyFood(photoData.uri);

      if (hasMediaLibraryPermission?.granted) {
        const asset = await MediaLibrary.createAssetAsync(photoData.uri);
        await MediaLibrary.createAlbumAsync("FoodXP Images", asset, false)
      } else {
        requestMediaLibraryPermission();
      }
    }
  }

  //function for saving the food image in the db
  const saveFood = async () => {
    if (!name.trim()) {
      return Toast.show({ type: "error", text1: "Please enter the food's name", useModal: false })
    }
    if (!quantity.trim()) {
      return Toast.show({ type: "error", text1: "Please enter the food's quantity", useModal: false })
    }
    if (!date && prediction === "pantry") {
      return Toast.show({ type: "error", text1: "Please select expiration date", useModal: false })
    }

    const foodData = {
      name: name.trim(),
      quantity: quantity.trim(),
      photo: photo.trim(),
      token: userToken,
      ...(prediction === "pantry" && { date })
    }

    // Here you can send data to your backend
    console.log({ name, quantity, date, photo, prediction })
    await axios.post(`${API_BASE_URL}/save${prediction}food`, { foodData }, { withCredentials: true, headers: { Authorization: `Bearer ${userToken}` } })
      .then(async (res) => {
        if (res.data.status === "ok") {
          await AsyncStorage.setItem("refreshRecipes", "true");
          if (prediction === "pantry") {
            await AsyncStorage.setItem("refreshPantry", "true");
          } else {
            await AsyncStorage.setItem("refreshFridge", "true");
          }
          Toast.show({ type: "success", text1: res.data.data, useModal: false })
        } else {
          Toast.show({ type: "error", text1: res.data.data, useModal: false })
        }
      }).catch(err => {
        console.error("Something went wrong", err)
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false })
      })
  }

  const classifyFood = async (photoUri) => {
    if (!photoUri) {
      return Toast.show({ type: "error", text1: "No photo selected" })
    }

    try {
      /*const baseUrl =
        Platform.OS === "web"
          ? "http://localhost:5001/classifyfood"
          : "http://192.168.137.1:5001/classifyfood"*/

      let photoData = photoUri
      if (Platform.OS !== "web") {
        // Read file as base64 using the new API
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (!fileInfo.exists) throw new Error("File not found");

        const fileContent = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' }); // still supported for now
        photoData = `data:image/jpeg;base64,${fileContent}`;
      }

      const response = await axios.post(`${API_BASE_URL}/classifyfood`, { photo: photoData })
      const { Prediction } = response.data

      if (Prediction) {
        setPrediction(Prediction)
        Toast.show({ type: "success", text1: `${Prediction} item added` })
      } else {
        Toast.show({ type: "error", text1: "Prediction failed" })
      }
    } catch (error) {
      console.error("Classification error:", error)
      Toast.show({ type: "error", text1: "Classification failed" })
    }
  }

  return (
    <ThemedView style={styles.container}>
      {isFocused && (
        <CameraView
          style={[styles.camera, { width: width, height: height }]} facing={facing}
          enableTorch={enableTorch}
          videoQuality="2160p"
          zoom={0}
          ref={cameraRef}
          mute={true}
        >
          <ThemedButton onPress={() => {
            router.push("dashboard")
          }} style={{ width: 50, margin: 10 }}>
            <Ionicons
              name={"arrow-back"} size={40}
              accessibilityLabel="Back Button"
              color={theme.camera}
            />
          </ThemedButton>
          <ThemedView style={styles.buttonContainer}>

            <ThemedButton onPress={toggleCameraFacing} style={{ width: 50 }}>
              <Ionicons
                name="camera-reverse"
                size={30}
                accessibilityLabel="Camera Face"
                color={theme.camera}
              />
            </ThemedButton>

            <ThemedButton onPress={captureImage} style={{ width: 50, margin: 10 }}>
              <Ionicons
                name="camera-sharp"
                size={30}
                accessibilityLabel="Capture Image"
                color={theme.camera}
              />
            </ThemedButton>

            <ThemedButton onPress={toggleCameraTorch} style={{ width: 50, marginRight: 10 }}>
              <Ionicons
                name={torchIcon}
                size={30}
                accessibilityLabel="Torch"
                color={theme.camera}
              />
            </ThemedButton>
          </ThemedView>
        </CameraView>
      )}
      {photo && (
        <Modal
          visible={true}
          style={styles.modal}
          transparent={true}
        >
          <ThemedView style={[styles.uploadContainer, { backgroundColor: theme.uiBackground }]}>
            <ThemedText>Image Captured</ThemedText>

            <Image source={{ uri: photo }} style={styles.imagePreview} />

            <ThemedTextInput placeholder="Name" value={name} onChangeText={onNameChange} />
            <ThemedTextInput placeholder="Quantity" value={quantity} onChangeText={onQuantityChange} keyboardType="numeric" />

            {prediction === "pantry" && (
              <React.Fragment>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={date.toISOString().split("T")[0]}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    style={{ marginVertical: 10, padding: 8, fontSize: 16 }}
                  />
                ) : (
                  <>
                    <ThemedButton onPress={() => setShow(true)} style={{ marginVertical: 10 }}>
                      <ThemedText>Select Expiration Date</ThemedText>
                    </ThemedButton>
                    {show && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                      />
                    )}
                  </>
                )}
                <ThemedText>Expiration Date: {date.toLocaleDateString()}</ThemedText>
              </React.Fragment>
            )}

            <View style={{ flexDirection: "row", padding: 10, }}>
              <TouchableOpacity onPress={() => setPhoto(null)}
                style={{ margin: 5, marginRight: 15 }}
              >
                <Ionicons name="close-outline" size={50} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => saveFood()}
                style={{ margin: 5, marginLeft: 15 }}
              >
                <Ionicons name="checkmark" size={50} />
              </TouchableOpacity>
            </View>
          </ThemedView>
        </Modal>
      )}
    </ThemedView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", },
  camera: {
    flex: 1,
    alignSelf: "center",
    overflow: "hidden"
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
    width: 300,
    height: 300,
    borderRadius: 10
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover"
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 10
  },
  uploadContainer: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 90
  },
  modal: {
    flex: 1,
    width: "100%"
  }
});