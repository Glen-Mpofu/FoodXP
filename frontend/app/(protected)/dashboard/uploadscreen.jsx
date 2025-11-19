import { Image, Modal, Platform, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native'
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
import UnitDropDown from '../../../components/UnitDropDown';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from "@env"
import { GROQ_API_KEY } from "@env"
import { Colors } from '../../../constants/Colors';
import FoodUnits from "../../../components/UnitsOfMeasure"
import { Picker } from '@react-native-picker/picker';
import { extractExpiryFromText } from '../../../components/extractExpiry';

const UploadFood = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const [photo, setPhoto] = useState(null)
  const [storagelocation, setStorageLocation] = useState(null)
  const [name, onNameChange] = useState("")
  const [amount, onAmountChange] = useState("")
  const [date, setDate] = useState(new Date())
  const [show, setShow] = useState(false)
  const [userToken, setUserToken] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState("quantity");
  const [estimatedShelfLife, setEstimatedShelfLife] = useState("");

  const [expiryScanStep, setExpiryScanStep] = useState(false);
  const [expiryScanPhoto, setExpiryScanPhoto] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [reviewStep, setReviewStep] = useState(false);


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
    onAmountChange("")
    onNameChange("")
    setStorageLocation(null)
    setSelectedUnit("quantity")
    setEstimatedShelfLife(null)


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

  const scanExpiryImage = async () => {
    try {
      let base64Image = null;

      // ---------- WEB ----------
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();

          reader.onloadend = async () => {
            const fullDataUrl = reader.result;
            const base64 = fullDataUrl.split(",")[1];

            base64Image = base64;

            // ⬅️ Save expiry image separately
            setExpiryScanPhoto(fullDataUrl);
            const expiry = await sendToOCR(base64Image); // now already ISO string

            if (expiry && expiry !== "null") {
              setExpiryDate(expiry);                // ISO string “2024-11-18”
              setReviewStep(true);                  // <--- THIS NOW SHOWS
              setExpiryScanStep(false);
              Toast.success("Expiry date detected!");
            } else {
              Toast.error("Could not detect expiry date.");
            }

          };

          reader.readAsDataURL(file);
        };

        input.click();
        return;
      }

      // ---------- MOBILE ----------
      await ImagePicker.requestMediaLibraryPermissionsAsync();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      // ⬅️ Save expiry image separately
      setExpiryScanPhoto(uri);

      base64Image = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const expiry = await sendToOCR(base64);

      if (expiry && expiry !== "null") {
        setExpiryDate(expiry);
        setReviewStep(true);
        setExpiryScanStep(false);
        Toast.success("Expiry date detected!");
      } else {
        Toast.error("Could not detect expiry date.");
      }
    } catch (error) {
      console.log("scanExpiryImage error:", error);
      Toast.error("Something went wrong.");
    }
  };

  const sendToOCR = async (base64Image) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/ocrExpiry`, {
        image: base64Image
      });

      return res.data.expiryDate;
    } catch (err) {
      console.log("OCR error:", err.response?.data || err.message);
      return null;

    }
  };

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

  const classifyFood = async (photoData) => {
    if (!photoData) {
      return Toast.show({ type: "error", text1: "No photo selected" });
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/classify`, {
        image: photoData,
      });
      onNameChange(response.data.name)
      onAmountChange(String(response.data.amount))
      setSelectedUnit(response.data.unitOfMeasure)
      setEstimatedShelfLife(response.data.estimatedShelfLife)
      setStorageLocation(response.data.storageLocation)

    } catch (error) {
      console.log("Groq LLM Error:", error.response?.data || error);
      Toast.show({ type: "error", text1: "Image analysis failed" });
    }
  };

  const saveFood = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Please enter the food's name" });
      return; // <-- STOP execution
    }

    if (!amount) {
      Toast.show({ type: "error", text1: "Please enter the food's amount" });
      return; // <-- STOP execution
    }

    let finalExpiryDate = expiryDate;

    if (estimatedShelfLife != null && estimatedShelfLife !== "") {
      const today = new Date();

      const newDate = new Date(today);
      newDate.setDate(today.getDate() + Number(estimatedShelfLife));

      finalExpiryDate = newDate;
    }

    //uploading the image to cloudinary 
    const { url: url, public_id: public_id } = await uploadToCloudinary(photo)
    console.log(selectedUnit)
    const foodData = {
      name: name.trim(),
      amount: amount,
      photo: url,
      public_id: public_id,
      token: userToken,
      expiryDate: finalExpiryDate,
      unitOfMeasure: selectedUnit,
      estimatedShelfLife
    }

    await axios.post(`${API_BASE_URL}/save${storagelocation}food`, { foodData })
      .then(async (res) => {
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
          setEstimatedShelfLife(null)
          setExpiryDate(null)
          setPhoto(null);
          setReviewStep(false);
          setExpiryScanStep(false);
          setExpiryScanPhoto(null)
        } else {
          Toast.show({ type: "error", text1: res.data.data, })
        }
      }).catch(err => {
        console.error("Something went wrong", err)
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false })
      })
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
      <ThemedText style={[styles.heading, { color: theme.text }]}>Upload Food</ThemedText>

      <View style={{ flexDirection: "row", marginTop: 20 }}>
        <TouchableOpacity onPress={() => router.push("/dashboard/")}>
          <Ionicons name="home-outline" size={30} color={theme.iconColor} />
        </TouchableOpacity>

        <TouchableOpacity onPress={uploadImage} style={{ marginLeft: 20 }}>
          <Ionicons name="cloud-upload" size={30} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      {photo && (
        <Modal visible={true} style={styles.modal} transparent={true}>
          <ThemedView style={[styles.uploadContainer, { backgroundColor: theme.uiBackground }]}>
            {!expiryScanStep && !reviewStep ? (
              // STEP 1 - Food image + auto-filled data
              <>
                <ThemedText>Image Captured</ThemedText>
                <Image source={{ uri: photo }} style={styles.imagePreview} />

                <ThemedTextInput placeholder="Name" value={name} onChangeText={onNameChange} />
                <ThemedTextInput placeholder="Amount" value={amount} onChangeText={onAmountChange} keyboardType="numeric" />

                <UnitDropDown
                  selectedUnit={selectedUnit}
                  setSelectedUnit={setSelectedUnit}
                  options={FoodUnits}
                />

                <View style={{ flexDirection: "row", padding: 10 }}>
                  <TouchableOpacity onPress={() => setPhoto(null)} style={{ margin: 5, marginRight: 15 }}>
                    <Ionicons name="close-outline" size={50} color={theme.iconColor} />
                  </TouchableOpacity>

                  {/* STEP FORWARD */}
                  <TouchableOpacity
                    style={{ margin: 5, marginLeft: 15 }}
                    onPress={() => {
                      if (estimatedShelfLife === null) {
                        setExpiryScanStep(true);
                      } else {
                        setReviewStep(true); // Jump straight to review if shelf life exists
                      }
                    }}
                  >
                    <Ionicons name="arrow-forward" size={50} color={theme.iconColor} />
                  </TouchableOpacity>
                </View>
              </>
            ) : reviewStep ? (
              // STEP 3 — REVIEW & CONFIRM
              <>
                <ThemedText>Review Your Food Item</ThemedText>

                <Image source={{ uri: photo }} style={styles.imagePreview} />

                <ThemedText>Name: {name}</ThemedText>
                <ThemedText>Amount: {amount}</ThemedText>
                <ThemedText>Unit: {selectedUnit}</ThemedText>
                {estimatedShelfLife ? (
                  <ThemedText>Estimated Shelf Life: {estimatedShelfLife}</ThemedText>
                ) : (
                  <>
                    <ThemedText>Expiry Date:</ThemedText>

                    {/* If on Web: use native <input type="date"> */}
                    {Platform.OS === "web" ? (
                      <input
                        type="date"
                        value={(expiryDate ? new Date(expiryDate) : date)
                          .toISOString()
                          .split("T")[0]}
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          setExpiryDate(e.target.value); // overwrite OCR
                          setDate(d);
                        }}
                        style={{
                          marginVertical: 10,
                          padding: 8,
                          fontSize: 16,
                          width: 150,
                        }}
                      />
                    ) : (
                      <>
                        <ThemedButton onPress={() => setShow(true)} style={{ marginVertical: 10 }}>
                          <ThemedText>
                            {expiryDate
                              ? new Date(expiryDate).toLocaleDateString()
                              : date.toLocaleDateString()}
                          </ThemedText>
                        </ThemedButton>

                        {show && (
                          <DateTimePicker
                            value={expiryDate ? new Date(expiryDate) : date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShow(Platform.OS === "ios");
                              if (selectedDate) {
                                setExpiryDate(
                                  selectedDate.toISOString().split("T")[0]
                                ); // store ISO format
                                setDate(selectedDate);
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                <ThemedButton onPress={saveFood} style={{ marginTop: 20 }}>
                  <ThemedText>Save Food</ThemedText>
                </ThemedButton>

                <ThemedButton
                  onPress={() => setReviewStep(false)}
                  style={{ backgroundColor: theme.cardColor, marginTop: 10 }}
                >
                  <ThemedText>Back</ThemedText>
                </ThemedButton>
              </>
            ) : (
              // STEP 2 — EXPIRY SCAN
              <>
                <ThemedText>Upload Expiry Date Image</ThemedText>

                {expiryScanPhoto && (
                  <Image source={{ uri: expiryScanPhoto }} style={styles.imagePreview} />
                )}

                <ThemedButton onPress={scanExpiryImage} style={{ marginVertical: 15 }}>
                  <ThemedText>Upload Expiry Image</ThemedText>
                </ThemedButton>

                <ThemedButton
                  onPress={() => setExpiryScanStep(false)}
                  style={{ backgroundColor: theme.cardColor, marginTop: 10 }}
                >
                  <ThemedText>Back</ThemedText>
                </ThemedButton>
              </>
            )}

          </ThemedView>
        </Modal>
      )}
    </ThemedView>
  )
}

export default UploadFood

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", width: "100%", },
  heading: { fontSize: 24, fontWeight: "bold" },
  uploadContainer: { width: "100%", justifyContent: "center", alignItems: "center", borderRadius: 90 },
  modal: { flex: 1, width: "100%" },
  imagePreview: { width: 300, height: 300, borderRadius: 10, marginVertical: 10 },
})