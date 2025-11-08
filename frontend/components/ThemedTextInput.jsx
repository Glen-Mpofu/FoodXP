import { Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

const ThemedTextInput = ({ style, ...props }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <TextInput placeholderTextColor = {theme.taPlaceholder} style={[ styles.textInput, { borderColor: theme.borderColor, color: theme.taPlaceholder}, style]} {...props} />
    )
}

export default ThemedTextInput

const styles = StyleSheet.create({
    textInput: {
        fontFamily: "AlanSans",
        fontSize: 16,
        width: 250,
        height: Platform.OS === "web" ? 50 : 55,
        borderWidth: 3,
        border: "solid",
        margin: 5,
        borderRadius: 10,
        padding: Platform.OS === "web" ? 25 : 15,
        marginEnd: Platform.OS === "web" ? 20 : 10,
    }
})