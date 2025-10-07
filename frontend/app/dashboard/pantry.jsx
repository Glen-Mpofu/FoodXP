import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'

const Pantry = () => {
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