import { Image, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import { Ionicons } from "@expo/vector-icons";
import axios from "axios"
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker"
import ThemedButton from '../../../components/ThemedButton';
import { Toast } from 'toastify-react-native';
import * as FileSystem from "expo-file-system/legacy";
import ThemedTextInput from '../../../components/ThemedTextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from "@env"

const UploadFood = () => {
  const [photo, setPhoto] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [name, onNameChange] = useState("")
  const [quantity, onQuantityChange] = useState("")
  const [date, setDate] = useState(new Date())
  const [show, setShow] = useState(false)
  const [userToken, setUserToken] = useState(null)

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken")
      if (!token) return router.replace("/")
      setUserToken(token)
    };
    init();
  }, [])

  const onChangeDate = (event, selectedDate) => {
    setShow(Platform.OS === 'ios')
    if (selectedDate) setDate(selectedDate)
  }

  // Convert a web File to Base64
  const getBase64FromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadImage = async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          const base64 = await getBase64FromFile(file);
          setPhoto(base64);
          await classifyFood(base64);
        };
        input.click();
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync()
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1
        })
        if (!result.canceled) {
          setPhoto(result.assets[0].uri)
          const base64Image = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 })
          await classifyFood(`data:image/jpeg;base64,${base64Image}`);
        }
      }
    } catch (error) {
      console.log(error)
    }
  }

  const classifyFood = async (photoData) => {
    if (!photoData) return Toast.show({ type: "error", text1: "No photo selected" })

    try {
      //const baseUrl = Platform.OS === "web" ? "http://localhost:5001/classifyfood" : "http://192.168.137.1:5001/classifyfood"
      const response = await axios.post(`${API_BASE_URL}/classifyfood`, { photo: photoData })
      const { Confidence, Prediction } = response.data
      if (Prediction) {
        setPrediction(Prediction)
        Toast.show({ type: "success", text1: `${Prediction} item added`, useModal: false })
      } else {
        Toast.show({ type: "error", text1: "Prediction failed", useModal: false })
      }
    } catch (error) {
      console.error("Classification error:", error)
      Toast.show({ type: "error", text1: "Classification failed", useModal: false })
    }
  }

  const saveFood = async () => {
    if (!name.trim()) return Toast.show({ type: "error", text1: "Please enter the food's name", useModal: false })
    if (!quantity.trim()) return Toast.show({ type: "error", text1: "Please enter the food's quantity", useModal: false })
    if (!date && prediction === "pantry") return Toast.show({ type: "error", text1: "Please select expiration date", useModal: false })

    const foodData = {
      name,
      quantity,
      photo,
      token: userToken,
      ...(prediction === "pantry" && { date })
    }

    console.log({ name, quantity, date, photo, prediction })

    //const baseURL = Platform.OS === "web" ? `http://localhost:5001/save${prediction}food` : `http://192.168.137.1:5001/save${prediction}food`
    axios.post(`${API_BASE_URL}/save${prediction}food`, { foodData }, { withCredentials: true, headers: { Authorization: `Bearer ${userToken}` } })
      .then((res) => {
        if (res.data.status === "ok") {
          Toast.show({ type: "success", text1: res.data.data, useModal: false })
        } else {
          Toast.show({ type: "error", text1: res.data.data, useModal: false })
        }
      }).catch(err => {
        console.error("Something went wrong", err)
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false })
      })
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
        <Modal visible={true} style={styles.modal} transparent={true}>
          <ThemedView style={styles.uploadContainer}>
            <ThemedText>Image Captured</ThemedText>
            <Image source={{ uri: photo }} style={styles.imagePreview} />
            <ThemedTextInput placeholder="Name" value={name} onChangeText={onNameChange} />
            <ThemedTextInput placeholder="Quantity" value={quantity} onChangeText={onQuantityChange} keyboardType="numeric" />

            {prediction === "pantry" && (
              <>
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
                      <DateTimePicker value={date} mode="date" display="default" onChange={onChangeDate} />
                    )}
                  </>
                )}
                <ThemedText>Expiration Date: {date.toLocaleDateString()}</ThemedText>
              </>
            )}

            <View style={{ flexDirection: "row", padding: 10 }}>
              <TouchableOpacity onPress={() => setPhoto(null)} style={{ margin: 5, marginRight: 15 }}>
                <Ionicons name="close-outline" size={50} />
              </TouchableOpacity>

              <TouchableOpacity onPress={saveFood} style={{ margin: 5, marginLeft: 15 }}>
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
  container: { flex: 1, alignItems: "center", width: "100%", marginTop: 50 },
  heading: { fontSize: 24, fontWeight: "bold" },
  uploadContainer: { width: "100%", flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.9)", borderRadius: 90 },
  modal: { flex: 1, width: "100%" },
  imagePreview: { width: 300, height: 300, borderRadius: 10, marginVertical: 10 },
})
