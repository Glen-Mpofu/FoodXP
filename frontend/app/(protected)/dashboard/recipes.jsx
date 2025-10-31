import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import React, { useEffect } from 'react'
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router';
import { API_BASE_URL } from "@env"
import axios from 'axios';

const Recipes = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null);
  const [recipes, setRecipes] = React.useState([]);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        return router.replace("/");
      }
      setUserToken(token);

      if (recipes.length === 0) {
        const recipeResults = await axios.get(`${API_BASE_URL}/get-recipes`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRecipes(recipeResults.data.data);
      }
    };
    init();
  }, []);

  // ✅ split long instruction text into readable steps
  const formatInstructions = (text) => {
    if (!text) return [];
    return text
      .split(/(?<=\.)\s+|\n+/) // split on periods or new lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const rows = [];
  const itemWidth = 150;
  const { width: screenWidth } = useWindowDimensions();
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  for (let i = 0; i < recipes.length; i += itemsPerRow) {
    rows.push(recipes.slice(i, i + itemsPerRow));
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: " theme.uiBackground", width: screenWidth }]}>
      {rows.length > 0 ? (
        <ScrollView showsHorizontalScrollIndicator={false} style={[styles.scrollContainer, { width: screenWidth }]}
          contentContainerStyle={{
            flexGrow: 1,
            width: screenWidth,
          }}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ width: "100%" }}>
              {row.map(item => (
                <View key={item.idMeals} style={[styles.foodItem, { backgroundColor: theme.background }]}>
                  <Image source={{ uri: item.strMealThumb }} style={styles.img} />
                  <ThemedText style={{ fontSize: 20 }}>{item.strMeal}</ThemedText>
                  <ThemedText>{item.strCategory}</ThemedText>

                  <View style={{ width: "100%", flex: 1 }}>
                    {/* ✅ Improved readable instructions */}
                    <ScrollView
                      style={{ padding: 8, borderRadius: 8, }}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      {formatInstructions(item.strInstructions).map((step, index) => (
                        <ThemedText key={index} style={{ fontSize: 14, lineHeight: 20, marginBottom: 6 }}>
                          {index + 1}) {step}
                        </ThemedText>
                      ))}
                    </ScrollView>

                    {/* Ingredients */}
                    <ScrollView
                      style={{ padding: 8, marginLeft: 10, backgroundColor: theme.uiBackground, borderRadius: 8 }}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      {Array.from({ length: 20 }, (_, i) => {
                        const ingredient = item[`strIngredient${i + 1}`];
                        const measure = item[`strMeasure${i + 1}`];
                        if (!ingredient) return null;
                        return (
                          <ThemedText key={i} style={{ marginBottom: 4 }}>
                            • {ingredient} - <ThemedText style={{ fontStyle: "italic" }}>({measure})</ThemedText>
                          </ThemedText>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.heading}>No recipes yet. Add food items to get recipes</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
};

export default Recipes;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "",
    alignItems: "center",
    alignContent: "center"
  },
  heading: {
    fontSize: 18,
    margin: 10
  },
  foodItem: {
    marginBottom: 25,
    borderRadius: 30,
    width: "100%",
    marginRight: 10,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    flexShrink: 1
  },
  img: {
    height: 250,
    width: 250,
    borderRadius: 6,
    marginBottom: 4
  },
  showAllCard: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    width: 110,
    height: 150,
  },
  qty: {
    fontSize: 11
  },
  nameTxt: {
    fontSize: 15
  },
  emptyContainer: {
    justifyContent: "",
    alignItems: "center"
  },
  scrollContainer: {
    flexGrow: 1,
    margin: 10,
  }
});
