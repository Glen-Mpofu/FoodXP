import { Platform, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { Toast } from "toastify-react-native";
import axios from "axios"
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import { Ionicons } from '@expo/vector-icons';

const Settings = () => {
  const [foodie, setFoodie] = React.useState(null)

  useEffect(() => {
    const baseUrl = Platform.OS === "web" ? "http://localhost:5001/session" : "http://192.168.137.1:5001/session"
    axios.get(baseUrl, {withCredentials: true})
    .then((res) => {
      if(res.data.status === "ok"){
        Toast.show({
          type: "success",
          text1: "Session on",
          useModal: false
        })
        setFoodie(res.data.data)
      }else{
        Toast.show({
          type: "error",
          text1: "Session off",
          useModal: false
        })
      }
    }).catch( err => {
      console.log(err)
    })

  }, [])

  return (
    <ThemedView style={styles.container}>
      <Ionicons name='person-circle' size={100}/>
      <ThemedText style={styles.heading}>Foodie Details</ThemedText>

      <View style={styles.rowContainer}>
        <Ionicons name ="aperture" size={20}/>
        <ThemedText style={styles.text}>
          {foodie?.name || "Loading"}
        </ThemedText>
      </View>
      <View style={styles.rowContainer}>
        <Ionicons name ="mail" size={20}/>
        <ThemedText style={styles.text}>
          {foodie?.email || "Loading"}
        </ThemedText>
      </View>

      <View style={{
        height: 1,
        backgroundColor: 'gray',
        width: '100%',
        marginVertical: 10
      }} />

      <View style={styles.cardContainer}>
        <ThemedView style={styles.cards}>
          <ThemedText style={styles.cardHeading}>Security</ThemedText>

          <ThemedText>Change Password</ThemedText>
          <ThemedText>Change Email</ThemedText>
          <ThemedText>Change Name</ThemedText>
            <View style={{
              height: 1,
              backgroundColor: 'gray',
              width: '100%',
              marginVertical: 10
            }} />

          <ThemedText>Delete Account</ThemedText>
          <ThemedText>Logout</ThemedText>
        </ThemedView>      

        <ThemedView style={styles.cards}>
          <ThemedText style={styles.cardHeading}>About FoodXP & the Programmer</ThemedText>
        </ThemedView>      
      </View>


    </ThemedView>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    justifyContent: "",
    alignItems: "center"
  },
  rowContainer: {
    flexDirection: "row",
  },
  cardContainer: {
    flexDirection: "row",
    height: "100%",
    width: "100%",
    margin: 5,
  },
  text: {
    fontSize: 13
  },
  heading:{
    fontSize: 20
  },
  cards: {
    height: "50%",
    width: "50%",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "blue",
    justifyContent: "",
    alignItems: "center",
    margin: 5
  },
  cardHeading: {
    fontSize: 18
  }
})