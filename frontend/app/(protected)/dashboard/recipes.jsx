import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
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
  const theme = Colors[colorScheme] ?? Colors.light

  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)
  const [recipes, setRecipes] = React.useState([])
  const { width: screenWidth } = useWindowDimensions(); // automatically updates on resize
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken")
      if (!token) {
        return router.replace("/")
      }
      setUserToken(token)

      if (recipes.length === 0) {
        // recipes
        const recipeResults = await axios.get(`${API_BASE_URL}/get-recipes`, {
          withCredentials: true,
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

  const rows = [];
  for (let i = 0; i < recipes.length; i += itemsPerRow) {
    rows.push(recipes.slice(i, i + itemsPerRow));
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
      {rows.length > 0 ? (
        <ScrollView showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(item => (
                <View key={item.idMeals} style={styles.foodItem}>
                  <Image source={{ uri: item.strMealThumb }} style={styles.img} />
                  <ThemedText>{item.strMeal}</ThemedText>
                  <ThemedText>{item.strCategory}</ThemedText>

                  <View style={{ flexDirection: "row", width: "100%", flex: 1 }}>
                    {/* Instructions */}
                    <ScrollView
                      style={{ flex: 3, padding: 8, borderRadius: 8 }}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>
                        {item.strInstructions}
                      </ThemedText>
                    </ScrollView>

                    {/* Ingredients */}
                    <ScrollView
                      style={{ flex: 1, padding: 8, marginLeft: 10, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8 }}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      {Array.from({ length: 20 }, (_, i) => {
                        const ingredient = item[`strIngredient${i + 1}`];
                        const measure = item[`strMeasure${i + 1}`]
                        if (!ingredient) return null;
                        return (
                          <ThemedText key={i} style={{ marginBottom: 4 }}>
                            • {ingredient} - <ThemedText style={{ fontStyle: "italics" }}>({measure})</ThemedText>
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
}

export default Recipes

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
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
    height: 500,
    paddingStart: 20,
    elevation: 5
  },
  heading: {
    fontSize: 18,
    margin: 10
  },
  foodItem: {
    marginBottom: 10,
    borderRadius: 6,
    width: "100%",
    marginRight: 10,
    padding: 8,
    backgroundColor: "rgba(150, 99, 49, 0.13)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 4, height: 5 },
    elevation: 3,
    flexShrink: 1
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
  },
  emptyContainer: {
    justifyContent: "",
    alignItems: "center"
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 10
  }
})