import { StyleSheet, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import axios from "axios"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

const Fridge = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {

      //token verification
      const token = await AsyncStorage.getItem("userToken")
      if(!token){
        return router.replace("/")
      }

      //fetching loadshedding
      try {
        // 1️⃣ Get the numeric area ID for Polokwane
        const areaRes = await axios.get("http://192.168.137.1:5001/loadshedding/area") 
        // assuming your server returns { areaId, name }
        const areaId = areaRes.data.areaId

        if (!areaId) throw new Error("Area ID not found")

        // 2️⃣ Get load shedding info for that area
        const statusRes = await axios.get(`http://192.168.137.1:5001/loadshedding/${areaId}`)
        setStatus(statusRes.data)
      } catch (error) {
        console.error("Load shedding fetch failed:", error)
      } finally {
        setLoading(false)
      }
    };

    init();
  }, [])

  if (loading) return <Text>Loading...</Text>

  if (!status) return <Text>Failed to load status</Text>

  return (
    <ThemedView style={styles.container}>
      <ThemedText>Fridge</ThemedText>
      <ThemedText>Current Stage: {status.stage}</ThemedText>
      <ThemedText>Next Change: {status.nextChange}</ThemedText>
    </ThemedView>
  )
}

export default Fridge

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
})
