import { Platform, Pressable, StyleSheet, useColorScheme } from 'react-native'
import React from 'react'

import { Colors } from '../constants/Colors'

const ThemedButton = ({ style, ...props }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  return (
    <Pressable style={[{
      backgroundColor: theme.background,
      borderColor: theme.text,
    }, styles.button, style]} {...props} />
  )
}

export default ThemedButton

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderWidth: 1,
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    width: '100%',
  }
})