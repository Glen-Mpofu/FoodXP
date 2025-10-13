// app/dashboard.js
import { Platform, StyleSheet } from 'react-native';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import axios from "axios"
import { Toast } from 'toastify-react-native';

export default function Dashboard() {
    const router = useRouter();
    const [userToken, setUserToken] = React.useState(null)
    const [pantryFood, onPantryFoodChange] = React.useState()
  
  useEffect(async () => {
      const init = async () => {
        const token = await AsyncStorage.getItem("userToken");
        if(!token){
          router.replace("/")
          return;
        }
        setUserToken(token);
  
        const baseUrl = Platform.OS === 'android' ? "http://192.168.137.1:5001/getpantryfood" : "http://localhost:5001/getpantryfood"
        const result = await axios.get(baseUrl, {withCredentials: true})
        onPantryFoodChange(result.status)
      };
  
      init();
    }, [])
    
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
      <ThemedView style={styles.foodContainer}>
        <ThemedText>Pantry foods</ThemedText>
        <ThemedText>{pantryFood}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.foodContainer}>
        <ThemedText>Fridge foods</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
  foodContainer:{
    justifyContent: "",
    flex: 0.3,
    backgroundColor: "red",
    margin: 20
  }
});
