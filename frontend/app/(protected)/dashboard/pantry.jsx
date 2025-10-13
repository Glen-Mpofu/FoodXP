import { Platform, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import axios from 'axios'
import FoodCard from '../../../components/FoodCard'
import { Toast } from 'toastify-react-native'

const Pantry = () => {
  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)
  const [pantryFood, onPantryFoodChange] = React.useState()

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if(!token){
        router.replace("/")
        return;
      }
      setUserToken(token);

      const baseUrl = Platform.OS === 'android' ? "http://192.168.137.1:5001/getpantryfood" : "http://localhost:5001/getpantryfood"
      const result = axios.get(baseUrl, {withCredentials: true}).then((res) => {
        onPantryFoodChange(res.data.data)
        console.log(pantryFood)
      }).catch((err) => {
        console.error(err)
        Toast.show({
          type: "error",
          text1: "Something went wrong",
          useModal: false
        })
      })
    };

    init();
  }, [])
  
  return (
    <ThemedView style={styles.container}> 
      <ThemedText style={styles.heading}>Pantry</ThemedText>
      <FoodCard>

      </FoodCard>
    </ThemedView>
  )
}

export default Pantry

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
  heading:{
    alignSelf: "center"
  }
})