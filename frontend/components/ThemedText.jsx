import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

const ThemedText = ({ style, ...props }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <Text style={[styles.text, {color: theme.text}, style]} {...props} />
    )
}

export default ThemedText

const styles = StyleSheet.create({
    text: {
        fontFamily: "Raleway",
    }
})