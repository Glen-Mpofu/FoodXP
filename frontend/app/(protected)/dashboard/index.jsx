// app/dashboard.js
import { Image, Platform, StyleSheet, View, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import axios, { Axios } from "axios"
import { Toast } from 'toastify-react-native';
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@env"
import ThemedButton from '../../../components/ThemedButton';

export default function Dashboard() {
  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)
  const [pantryFood, onPantryFoodChange] = React.useState([])
  const [fridgeFood, onFridgeFoodChange] = React.useState([])

  const [recipes, setRecipes] = React.useState([])

  const screenWidth = Dimensions.get("window").width;
  const itemWidth = 120; // width per item
  const maxItems = Math.floor(screenWidth / itemWidth) // calculation of how many items can fit

  useEffect(() => {
    //alert()
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/")
        return;
      }
      setUserToken(token);

      const baseUrl = API_BASE_URL
      alert(baseUrl)
      //pantry food
      const result = await axios.get(`${baseUrl}/getpantryfood`, { headers: { Authorization: `Bearer ${token}` } })
      onPantryFoodChange(result.data.data)

      //fridge food
      const resultFridge = await axios.get(`${baseUrl}/getfridgefood`, { headers: { Authorization: `Bearer ${token}` } })
      onFridgeFoodChange(resultFridge.data.data)
      if (recipes.length === 0) {
        // recipes
        const recipeResults = await axios.get(`${API_BASE_URL}/get-recipes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRecipes(recipeResults.data.data);
        //alert(JSON.stringify(recipeResults.data, null, 2));
      }
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
            horizontal
            data={[
              ...pantryFood.slice(0, maxItems - 1),
              { id: "show_all", type: "show_all" }
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.type === "show_all") {
                return (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/pantry")}
                    style={[styles.foodItem, styles.showAllCard]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                      Show All
                    </ThemedText>
                    <Ionicons name='arrow-forward' size={15} />
                  </TouchableOpacity>
                );
              }

              return (
                <View style={styles.foodItem}>
                  <Image
                    source={{ uri: convertFilePathtoUri(item.photo) }}
                    style={styles.img}
                  />
                  <ThemedText style={styles.nameTxt}>{item.name}</ThemedText>
                  <ThemedText style={styles.qty}>Qty: {item.quantity}</ThemedText>
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
            data={[
              ...fridgeFood.slice(0, maxItems - 1),
              { id: "show_all", type: "show_all" }
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.type === "show_all") {
                return (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/fridge")}
                    style={[styles.foodItem, styles.showAllCard]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                      Show All
                    </ThemedText>
                    <Ionicons name='arrow-forward' size={15} />
                  </TouchableOpacity>
                );
              }

              return (
                <View style={styles.foodItem}>
                  <Image
                    source={{ uri: convertFilePathtoUri(item.photo) }}
                    style={styles.img}
                  />
                  <ThemedText style={styles.nameTxt}>{item.name}</ThemedText>
                  <ThemedText style={styles.qty}>Qty: {item.quantity}</ThemedText>
                </View>
              )
            }}
            showsHorizontalScrollIndicator={false}
          />
        </ThemedView>
      </View>

      {/* RECIPE CONTAINER */}
      <View style={styles.rowFoodContainer}>
        <ThemedView style={styles.recipeContainer}>
          <ThemedText style={styles.heading}>Recipes</ThemedText>
          {recipes && recipes.length > 0 ? (
            <FlatList
              data={[...recipes.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
              keyExtractor={(item) => item.idMeals || item.id}
              renderItem={({ item }) => {
                if (item.type === "show_all") {
                  return (
                    <TouchableOpacity
                      onPress={() => router.replace("/dashboard/recipes")}
                      style={[styles.foodItem, styles.showAllCard]}
                    >
                      <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                        Show All
                      </ThemedText>
                      <Ionicons name='arrow-forward' size={15} />
                    </TouchableOpacity>
                  );
                }

                return (
                  <View style={styles.foodItem}>
                    <Image source={{ uri: item.strMealThumb }} style={styles.img} />
                    <ThemedText numberOfLines={2} style={[styles.nameTxt, { textAlign: "center" }]}>
                      {item.strMeal}
                    </ThemedText>
                  </View>
                );
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <ThemedText style={{ marginTop: 20 }}>Please add items to get recipes</ThemedText>
          )}

        </ThemedView>
      </View>
    </ThemedView>
  );
}

function convertFilePathtoUri(filePath) {
  const fileName = filePath.split("\\").pop();

  return `${API_BASE_URL}/uploads/${fileName}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "",
    width: "100%",
    paddingHorizontal: 0
  },
  foodContainer: {
    flex: 1,
    backgroundColor: "",
    borderRadius: 5,
    padding: 10,
    width: "100%",
    paddingHorizontal: 0,
    backgroundColor: "#ffffffff",
    borderRadius: 30,
    margin: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 4, height: 5 },
    height: 230,
    paddingStart: 20,
    elevation: 5
  },
  recipeContainer: {
    flex: 1,
    backgroundColor: "#ffffffff",
    borderRadius: 30,
    justifyContent: "",
    alignItems: "center",
    width: "100%",
    height: 220,
    paddingHorizontal: 0,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 4, height: 5 },
  },
  heading: {
    fontSize: 18,
    margin: 10
  },
  foodItem: {
    marginBottom: 10,
    borderRadius: 6,
    width: 110,
    marginRight: 10,
    padding: 8,
    backgroundColor: "rgba(150, 99, 49, 0.13)",
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 4, height: 5 },
    elevation: 3,
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
    width: 110, // ✅ same as foodItem width
    height: 150, // optional for uniform look
  },
  rowFoodContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    justifyContent: "space-evenly",
    paddingHorizontal: 10,
    height: 250,
  },
  qty: {
    fontSize: 11
  },
  nameTxt: {
    fontSize: 15
  }
});
