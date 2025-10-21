import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';

import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router';
import { API_BASE_URL } from "@env"

const Recipes = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken")
      if(!token){
        return router.replace("/")
      }
      setUserToken(token)
    };
    init();
  }, [])

  return (
    <ThemedView style={[styles.container,  {backgroundColor: theme.uiBackground} ]}>
      <ThemedText>My Recipes</ThemedText>
    </ThemedView>
  );
}

export default Recipes

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
})