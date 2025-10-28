import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import axios from "axios"
import { API_BASE_URL } from "@env"

const donateMap = () => {
  const long = 29.4751215
  const lat = -23.8888663

  useEffect(()=>{
    async function init() {
      try {
        const response = await axios.post(`${API_BASE_URL}/get-ngos`, { lat, long }, { withCredentials: true });
        console.log("NGOs fetched:", response.data.data); // <-- log the NGOs here
      } catch (err) {
        console.error("Failed to fetch NGOs:", err);
      }
    };
    init();
  },[])

  return (
    <View>
      <Text>donateMap</Text>
    </View>
  )
}

export default donateMap

const styles = StyleSheet.create({})