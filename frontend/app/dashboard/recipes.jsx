import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';

import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

const Recipes = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

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