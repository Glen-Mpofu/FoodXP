// app/dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Image,
  StyleSheet,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import { useColorScheme } from "react-native";
import { Colors } from "../../../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "@env";
import { useFocusEffect } from "@react-navigation/native";
import { getCurrentLocation } from "../../../components/locantion";

export default function Dashboard() {
  const router = useRouter();
  const [userToken, setUserToken] = useState(null);
  const [pantryFood, setPantryFood] = useState([]);
  const [fridgeFood, setFridgeFood] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = 120;
  const maxItems = Math.max(1, Math.floor((screenWidth - 40) / cardWidth));

  const loadPantry = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getpantryfood`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPantryFood(res.data.data || []);
  };

  const loadFridge = async (token) => {
    const res = await axios.get(`${API_BASE_URL}/getfridgefood`, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    setFridgeFood(res.data.data || []);
  };

  const loadSuggestedRecipes = async (token) => {
    try {
      setLoadingSuggestions(true);

      const res = await axios.get(
        `${API_BASE_URL}/getSuggestedRecipes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuggestedRecipes(res.data.recipes || []);
    } catch (err) {
      console.error("AI suggested recipes error:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const userLocation = async (token) => {
    try {
      const location = await getCurrentLocation();
      await axios.post(
        `${API_BASE_URL}/userLocation`,
        { location },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      ).then(async (res) => {
        if (res.data.status === "ok") {
          const sugPickups = await axios.post(`${API_BASE_URL}/getRecommendedPickupLocations`, {}, { headers: { Authorization: `Bearer ${token}` } })
        }
      })

    } catch (err) {
      // ignore location errors gracefully
      console.warn("userLocation error:", err?.message || err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return router.replace("/");
      setUserToken(token);

      await Promise.all(
        [
          loadPantry(token),
          loadFridge(token),
          loadSuggestedRecipes(token),
          userLocation(token)
        ]
      );
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        try {
          const [shouldRefresh, shouldRefreshPantry, shouldRefreshFridge] = await Promise.all([
            AsyncStorage.getItem("refreshRecipes"),
            AsyncStorage.getItem("refreshPantry"),
            AsyncStorage.getItem("refreshFridge"),
          ]);

          if ((shouldRefresh === "true" || shouldRefresh === null) && isActive) {
            await loadData();
            await AsyncStorage.setItem("refreshRecipes", "false");
          }
          if ((shouldRefreshPantry === "true" || shouldRefreshPantry === null) && isActive) {
            await loadPantry(userToken);
            await AsyncStorage.setItem("refreshPantry", "false");
          }
          if ((shouldRefreshFridge === "true" || shouldRefreshFridge === null) && isActive) {
            await loadFridge(userToken);
            await AsyncStorage.setItem("refreshFridge", "false");
          }
        } catch (err) {
          console.error("Error during focus effect:", err);
        }
      };

      fetchData();

      return () => {
        isActive = false;
      };
    }, [userToken])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // small card renderer
  const renderFoodCard = (item) => {
    const name = item?.name ?? "Unknown";
    const amount = item?.amount ?? "";
    const unit = item?.unitofmeasure ?? item?.unitOfMeasure ?? "";
    return (
      <View style={[styles.foodItem, { backgroundColor: theme.background }]}>
        <Image
          source={{ uri: item.photo }}
          style={styles.img}
          resizeMode="cover"
        />
        <ThemedText style={styles.nameTxt} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText style={styles.qty}>
          {amount} {unit}
        </ThemedText>
      </View>
    );
  };

  const renderShowAllCard = (label, path) => (
    <TouchableOpacity
      onPress={() => router.replace(path)}
      style={[styles.showAllCard, { backgroundColor: theme.brand || theme.showAll }]}
    >
      <ThemedText style={{ fontWeight: "700", textAlign: "center" }}>{label}</ThemedText>
      <Ionicons name="arrow-forward" size={16} color={theme.text} />
    </TouchableOpacity>
  );

  const renderPantryItem = ({ item, index }) =>
    item?.type === "show_all" ? renderShowAllCard("Show all pantry", "/dashboard/pantry") : renderFoodCard(item);

  const renderFridgeItem = ({ item, index }) =>
    item?.type === "show_all" ? renderShowAllCard("Show all fridge", "/dashboard/fridge") : renderFoodCard(item);
  const renderSuggestedCard = (recipe, index) => {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => {
          setSelectedRecipe(recipe);
          setShowRecipeModal(true);
        }}
        style={[
          styles.suggestedCard,
          { backgroundColor: theme.background }
        ]}
      >
        <ThemedText numberOfLines={1} style={styles.suggestedTitle}>
          {recipe.name}
        </ThemedText>

        <ThemedText numberOfLines={3} style={styles.suggestedDesc}>
          {recipe.description}
        </ThemedText>

        <View style={styles.suggestedMeta}>
          <ThemedText style={styles.suggestedMetaText}>{recipe.time}</ThemedText>
          <ThemedText style={styles.suggestedMetaText}>{recipe.difficulty}</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.uiBackground }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.iconColor} />}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={[styles.header, { backgroundColor: "transparent" }]}>
        <View>
          <ThemedText style={styles.subtitle}>experiment with your food.
            share your crumbs
          </ThemedText>
        </View>

        <View style={styles.headerButtons}>
          <MaterialCommunityIcons name="chef-hat" size={30} color={theme.iconColor} />
        </View>
      </ThemedView>

      {/* Row: Pantry + Fridge stacked for clarity */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { width: "100%" }]}>
          <ThemedText style={styles.sectionTitle}>Pantry</ThemedText>
        </View>

        <FlatList
          horizontal
          data={[...pantryFood.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
          renderItem={renderPantryItem}
          keyExtractor={(item, idx) => item.type === "show_all" ? "pantry-show_all" : item.id ?? `pantry-${idx}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.flatListContent, { width: "100%" }]}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.cardColor }]}>
              <Ionicons name="nutrition" size={36} color={theme.iconColor} />
              <ThemedText style={{ marginTop: 8 }}>No pantry items</ThemedText>
            </View>
          }
        />
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeader, { width: "100%" }]}>
          <ThemedText style={styles.sectionTitle}>Fridge</ThemedText>
        </View>

        <FlatList
          horizontal
          data={[...fridgeFood.slice(0, maxItems - 1), { id: "show_all", type: "show_all" }]}
          renderItem={renderFridgeItem}
          keyExtractor={(item, idx) => item.type === "show_all" ? "fridge-show_all" : item.id ?? `fridge-${idx}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.flatListContent, { width: "100%" }]}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.cardColor }]}>
              <Ionicons name="ice-cream" size={36} color={theme.iconColor} />
              <ThemedText style={{ marginTop: 8 }}>No fridge items</ThemedText>
            </View>
          }
        />
      </View>

      <View style={styles.recipesSection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>AI Suggested Recipes</ThemedText>

          <TouchableOpacity
            onPress={() => loadSuggestedRecipes(userToken)}
            style={{ paddingLeft: 20 }}
          >
            <Ionicons name="refresh" size={20} color={theme.iconColor} />
          </TouchableOpacity>
        </View>

        {loadingSuggestions ? (
          <View style={[styles.suggestedPlaceholder, { backgroundColor: theme.background }]}>
            <ThemedText>Loading AI suggestions...</ThemedText>
          </View>
        ) : suggestedRecipes.length === 0 ? (
          <View style={[styles.suggestedPlaceholder, { backgroundColor: theme.background }]}>
            <ThemedText>No suggestions available</ThemedText>
          </View>
        ) : (
          <View style={{ width: "100%", alignItems: "center", marginTop: 12, }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ justifyContent: "center" }}
            >

              {suggestedRecipes.map((recipe, i) => renderSuggestedCard(recipe, i))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Fun fact */}
      <View style={[styles.funBox, { backgroundColor: theme.background }]}>
        <ThemedText style={[styles.funFactText]}>
          While millions go hungry In South Africa, 10 million tonnes of food goes to waste every year; a third of the food produced.
        </ThemedText>
        <ThemedText style={[styles.funFactText, { marginTop: 8, fontWeight: "700" }]}>WWF</ThemedText>
      </View>
      {/* ──────────────────────────────── */}
      {/* RECIPE DETAILS MODAL            */}
      {/* ──────────────────────────────── */}
      {showRecipeModal && selectedRecipe && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowRecipeModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={theme.iconColor} />
            </TouchableOpacity>

            <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>

              <ThemedText style={styles.modalTitle}>{selectedRecipe.name}</ThemedText>

              <ThemedText style={styles.modalDescription}>
                {selectedRecipe.description}
              </ThemedText>

              <ThemedText style={styles.modalSectionTitle}>Ingredients:</ThemedText>
              {selectedRecipe.ingredients?.map((ing, idx) => (
                <ThemedText key={idx} style={styles.modalListItem}>
                  • {ing.ingredient} — {ing.measure}
                </ThemedText>
              ))}

              <ThemedText style={styles.modalSectionTitle}>Instructions:</ThemedText>
              {selectedRecipe.instructions?.map((step, idx) => (
                <ThemedText key={idx} style={styles.modalListItem}>
                  {idx + 1}. {step}
                </ThemedText>
              ))}

              <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-evenly" }}>
                <ThemedText>⏱ {selectedRecipe.time}</ThemedText>
                <ThemedText>⚡ {selectedRecipe.difficulty}</ThemedText>
              </View>

            </ScrollView>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  section: {
    marginTop: 8,
    marginBottom: 18,
  },
  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 12,
    position: "relative", // allows right icon without affecting center
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewAll: {
    fontSize: 13,
    color: "#888",
  },
  flatListContent: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  foodItem: {
    marginRight: 12,
    borderRadius: 14,
    width: 120,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  img: {
    height: 80,
    width: 80,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#eee",
  },
  nameTxt: {
    fontSize: 13,
    fontWeight: "600",
  },
  qty: {
    fontSize: 11,
    color: "#666",
  },
  showAllCard: {
    marginRight: 12,
    borderRadius: 14,
    width: 120,
    height: 160,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    elevation: 3,
  },
  emptyCard: {
    width: 120,
    height: 160,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  recipesSection: {
    marginTop: 4,
    marginBottom: 18,
  },
  recipeCard: {
    width: 180,
    height: 120,
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeImg: {
    width: "100%",
    height: 72,
    borderRadius: 8,
  },
  recipePlaceholder: {
    width: 180,
    height: 120,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  funBox: {
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
  },
  funFactText: {
    textAlign: "center",
    fontSize: 13,
    color: "#444",
  },
  suggestedCard: {
    width: 220,
    minHeight: 140,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "left",
  },
  suggestedDesc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },

  suggestedMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  suggestedMetaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  suggestedPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 16,
    padding: 20,
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 20,
  },
  modalSectionTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  },
  modalListItem: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center"
  }

});
