// app/dashboard.js
import { Image, Platform, StyleSheet, View, Dimensions, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@env";
import { useFocusEffect } from "@react-navigation/native";

export default function Dashboard() {
  const router = useRouter();
  const [userToken, setUserToken] = useState(null);
  const [pantryFood, setPantryFood] = useState([]);
  const [fridgeFood, setFridgeFood] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const screenWidth = Dimensions.get("window").width;
  const itemWidth = 120;
  const maxItems = Math.floor(screenWidth / itemWidth);

  const loadPantry = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getpantryfood`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPantryFood(res.data.data);
  };

  const loadFridge = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getfridgefood`, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    setFridgeFood(res.data.data);
  };

  const loadRecipes = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/get-recipes`, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecipes(res.data.data);
  };

  // Master function
  const loadData = async () => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return router.replace("/");

    setUserToken(token);

    await Promise.all([
      loadPantry(token),
      loadFridge(token),
      loadRecipes(token)
    ]);
    await AsyncStorage.setItem("refreshFridge", "false");
    await AsyncStorage.setItem("refreshPantry", "false");
  };


  // --- Run once on mount ---
  useEffect(() => {
    loadData();
  }, []);

  // --- Listen for focus + refresh flag ---
  useFocusEffect(
    useCallback(() => {
      const handleFocus = async () => {
        const shouldRefresh = await AsyncStorage.getItem("refreshRecipes");
        const shouldRefreshPantry = await AsyncStorage.getItem("refreshPantry");
        const shouldRefreshFridge = await AsyncStorage.getItem("refreshFridge");

        // Always reload when screen gains focus for the first time
        if (shouldRefresh === "true" || shouldRefresh === null) {
          await loadData();
          await AsyncStorage.setItem("refreshRecipes", "false");
        }
        if (shouldRefreshPantry === "true" || shouldRefresh === null) {
          await loadPantry(userToken);
        }
        if (shouldRefreshFridge === "true" || shouldRefresh === null) {
          await loadFridge(userToken);
        }
      };

      handleFocus();
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={[{ backgroundColor: theme.uiBackground, height: "100%", width: "100%" }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, { backgroundColor: theme.uiBackground }]}>
        <View style={styles.rowFoodContainer}>
          <ThemedView style={[styles.foodContainer, { backgroundColor: theme.background }]}>
            {/* Pantry Food */}
            <ThemedText style={styles.heading}>Pantry foods</ThemedText>
            <FlatList
              horizontal
              data={[...pantryFood.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
              keyExtractor={(item) => item.type === "show_all" ? "pantry-show_all" : item.id}
              renderItem={({ item }) =>
                item.type === "show_all" ? (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/pantry")}
                    style={[styles.foodItem, styles.showAllCard, , { backgroundColor: theme.showAll }]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                      Show All
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={15} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.foodItem, { backgroundColor: theme.cardColor }]}>
                    <Image
                      source={{ uri: item.photo }}
                      style={styles.img}
                    />
                    <ThemedText style={styles.nameTxt}>{item.name}</ThemedText>
                    <ThemedText style={styles.qty}>Qty: {item.amount}</ThemedText>
                  </View>
                )
              }
              showsHorizontalScrollIndicator={false}
            />
          </ThemedView>

          {/* Fridge Food */}
          <ThemedView style={[styles.foodContainer, { backgroundColor: theme.background }]}>
            <ThemedText style={styles.heading}>Fridge foods</ThemedText>
            <FlatList
              horizontal
              data={[...fridgeFood.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
              keyExtractor={(item) => item.type === "show_all" ? "fridge-show_all" : item.id}
              renderItem={({ item }) =>
                item.type === "show_all" ? (
                  <TouchableOpacity
                    onPress={() => router.replace("/dashboard/fridge")}
                    style={[styles.foodItem, styles.showAllCard, , { backgroundColor: theme.showAll }]}
                  >
                    <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                      Show All
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={15} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.foodItem, { backgroundColor: theme.cardColor }]}>
                    <Image
                      source={{ uri: item.photo }}
                      style={styles.img}
                    />
                    <ThemedText style={styles.nameTxt}>{item.name}</ThemedText>
                    <ThemedText style={styles.qty}>Qty: {item.amount}</ThemedText>
                  </View>
                )
              }
              showsHorizontalScrollIndicator={false}
            />
          </ThemedView>
        </View>

        {/* Recipes */}
        <View style={styles.rowFoodContainer}>
          <ThemedView style={[styles.recipeContainer, { backgroundColor: theme.background }]}>
            <ThemedText style={styles.heading}>Recipes</ThemedText>
            {recipes && recipes.length > 0 ? (
              <FlatList
                data={[...recipes.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
                keyExtractor={(item) =>
                  item.type === "show_all"
                    ? "recipes-show_all"
                    : item.idMeals || item.id
                }
                renderItem={({ item }) =>
                  item.type === "show_all" ? (
                    <TouchableOpacity
                      onPress={() => router.replace("/dashboard/recipes")}
                      style={[styles.foodItem, styles.showAllCard, { backgroundColor: theme.showAll }]}
                    >
                      <ThemedText style={{ fontWeight: "bold", textAlign: "center" }}>
                        Show All
                      </ThemedText>
                      <Ionicons name="arrow-forward" size={15} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.foodItem, { backgroundColor: theme.cardColor }]}>
                      <Image source={{ uri: item.strMealThumb }} style={styles.img} />
                      <ThemedText
                        numberOfLines={2}
                        style={[styles.nameTxt, { textAlign: "center" }]}
                      >
                        {item.strMeal}
                      </ThemedText>
                    </View>
                  )
                }
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <ThemedText style={{ marginTop: 20 }}>
                Please add items to get recipes
              </ThemedText>
            )}
          </ThemedView>
        </View>

        {/* Fun Fact */}
        <ThemedText style={[styles.funFactText]}>
          In South Africa, 10 million tonnes of food go to waste every year.
          This accounts for a third of the 31 million tonnes that are produced annually in South Africa.
          Together, fruits, vegetables and cereals account for 70% of the wastage and loss.
          This wastage and loss primarily occur early in the food supply chain.
          As the South African diet continues to shift towards one that is higher in processed foods and lower in fruit and vegetables,
          malnutrition will increase as well. Reducing food waste in South Africa can improve the health and well-being of the majority of
          South Africans
        </ThemedText>
        <ThemedText style={styles.funFactText}>WWF</ThemedText>
      </View>
    </ScrollView>
  );
}

// Styles
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
    borderRadius: 30,
    margin: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 4, height: 5 },
    height: 230,
    paddingStart: 20,
    elevation: 5
  },
  
  heading: {
    fontSize: 18,
    margin: 10
  },
  foodItem: {
    marginBottom: 12,
    borderRadius: 12,
    width: 110,
    marginRight: 10,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  img: {
    height: 80,
    width: 80,
    borderRadius: 6,
    marginBottom: 4
  },
  showAllCard: {
    justifyContent: 'center',
    width: 110, // ✅ same as foodItem width
    height: 150, // optional for uniform look
  },
  rowFoodContainer: {
  flexDirection: "row",
  justifyContent: "space-evenly",
  alignItems: "flex-start",
  width: "100%",
  paddingHorizontal: 10,
  marginVertical: 10,
},


recipeContainer: {
  width: "95%",
  borderRadius: 30,
  alignItems: "center",
  height: 220,
  paddingHorizontal: 0,
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowOffset: { width: 4, height: 5 },
},
  qty: {
    fontSize: 11
  },
  nameTxt: {
    fontSize: 15
  },
  funFactText: {
    textAlign: "center",
    padding: 10,
    flex: 0.3,
    width: "100%"
  }
});