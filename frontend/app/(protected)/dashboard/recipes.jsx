import { Image, ScrollView, StyleSheet, useWindowDimensions, View, Modal, TouchableOpacity, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router';
import { API_BASE_URL } from "@env"
import axios from 'axios';
import ThemedButton from '../../../components/ThemedButton';
import { Toast } from 'toastify-react-native';

const Recipes = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const router = useRouter();
  const [userToken, setUserToken] = useState(null);

  const [recipes, setRecipes] = useState([]);
  const [aiRecipes, setAiRecipes] = useState([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);

  const [showFoodModal, setShowFoodModal] = useState(false)
  const [pantryFood, setPantryFood] = useState([]);
  const [fridgeFood, setFridgeFood] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);

  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  const rows = [];
  for (let i = 0; i < recipes.length; i += itemsPerRow) {
    rows.push(recipes.slice(i, i + itemsPerRow));
  }

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        return router.replace("/");
      }
      setUserToken(token);

      loadSuggestedRecipes(token);

    };
    init();
  }, []);

  function toggleSelect(item) {
    const exists = selectedFoods.find(f => f.id === item.id);
    if (exists) setSelectedFoods(selectedFoods.filter(f => f.id !== item.id));
    else setSelectedFoods([...selectedFoods, item]);
  }

  async function loadSuggestedRecipes(token) {
    try {
      const res = await axios.get(`${API_BASE_URL}/getSuggestedRecipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.recipes) {
        setSuggestedRecipes(res.data.recipes);
      } else {
        setSuggestedRecipes([]);
      }

    } catch (error) {
      console.error("Suggested recipe error:", error);
      setSuggestedRecipes([]);
    }
  }

  const loadPantry = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getpantryfood`, { headers: { Authorization: `Bearer ${token}` } });
    setPantryFood(res.data.data);
  };

  const loadFridge = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getfridgefood`, { withCredentials: true, headers: { Authorization: `Bearer ${token}` } });
    setFridgeFood(res.data.data);
  };

  const formatInstructions = (text) => {
    if (!text) return [];
    return text.split(/(?<=\.)\s+|\n+/).map(line => line.trim()).filter(line => line.length > 0);
  };

  async function openFoodModal() {
    setShowFoodModal(true)
    await loadFridge(userToken)
    await loadPantry(userToken)
  }

  // When generating AI recipes
  async function generateRecipes() {
    try {
      const result = await axios.post(`${API_BASE_URL}/getAiRecipe`, selectedFoods);

      if (result.data.error) {
        Toast.show({ type: "error", text1: result.data.error });
        setAiRecipes([]); // <-- always reset to empty array
        return;
      }

      setAiRecipes(Array.isArray(result.data.recipes) ? result.data.recipes : []);
      setShowFoodModal(false);

    } catch (error) {
      Toast.show({ type: "error", text1: "Error generating AI recipes" });
      console.error("Error generating AI recipes:", error);
      setAiRecipes([]); // <-- fallback
    }
  }


  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground, width: screenWidth }]}>
      <ThemedButton style={styles.btn} onPress={openFoodModal}>
        <ThemedText>Generate Recipes</ThemedText>
      </ThemedButton>
      <ScrollView style={{ width: screenWidth }} contentContainerStyle={{ padding: 10, flexGrow: 1 }}>

        {/* --- AI Recipes --- */}
        {aiRecipes.length > 0 ? (
          <View style={{ marginVertical: 20, width: "100%" }}>
            <ThemedText style={styles.heading}>
              AI-Generated Recipes
            </ThemedText>
            {aiRecipes.map((recipe, index) => (
              <View
                key={index}
                style={[
                  styles.foodItem,
                  { backgroundColor: theme.background, marginBottom: 20 } // add spacing between cards
                ]}
              >
                <ThemedText style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
                  {recipe.name}
                </ThemedText>
                <ThemedText style={{ fontStyle: "italic", marginBottom: 12, textAlign: "center" }}>
                  {recipe.description}
                </ThemedText>

                {/* Instructions */}
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.background, marginBottom: 10 }}>
                  <ThemedText style={{ fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>Instructions:</ThemedText>
                  {recipe.instructions.map((step, i) => (
                    <ThemedText style={{ textAlign: "center", marginBottom: 4 }} key={i}>
                      {i + 1}) {step}
                    </ThemedText>
                  ))}
                </View>

                {/* Ingredients */}
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.navBackground }}>
                  <ThemedText style={{ fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>Ingredients:</ThemedText>
                  {recipe.ingredients.map((ing, i) => (
                    <ThemedText style={{ textAlign: "center", marginBottom: 2 }} key={i}>
                      • {ing.ingredient} ({ing.measure})
                    </ThemedText>
                  ))}
                </View>

                <ThemedText style={{ marginTop: 8, textAlign: "center" }}>
                  ⏱ {recipe.time} | ⚡ {recipe.difficulty}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.eHeading}>
              Click Generate Recipes and Select Food Items to get recipes using.
            </ThemedText>
          </ThemedView>
        )}

        {/* --- Suggested Recipes --- */}
        {suggestedRecipes.length > 0 && (
          <View style={{ marginVertical: 20, width: "100%" }}>
            <ThemedText style={styles.heading}>
              Suggested Recipes (Based on Your Pantry & Fridge)
            </ThemedText>

            {suggestedRecipes.map((recipe, index) => (
              <View
                key={index}
                style={[
                  styles.foodItem,
                  { backgroundColor: theme.background, marginBottom: 20 }
                ]}
              >
                <ThemedText style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
                  {recipe.name}
                </ThemedText>

                <ThemedText style={{ fontStyle: "italic", marginBottom: 12, textAlign: "center" }}>
                  {recipe.description}
                </ThemedText>

                {/* Instructions */}
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.background, marginBottom: 10 }}>
                  <ThemedText style={{ fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>Instructions:</ThemedText>
                  {recipe.instructions.map((step, i) => (
                    <ThemedText key={i} style={{ textAlign: "center", marginBottom: 4 }}>
                      {i + 1}) {step}
                    </ThemedText>
                  ))}
                </View>

                {/* Ingredients */}
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.navBackground }}>
                  <ThemedText style={{ fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>Ingredients:</ThemedText>
                  {recipe.ingredients.map((ing, i) => (
                    <ThemedText key={i} style={{ textAlign: "center", marginBottom: 2 }}>
                      • {ing.ingredient} ({ing.measure})
                    </ThemedText>
                  ))}
                </View>

                <ThemedText style={{ marginTop: 8, textAlign: "center" }}>
                  ⏱ {recipe.time} | ⚡ {recipe.difficulty}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* --- Modal --- */}
      <Modal animationType="slide" transparent={true} visible={showFoodModal} onRequestClose={() => setShowFoodModal(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <ThemedText style={{ fontSize: 20, marginBottom: 10, alignSelf: "center" }}>Select Ingredients</ThemedText>

            <ScrollView style={{ width: "100%" }}>
              {[...fridgeFood, ...pantryFood].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.foodRow, { backgroundColor: theme.cardColor }, selectedFoods.some(f => f.id === item.id) && { backgroundColor: theme.selected, borderWidth: 2, borderColor: "#34c759" }]}
                  onPress={() => toggleSelect(item)}
                >
                  <Image source={{ uri: item.photo }} style={styles.foodImage} />
                  <View style={{ marginLeft: 10 }}>
                    <ThemedText style={styles.foodName}>{item.name}</ThemedText>
                    <ThemedText>{item.amount} ({item.unitofmeasure})</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, width: "100%" }}>
              <ThemedButton style={{ margin: 10 }} onPress={generateRecipes}>
                <ThemedText>Generate Recipes</ThemedText>
              </ThemedButton>
              <ThemedButton style={{ margin: 10 }} onPress={() => setShowFoodModal(false)}>
                <ThemedText>Close</ThemedText>
              </ThemedButton>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView >
  );
};

export default Recipes;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", width: "100%" },
  heading: { fontSize: 25, marginBottom: 10, textAlign: "center" },
  eHeading: { fontSize: 15, marginBottom: 10, textAlign: "center", textDecorationLine: "underline" },
  foodItem: { marginBottom: 25, borderRadius: 30, width: "100%", padding: 8, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 5 }, elevation: 6, flexShrink: 1 },
  img: { height: 250, width: 250, borderRadius: 6, marginBottom: 4 },
  emptyContainer: { justifyContent: "", alignItems: "", },
  scrollContainer: { flexGrow: 1, width: "100%" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.9)" },
  modalContent: { width: "90%", maxHeight: "80%", borderRadius: 16, padding: 15 },
  foodRow: { flexDirection: "row", alignItems: "center", padding: 10, marginVertical: 6, borderRadius: 12 },
  foodImage: { width: 60, height: 60, borderRadius: 10 },
  foodName: { fontSize: 16, fontWeight: "bold" },
  btn: { alignSelf: "flex-end", margin: 10, borderRadius: 50 }
});
