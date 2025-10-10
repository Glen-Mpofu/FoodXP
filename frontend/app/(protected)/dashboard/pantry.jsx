import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'

const Pantry = () => {
  const router = useRouter();
  const [userToken, setUserToken] = React.useState(null)

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if(!token){
        router.replace("/")
        return;
      }
      setUserToken(token);
    };

    init();
  }, [])
  
  return (
    <ThemedView style={styles.container}> 
      <ThemedText>Pantry</ThemedText>
    </ThemedView>
  )
}

export default Pantry

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
})