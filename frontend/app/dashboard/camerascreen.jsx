import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, Platform, ImageBackground, Alert } from "react-native";

//camera
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library"

import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system";
//themed components 
import ThemedButton from "../../components/ThemedButton"
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"

//icons
import { Ionicons } from "@expo/vector-icons";

import { useIsFocused } from "@react-navigation/native";
import { Toast } from "toastify-react-native";
import axios from "axios"
import { router } from "expo-router";

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
  const [prediction, setPrediction] = useState(null)
  let response = useState(null)

  async function saveFood(uri, classification) {
    try{
      const folderUri = FileSystem.documentDirectory + "foodImages/" + classification + "/"
      await FileSystem.makeDirectoryAsync(folderUri, {intermediates: true})

      const fileName = Date.now() + ".jpg"
      const dest = folderUri + fileName

      await FileSystem.copyAsync({
        from: uri,
        to: dest
      })

      return dest;
    }
    catch(error){
      console.log(error)
    }
  }
  
  async function classifyfood() {
    try {
      const baseUrl =
        Platform.OS === "web"
          ? "http://localhost:5001/classifyfood"
          : "http://192.168.137.1:5001/classifyfood";

      if (!photo) {
        Toast.show({
          type: "error",
          text1: "No photo selected",
        });
        return;
      }
            
      if(Platform.OS === "web"){
        response = await axios.post(
          baseUrl,
          { photo: photo },
          { withCredentials: true }
        );
      }else{
        // ✅ Convert file URI to Base64
        const base64Image = await FileSystem.readAsStringAsync(photo, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const photoData = `data:image/jpeg;base64,${base64Image}`;

        response = await axios.post(
          baseUrl,
          { photo: photoData },
          { withCredentials: true }
        );
      }      

      console.log("Server response:", response.data);

      const { Prediction, Confidence } = response.data;

      if (Prediction) {
        setPrediction(Prediction);
        Toast.show({
          type: "success",
          text1: `${Prediction} item added`,
        });
        saveFood(photo, Prediction)
      } else {
        Toast.show({
          type: "error",
          text1: "Prediction failed",
        });
      }
    } catch (e) {
      console.error("Classification error:", e);
      Toast.show({
        type: "error",
        text1: "Classification failed",
        text2: e.message || "An error occurred",
      });
    }
  }

  
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const {status} = await requestPermission();
        if(status != "granted"){
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

    checkCamera();
  }, [])
  
  //if the app is in web, allow for uploading
  /*
    npx expo install expo-image-picker
  */
  if(cameraAvailable == false || !permission){
    return(
      <ThemedView style={{alignItems: "center"}}>
        <ThemedText>No Camera Available. Upload Images</ThemedText>
        <TouchableOpacity onPress={() => {
          router.replace("/dashboard/uploadscreen")
        }}>  
          <Ionicons name="cloud-upload" size={30}/>
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

  //function for saving the food image in the db
  async function saveFood() {
    
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
          <ThemedView style={{ alignItems: "center", justifyContent: "" }}>
            <ThemedText>Image Captured</ThemedText>
            <TouchableOpacity onPress={() => setPhoto(null)}>
              <Ionicons
                name="close-outline"
                size={20}
                accessibilityLabel="Close"
            />
            </TouchableOpacity>
            <Image source={{ uri: photo }} style={styles.imagePreview} />

            <View style={{flexDirection: "row", width: "100%"}}>
              <ThemedButton style={{backgroundColor: "transparent", width: 150, height:50, margin: 5, marginLeft: 0 }} onPress={()=> classifyfood()}>
                <ThemedText>Add to FoodBox</ThemedText>
              </ThemedButton>

              { prediction && (                
                <ThemedButton style={{backgroundColor: "transparent", width: 150, height:50, margin: 5, marginLeft: 0 }} onPress={()=> router.push(`/dashboard/${prediction}`)}>
                  <ThemedText>View in {prediction.toUpperCase()}</ThemedText>
                </ThemedButton>  
              )}              
            </View>
          </ThemedView>
        )
      }

    </ThemedView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", paddingTop: 50 },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 50,
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
    width: 200,
    height: 200,
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
      width: 500,
      flex: 1,
      alignItems: "center",
      justifyContent: ""
    }
});