// app/dashboard.js
import { Image, Platform, StyleSheet, View, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import axios from "axios"
import { Toast } from 'toastify-react-native';
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@env"

export default function Dashboard() {
    const router = useRouter();
    const [userToken, setUserToken] = React.useState(null)
    const [pantryFood, onPantryFoodChange] = React.useState([])
    const [fridgeFood, onFridgeFoodChange] = React.useState([])
  
    const screenWidth = Dimensions.get("window").width;
    const itemWidth = 120; // width per item
    const maxItems = Math.floor(screenWidth / itemWidth) // calculation of how many items can fit

  useEffect(() => {
      const init = async () => {
        const token = await AsyncStorage.getItem("userToken");
        if(!token){
          router.replace("/")
          return;
        }
        setUserToken(token);
        
        const baseUrl = API_BASE_URL
        //pantry food
        const result = await axios.get(`${baseUrl}/getpantryfood`, {withCredentials: true})
        onPantryFoodChange(result.data.data)

        //fridge food
        const resultFridge = await axios.get(`${baseUrl}/getfridgefood`, {withCredentials: true})
        onFridgeFoodChange(resultFridge.data.data)
      };
  
      init();
    }, [])
    
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
      <View style={styles.rowFoodContainer}>
        <ThemedView style={[styles.foodContainer]}>

          {/*Pantry Food Items */}
          <ThemedText style={styles.heading}>Pantry foods</ThemedText>
          
          <FlatList 
            numColumns={4}
            data = {[
              ...pantryFood.slice(0, maxItems - 1),
              {id: "show_all", type: "show_all"}
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => {
              if(item.type === "show_all"){
                return (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/pantry")}
                    style={[styles.foodItem, styles.showAllCard]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center"}}>
                      Show All 
                    </ThemedText>
                    <Ionicons name='arrow-forward' size={15}/>
                  </TouchableOpacity>
                );
              }

              return(
                <View style={styles.foodItem}>
                  <Image
                    source={{ uri: convertFilePathtoUri(item.photo) }}
                    style={styles.img}
                  />
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText>Qty: {item.quantity}</ThemedText>
                </View>
              )
            }}
            showsHorizontalScrollIndicator={false}
          />

        </ThemedView>

        {/* Fridge food */}
        <ThemedView style={styles.foodContainer}>
          <ThemedText style={styles.heading}>Fridge foods</ThemedText>

          <FlatList 
            horizontal
            data = {[
              ...fridgeFood.slice(0, maxItems - 1),
              {id: "show_all", type: "show_all"}
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => {
              if(item.type === "show_all"){
                return (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/fridge")}
                    style={[styles.foodItem, styles.showAllCard]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center"}}>
                      Show All 
                    </ThemedText>
                    <Ionicons name='arrow-forward' size={15}/>
                  </TouchableOpacity>
                );
              }

              return(
                <View style={styles.foodItem}>
                  <Image
                    source={{ uri: convertFilePathtoUri(item.photo) }}
                    style={styles.img}
                  />
                  <ThemedText>{item.name}</ThemedText>
                  <ThemedText>Qty: {item.quantity}</ThemedText>
                </View>
              )
            }}
            showsHorizontalScrollIndicator={false}
          />
        </ThemedView>
      </View>
    </ThemedView>
  );
}

function convertFilePathtoUri(filePath){
  const fileName = filePath.split("\\").pop();

  return `${API_BASE_URL}/uploads/${fileName}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "",
    width: "100%"
  },
  foodContainer:{
    flex: 1,
    backgroundColor: "",
    borderRadius: 5,
    padding: 10,
    marginHorizontal: 5
  },
  heading: {
    fontSize: 20
  },
  foodItem: {
    marginBottom: 10,
    borderRadius: 6,
    width: 120,
    marginRight: 10,
    padding: 8,
    backgroundColor: "#fff2",
    alignItems: "center",
    justifyContent: "center"
  },
  img: {
    height: 80,
    width: 80,
    borderRadius: 6,
    marginBottom: 4
  },
  showAllCard: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    width: 120, // ✅ same as foodItem width
    height: 130, // optional for uniform look
  },
  rowFoodContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    justifyContent: "space-evenly",
    paddingHorizontal: 10
  }
});
