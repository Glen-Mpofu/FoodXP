import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, Platform, ImageBackground, Alert, ScrollView, Modal, Dimensions, useColorScheme } from "react-native";

//camera
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library"
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

//themed components 
import ThemedButton from "../../../components/ThemedButton"
import ThemedView from "../../../components/ThemedView"
import ThemedText from "../../../components/ThemedText"

import { API_BASE_URL } from "@env"
import FoodUnits from "../../../components/UnitsOfMeasure"
//icons
import { Ionicons } from "@expo/vector-icons";

import { useIsFocused } from "@react-navigation/native";
import { Toast } from "toastify-react-native";
import axios from "axios"
import ThemedTextInput from "../../../components/ThemedTextInput";
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Colors } from "../../../constants/Colors";
import UnitDropDown from "../../../components/UnitDropDown";

export default function CameraScreen() {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();

  const [selectedUnit, setSelectedUnit] = useState("quantity");
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const cameraRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [hasMediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  //torch
  const [enableTorch, setEnableTorch] = useState(false);
  const [torchIcon, setTorchIcon] = useState("flash-off")
  const expiryCameraRef = useRef(null);

  //only renders the camera when the camera screen is open
  const isFocused = useIsFocused();

  const { height, width } = Dimensions.get("window")

  //camera availability
  const [cameraAvailable, setCameraAvailable] = useState(null);
  const [storagelocation, setStorageLocation] = useState(null)
  let response = useState(null)

  const [name, onNameChange] = useState("")
  const [amount, onAmountChange] = useState("")
  const [show, setShow] = useState(false)

  // modal for the food data input
  const [modalVisible, setModalVisible] = useState()
  // === Multi-step flow (same as UploadScreen) ===
  const [scanStep, setScanStep] = useState(true);
  const [expiryScanStep, setExpiryScanStep] = useState(false);
  const [reviewStep, setReviewStep] = useState(false);
  const [estimatedShelfLife, setEstimatedShelfLife] = useState("");

  // expiry scan
  const [expiryScanPhoto, setExpiryScanPhoto] = useState(null);
  const [expiryDate, setExpiryDate] = useState(new Date());
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const onChangeDate = (event, selectedDate) => {
    setShow(Platform.OS === 'ios') // keep picker open on iOS
    if (selectedDate) formatDate(setExpiryDate(selectedDate))
  }

  const openModal = () => {
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)

  useFocusEffect(
    React.useCallback(() => {
      // Camera is running
      return () => {
        // Stop camera when modal is open
        setPhoto(null);
      };
    }, [])
  );

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

  const captureExpiryImageInsideModal = async () => {
    if (!expiryCameraRef.current) return;

    const photo = await expiryCameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: true,
      skipProcessing: true,
    });

    await scanExpiryImage(photo.uri);
  };

  const scanExpiryImage = async (uri) => {
    try {
      const base64Img = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });

      const response = await axios.post(`${API_BASE_URL}/ocrExpiry`, {
        image: base64Img
      });

      const detected = response.data.expiryDate;

      if (detected) {
        setExpiryDate(new Date(detected));
        Toast.success("Expiry date detected!");
      } else {
        setExpiryDate(new Date());;
        Toast.error("Could not detect expiry date. Please enter manually.");
      }

      setExpiryScanStep(false);
      setReviewStep(true);

    } catch (err) {
      console.log(err);
      Toast.error("Expiry scan failed.");
      setExpiryDate(new Date());;
      setExpiryScanStep(false);
      setReviewStep(true);
    }
  };

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

  const uploadToCloudinary = async (photoUri) => {
    const data = new FormData();

    if (Platform.OS === "web") {
      // Web uses File or Blob directly
      const response = await fetch(photoUri);
      const blob = await response.blob();
      data.append("file", blob);
    } else {
      // Native uses { uri, type, name }
      data.append("file", {
        uri: photoUri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
    }

    data.append("upload_preset", "FoodXPUpload");

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/dsudzp5uy/image/upload`,
      data,
      {
        // ❌ Remove manual Content-Type, let Axios handle it!
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return {
      url: response.data.secure_url,
      public_id: response.data.public_id,
    };
  };

  const saveFood = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Please enter the food's name" });
      return; // <-- STOP execution
    }

    if (!amount.trim()) {
      Toast.show({ type: "error", text1: "Please enter the food's amount" });
      return; // <-- STOP execution
    }

    // 1️⃣ Upload to Cloudinary first
    const { url: url, public_id: public_id } = await uploadToCloudinary(photo);

    // 2️⃣ Then send the secure URL to backend
    const foodData = {
      name: name.trim(),
      amount: amount.trim(),
      photo: url,
      public_id: public_id,// use Cloudinary URL
      token: userToken,
      unitOfMeasure: selectedUnit,
      estimatedShelfLife,
      expiryDate
    };

    await axios.post(`${API_BASE_URL}/save${storagelocation}food`, { foodData }).then(async (res) => {
      if (res.data.status === "ok") {
        await AsyncStorage.setItem("refreshRecipes", "true");
        if (storagelocation === "pantry") {
          await AsyncStorage.setItem("refreshPantry", "true");
        } else {
          await AsyncStorage.setItem("refreshFridge", "true");
        }
        Toast.show({ type: "success", text1: res.data.data, })

        onAmountChange("")
        onNameChange("")
        setStorageLocation(null)
        setSelectedUnit("quantity")
      } else {
        Toast.show({ type: "error", text1: res.data.data, })
      }
    });
  };

  const classifyFood = async (photoUri) => {
    if (!photoUri) {
      return Toast.show({ type: "error", text1: "No photo selected" });
    }

    try {
      // Convert image → base64
      const base64Img = await FileSystem.readAsStringAsync(photoUri, {
        encoding: "base64",
      });

      // Send proper format to backend
      const response = await axios.post(`${API_BASE_URL}/api/classify`, {
        image: `data:image/jpeg;base64,${base64Img}`,
      });

      onNameChange(response.data.name);
      onAmountChange(String(response.data.amount));
      setSelectedUnit(response.data.unitOfMeasure);
      setEstimatedShelfLife(response.data.estimatedShelfLife);
      setStorageLocation(response.data.storageLocation);

    } catch (error) {
      console.log("Groq LLM Error:", error.response?.data || error);
      Toast.show({ type: "error", text1: "Image analysis failed" });
    }
  };

  const formatDate = (d) =>
    d.toISOString().split("T")[0]; // YYYY-MM-DD

  return (
    <ThemedView style={styles.container}>
      {isFocused && !photo && (
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
          }} style={{ width: 50, margin: 10, marginTop: 50 }}>
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
        <Modal visible={true} transparent={true}>
          <ThemedView style={[styles.uploadContainer, { backgroundColor: theme.uiBackground }]}>

            {/* STEP 1 — FOOD DETAILS */}
            {scanStep && (
              <>
                <ThemedText>Food Captured</ThemedText>
                <Image source={{ uri: photo }} style={styles.imagePreview} />

                <ThemedTextInput placeholder="Name" value={name} onChangeText={onNameChange} />
                <ThemedTextInput placeholder="Amount" value={amount} onChangeText={onAmountChange} keyboardType="numeric" />

                <UnitDropDown
                  selectedUnit={selectedUnit}
                  setSelectedUnit={setSelectedUnit}
                  options={FoodUnits}
                />
                <View style={{ flexDirection: "row", padding: 10 }}>

                  <TouchableOpacity onPress={() => {
                    setPhoto(null)
                    setReviewStep(false);
                  }}>
                    <Ionicons name="close-outline" size={50} color={theme.iconColor} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => {
                    if (!name.trim()) return Toast.error("Enter name");
                    if (!amount.trim()) return Toast.error("Enter amount");

                    if (storagelocation === "pantry") {
                      setScanStep(false);
                      setExpiryScanStep(true);
                    } else {
                      setScanStep(false);
                      setReviewStep(true);
                    }
                  }}>
                    <Ionicons name="arrow-forward" size={50} color={theme.iconColor} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 2 — EXPIRY SCAN */}
            {expiryScanStep && (
              <>
                <ThemedText>Scan Expiry Date</ThemedText>

                <View style={styles.miniCamContainer}>
                  <CameraView
                    style={styles.miniCam}
                    facing="back"
                    ref={expiryCameraRef}
                  >
                    <View style={styles.squareBox} />
                  </CameraView>
                </View>

                <ThemedButton onPress={captureExpiryImageInsideModal}>
                  <ThemedText>Capture</ThemedText>
                </ThemedButton>

                <ThemedButton onPress={() => {
                  setExpiryDate(new Date());;
                  setExpiryScanStep(false);
                  setReviewStep(true);
                }}>
                  <ThemedText>Enter Manually</ThemedText>
                </ThemedButton>

                <ThemedButton onPress={() => {
                  setExpiryScanStep(false);
                  setScanStep(true);
                }}>
                  <ThemedText>Back</ThemedText>
                </ThemedButton>
              </>
            )}


            {/* STEP 3 — REVIEW */}
            {reviewStep && (
              <>
                <ThemedText>Review</ThemedText>

                <Image source={{ uri: photo }} style={styles.imagePreview} />

                <ThemedText>Name: {name}</ThemedText>
                <ThemedText>Amount: {amount} {selectedUnit}</ThemedText>

                {storagelocation === "pantry" && (
                  <>
                    <ThemedButton onPress={() => setShow(true)}>
                      <ThemedText>Select Expiry Date</ThemedText>
                    </ThemedButton>

                    {show && (
                      <DateTimePicker value={expiryDate} mode="date" display="default" onChange={onChangeDate} />
                    )}

                    <ThemedText>{expiryDate?.toISOString().split("T")[0]}</ThemedText>
                  </>
                )}

                <View style={{ flexDirection: "row", padding: 10 }}>
                  <TouchableOpacity onPress={() => {
                    setPhoto(null)
                    setScanStep(true);
                    setReviewStep(false);
                  }}>
                    <Ionicons name="close-outline" size={50} color={theme.iconColor} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={saveFood}>
                    <Ionicons name="checkmark" size={50} color={theme.iconColor} />
                  </TouchableOpacity>
                </View>
              </>
            )}

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
  }, miniCamContainer: {
    width: 260,
    height: 260,
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 20,
    backgroundColor: "black"
  },
  miniCam: {
    width: "100%",
    height: "100%",
  },
  squareBox: {
    width: 200,
    height: 100,
    borderWidth: 3,
    borderColor: "white",
    alignSelf: "center",
    marginTop: 80,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.1)"
  },

});