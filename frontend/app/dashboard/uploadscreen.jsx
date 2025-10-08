import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import { Ionicons } from "@expo/vector-icons";
import axios from "axios"
import { router } from "expo-router";
import * as MediaLibrary from "expo-media-library"
import * as ImagePicker from "expo-image-picker"
import ThemedButton from '../../components/ThemedButton';
import { Toast } from 'toastify-react-native';
import * as FileSystem from "expo-file-system";

const UploadFood = () => {
    const [photo, setPhoto] = useState(null)
    const [prediction, setPrediction] = useState(null)
    let response = React.useState(null)

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

  return (
    <ThemedView style={[{justifyContent: "", alignItems: "center", flex: 1, width: "100%", height: "100%", marginTop: 50}]}>
        <ThemedText style={styles.heading}>Upload Food</ThemedText>
        <View style ={{flexDirection: "row", marginTop: 30}}>
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
        
        <ThemedView style={styles.uploadContainer}>
          {
            photo && (
              <ThemedView style={{justifyContent: "", alignItems: "flex-start"}}>
                <ThemedText style={{padding: 0}}>Image Captured</ThemedText>
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
        </ThemedView>
      </ThemedView>
  )
}

export default UploadFood

const styles = StyleSheet.create({
    uploadContainer: {
      width: 500,
      flex: 1,
      alignItems: "center",
      justifyContent: ""
    },
    imagePreview: {
        width: 300,
        height: 300,
        borderRadius: 10
    },
})