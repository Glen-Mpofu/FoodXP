import { Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import React, { useEffect } from 'react'
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import axios from 'axios'
import FoodCard from '../../../components/FoodCard'
import { Toast } from 'toastify-react-native'
import ThemedButton from '../../../components/ThemedButton'
import { API_BASE_URL } from "@env"

const Pantry = () => {
  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)
  const [pantryFood, setPantryFood] = React.useState([])

  const { width: screenWidth } = useWindowDimensions(); // automatically updates on resize
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);

  async function deleteEaten(id, photo) {
    const result = await axios.post(`${API_BASE_URL}/deletepantryfood`, { id, photo }, { withCredentials: true });
    if (result.data.status === "ok") {
      Toast.show({
        type: "success",
        text1: result.data.data,
        useModal: false
      })

      setPantryFood(prev => prev.filter(item => item.id !== id))
    } else {
      Toast.show({
        type: "error",
        text1: result.data.data,
        useModal: false
      })
    }
  }

  async function openMap() {
    Toast.show({
      type: "info",
      text1: "Opening Map",
      useModal: false
    })
    router.replace("/dashboard/donateHub")
  }

  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/")
          return;
        }
        setUserToken(token);

        const result = await axios.get(`${API_BASE_URL}/getpantryfood`, { withCredentials: true, headers: { Authorization: `Bearer ${token}` } })
        setPantryFood(result.data.data || [])

      }
      catch (err) {
        console.error(err)
        alert(err)
        Toast.show({
          type: "error",
          text1: "Something went wrong",
          useModal: false
        })
      }
    };

    init();
  }, [])

  const rows = []
  for (let i = 0; i < pantryFood.length; i += itemsPerRow) {
    rows.push(pantryFood.slice(i, i + itemsPerRow))
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        style={styles.imgBackground}
        source={require("../../../assets/foodxp/pantry bg.jpg")}
        resizeMode="cover"
      />

      {rows.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.shelf}>
              {row.map(item => (
                <View key={item.id} style={styles.foodItem}>
                  <Image
                    source={{ uri: convertFilePathtoUri(item.photo) }}
                    style={styles.img}
                  />
                  <ThemedText style={styles.foodName}>{item.name}</ThemedText>
                  <ThemedText style={styles.qty}>Qty: {item.quantity}</ThemedText>

                  <View style={styles.buttonRow}>
                    <ThemedButton
                      style={[styles.btn, { backgroundColor: "#f28b82" }]}
                      onPress={() => deleteEaten(item.id, item.photo)}
                    >
                      <ThemedText>Eaten</ThemedText>
                    </ThemedButton>

                    <ThemedButton
                      style={[styles.btn, { backgroundColor: "#81c995" }]}
                      onPress={() => openMap()}
                    >
                      <ThemedText>Donate</ThemedText>
                    </ThemedButton>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.heading}>No food added yet</ThemedText>
        </ThemedView>
      )}
    </View>

  )
}

export default Pantry

function convertFilePathtoUri(filePath) {
  const fileName = filePath.split("\\").pop();
  return `${API_BASE_URL}/uploads/${fileName}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  imgBackground: {
    width: "100%",
    height: "100%",
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 15,
  },
  shelf: {
    flexDirection: "row",
    marginBottom: 20,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  foodItem: {
    width: 140,
    marginRight: 15,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fff9", // semi-transparent white
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 3, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  img: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 6,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a2c0a", // warm brown text
    textAlign: "center",
  },
  qty: {
    fontSize: 13,
    color: "#5a3c1a",
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  btn: {
    flex: 1,
    margin: 3,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4a2c0a",
  },
});
