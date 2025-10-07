import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, Platform, ImageBackground, Alert } from "react-native";

//camera
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library"

import * as ImagePicker from "expo-image-picker"

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

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const available = await CameraView.isAvailableAsync();

        if(!available){
          setCameraAvailable(false);
          Toast.show({
            type: "error",
            text1: "Camera hardware not detected",
            useModal: false
          })
          return;
        }

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

        const devices = await CameraView.getAvailableCameraTypesAsync();
        if(!devices || devices.length === 0){
          setCameraAvailable(false)
          
          Toast.show({
            type: "error",
            text1: "No physical cameras detected",
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

  const uploadImage = async () => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1
      });
      setPrediction(null)
      setPhoto(result.assets[0].uri)
    
    } catch (error) {
      console.log(error)
    }
  }

  
  //if the app is in web, allow for uploading
  /*
    npx expo install expo-image-picker
  */
  if(cameraAvailable == false){
    return(
      <ThemedView style={[{justifyContent: "", alignItems: "center", flex: 1, width: "100%", height: "100%"}]}>
        <ThemedText style={styles.heading}>Upload Food</ThemedText>
        <View style ={{flexDirection: "row", margin: 50}}>
          <TouchableOpacity onPress={() => 
            router.push("/dashboard/")
          }>
            <Ionicons
              name="home-outline"
              size={30}
              accessibilityLabel="Close"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => 
            uploadImage()
          }>
            <Ionicons name="cloud-upload" size={30} style={{padding: 10}}/>
          </TouchableOpacity>
        </View>
        {
        photo && (
          <ThemedView style={{ position: "absolute", bottom: 100, }}>
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
              <ThemedButton style={{backgroundColor: "transparent", width: 150, height:50, margin: 5, marginLeft: 0 }} onPress={()=> saveFood()}>
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

  async function saveFood() {
    
    axios.post("http://192.168.137.1:5001/savefood", {photo}).
    then((res) => {
      const {Prediction, Confidence } = res.data;
      setPrediction(Prediction)
        Toast.show({
          type: "success", 
          text1: `${Prediction} item added`,
        })
        
    }).catch((e)=>{
      console.log(e)
        Toast.show({
          type: "error", 
          text1: e
        })
    })

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
                size={20}
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
});