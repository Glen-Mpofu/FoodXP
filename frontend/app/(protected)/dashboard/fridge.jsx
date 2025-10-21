import { ScrollView, Image, ImageBackground, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import ThemedButton from '../../../components/ThemedButton';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { Toast } from "toastify-react-native";
import { API_BASE_URL } from "@env"

const Fridge = () => {
  const [fridgeFood, setFridgeFood] = useState([]);
  const { width: screenWidth } = useWindowDimensions(); // automatically updates on resize
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  const baseUrl = API_BASE_URL

  async function deleteEaten(id, photo) {
    const result = await axios.post(`${baseUrl}/deletefridgefood`, {id, photo}, {withCredentials: true});
    if(result.data.status === "ok"){
      Toast.show({
        type: "success",
        text1: result.data.data,
        useModal: false
      })

      setFridgeFood(prev => prev.filter(item => item.id !== id))
    }else{
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
    router.replace("/dashboard/donateMap")
  }
  
  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");

        const result = await axios.get(`${baseUrl}/getfridgefood`, { withCredentials: true, headers: {Authorization: `Bearer ${token}`} });
        setFridgeFood(result.data.data || []);
      } catch (error) {
        console.error("Fridge fetch failed:", error);
      }
    }
    init();
  }, []);

  // Split items into rows dynamically
  const rows = [];
  for (let i = 0; i < fridgeFood.length; i += itemsPerRow) {
    rows.push(fridgeFood.slice(i, i + itemsPerRow));
  }

  return (
    <View style={styles.container}>
      <ImageBackground style={styles.imgBackground} source={require("../../../assets/foodxp/fridge bg.jpg")} />
      
      {rows.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(item => (
                <View key={item.id} style={styles.foodItem}>
                  <Image source={{ uri: convertFilePathtoUri(item.photo) }} style={styles.img} />
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText>Qty: {item.quantity}</ThemedText>
                  
                  <View style={{ flexDirection: "row" }}>
                    <ThemedButton style={styles.btn} onPress={() => {
                      deleteEaten(item.id, item.photo)
                    }}>
                      <ThemedText>Eaten</ThemedText>
                    </ThemedButton>

                    <ThemedButton style={styles.btn} onPress={() => {
                      openMap()
                    }}>
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
  );
};

export default Fridge;

function convertFilePathtoUri(filePath) {
  const fileName = filePath.split("\\").pop();
  return `${API_BASE_URL}/uploads/${fileName}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  imgBackground: { width: "100%", height: "100%", ...StyleSheet.absoluteFillObject },
  scrollContainer: { flexGrow: 1, padding: 10}, // items start at bottom
  row: { flexDirection: 'row', marginBottom: 10 },
  foodItem: { width: 150, marginRight: 10, padding: 8, borderRadius: 6, backgroundColor: "#fff2", alignItems: "center", justifyContent: "center", marginTop: 50 },
  img: { width: 100, height: 100, borderRadius: 6, marginBottom: 4 },
  btn:{height: 50, width: 50, alignSelf: "flex-end", margin: 5},
  emptyContainer: {flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100},
  heading:{
    alignSelf: "center",
    fontSize: 25
  },
});
