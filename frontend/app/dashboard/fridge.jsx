import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'

const Fridge = () => {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Fridge</ThemedText>
    </ThemedView>
  )
}

export default Fridge

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
})