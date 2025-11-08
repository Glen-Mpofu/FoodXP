import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ThemedView from './ThemedView'
import ThemedText from './ThemedText'

const FoodCard = () => {
  return (
    <View style={styles.card}/>
  )
}

export default FoodCard

const styles = StyleSheet.create({
    card:{
        width: 100,
        height: 100,
        backgroundColor: "red",
        borderRadius: 50
    }
})