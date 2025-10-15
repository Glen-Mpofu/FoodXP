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

const Pantry = () => {
  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)
  const [pantryFood, setPantryFood] = React.useState([])

  const baseUrl = Platform.OS === 'android' ? "http://192.168.137.1:5001" : "http://localhost:5001";

  const { width: screenWidth } = useWindowDimensions(); // automatically updates on resize
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);

  async function deleteEaten(id, photo) {
    const result = await axios.post(`${baseUrl}/deletepantryfood`, {id, photo}, {withCredentials: true});
    if(result.data.status === "ok"){
      Toast.show({
        type: "success",
        text1: result.data.data,
        useModal: false
      })

      setPantryFood(prev => prev.filter(item => item.id !== id))
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
      try{
        const token = await AsyncStorage.getItem("userToken");
        if(!token){
          router.replace("/")
          return;
        }
        setUserToken(token);

        const result = await axios.get(`${baseUrl}/getpantryfood`, {withCredentials: true})
        setPantryFood(result.data.data || [])

      }
      catch(err){
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
  for(let i = 0; i < pantryFood.length; i += itemsPerRow){
    rows.push(pantryFood.slice(i, i + itemsPerRow))
  }

  return (
    <ThemedView style={styles.container}> 
    <ImageBackground style={styles.imgBackground} source={require("../../../assets/foodxp/pantry bg.jpg")} />

      {rows.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {rows.map((row, rowIndex) => (
            <View key = {rowIndex} style={styles.row}>
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
          <ThemedText>No food added yet</ThemedText>
        </ThemedView>
      )}

    </ThemedView>
  )
}

export default Pantry

function convertFilePathtoUri(filePath){
  const fileName = filePath.split("\\").pop();
  const baseUrl = Platform.OS === 'android' ? "http://192.168.137.1:5001" : "http://localhost:5001";
  return `${baseUrl}/uploads/${fileName}`
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading:{
    alignSelf: "center"
  },
  imgBackground: { 
    width: "100%", 
    height: "100%", 
    ...StyleSheet.absoluteFillObject 
  },
  emptyContainer: {
    flex: 1, 
    alignItems: "center",
    marginTop: 100
  },
  scrollContainer: { 
    flexGrow: 1,
  },
  row: { 
    flexDirection: 'row', 
    marginBottom: 10 
  },
  foodItem: { 
    width: 150, 
    marginRight: 10, 
    padding: 8, 
    borderRadius: 6, 
    backgroundColor: "#fff2", 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 50 
  },
  img: { 
    width: 100, 
    height: 100, 
    borderRadius: 6, 
    marginBottom: 4 
  },
  btn:{
    height: 50, 
    width: 50, 
    alignSelf: "flex-end",
    margin: 5
  },
})