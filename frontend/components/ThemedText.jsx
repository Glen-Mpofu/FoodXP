import { Platform, StyleSheet, Text, View } from 'react-native'
import React from 'react'

import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

const ThemedText = ({ style, ...props }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <Text style={[style, styles.text, { color: theme.text }]} {...props} />
    )
}

export default ThemedText

const styles = StyleSheet.create({
    text: {
        fontFamily: "AlanSans",
        fontWeight: Platform.OS != "web" ? "800" : "regular"
    }
})