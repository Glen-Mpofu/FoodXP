import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import { Ionicons } from "@expo/vector-icons";
import axios from "axios"
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker"
import ThemedButton from '../../components/ThemedButton';
import { Toast } from 'toastify-react-native';
import * as FileSystem from "expo-file-system";
import ThemedTextInput from '../../components/ThemedTextInput';
import DateTimePicker  from '@react-native-community/datetimepicker';

const UploadFood = () => {
  const [photo, setPhoto] = useState(null)
  const [prediction, setPrediction] = useState(null)

  // Input data
  const [name, onNameChange] = useState("")
  const [quantity, onQuantityChange] = useState("")
  const [date, setDate] = useState(new Date())
  const [show, setShow] = useState(false)

  const onChangeDate = (event, selectedDate) => {
    setShow(Platform.OS === 'ios') // keep picker open on iOS
    if (selectedDate) setDate(selectedDate)
  }

  const uploadImage = async () => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync()
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1
      })
      if (!result.canceled) {
        setPhoto(result.assets[0].uri)
        await classifyFood(result.assets[0].uri);
      }
      
    } catch (error) {
      console.log(error)
    }
  }

  const saveFood = async () => {
    if (!name.trim()) {
      return Toast.show({ type: "error", text1: "Please enter the food's name", useModal: false })
    }
    if (!quantity.trim()) {
      return Toast.show({ type: "error", text1: "Please enter the food's quantity", useModal: false  })
    }
    if (!date && prediction === "pantry") {
      return Toast.show({ type: "error", text1: "Please select expiration date", useModal: false  })
    }
    let foodData = null
    if(prediction === "pantry"){
      foodData = {
        name: name, 
        quantity: quantity, 
        date: date,
        photo: photo,
      };
    }else if(prediction === "fridge"){
      foodData = {
        name: name, 
        quantity: quantity, 
        photo: photo,
      };
    }
    console.log({ name, quantity, date, photo, prediction })
    Toast.show({ type: "success", text1: "Food saved successfully", useModal: false, })

    const baseURL = Platform.OS === "web" ? `http://localhost:5001/save${prediction}food` : `http://192.168.137.1:5001/save${prediction}food`
    axios.post(baseURL, {foodData}, {withCredentials: true})
  }

  const classifyFood = async (photoUri) => {
    if (!photoUri) {
      return Toast.show({ type: "error", text1: "No photo selected" })
    }

    try {
      const baseUrl =
        Platform.OS === "web"
          ? "http://localhost:5001/classifyfood"
          : "http://192.168.137.1:5001/classifyfood"

      let photoData = photoUri
      if (Platform.OS !== "web") {
        const base64Image = await FileSystem.readAsStringAsync(photoUri, { encoding: FileSystem.EncodingType.Base64 })
        photoData = `data:image/jpeg;base64,${base64Image}`
      }

      const response = await axios.post(baseUrl, { photo: photoData })
      const { Confidence, Prediction } = response.data
      alert(Prediction)
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
      <ThemedText style={styles.heading}>Upload Food</ThemedText>

      <View style={{ flexDirection: "row", marginTop: 20 }}>
        <TouchableOpacity onPress={() => router.push("/dashboard/")}>
          <Ionicons name="home-outline" size={30} />
        </TouchableOpacity>

        <TouchableOpacity onPress={uploadImage} style={{ marginLeft: 20 }}>
          <Ionicons name="cloud-upload" size={30} />
        </TouchableOpacity>
      </View>

      {photo && (
        <Modal
          visible={true}
          style={styles.modal}
          transparent={true}
        >
          <ThemedView style={styles.uploadContainer}>
            <ThemedText>Image Captured</ThemedText>
            
            <Image source={{ uri: photo }} style={styles.imagePreview} />

            <ThemedTextInput placeholder="Name" value={name} onChangeText={onNameChange} />
            <ThemedTextInput placeholder="Quantity" value={quantity} onChangeText={onQuantityChange} keyboardType = "numeric"/>

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
  
            <View style={{flexDirection: "row", padding: 10,}}>
              <TouchableOpacity onPress={() => setPhoto(null)} 
                style={{margin: 5, marginRight: 15}}
                >
                <Ionicons name="close-outline" size={50} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => saveFood()}
                style={{margin: 5, marginLeft: 15}}
                >
                <Ionicons name="checkmark" size={50} />
              </TouchableOpacity>
            </View>
          </ThemedView>
          
        </Modal>
      )}
    </ThemedView>
  )
}

export default UploadFood

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    marginTop: 50,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
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
  },
  imagePreview: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginVertical: 10,
  },
})
