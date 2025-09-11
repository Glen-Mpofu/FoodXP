import { StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

const ThemedTextInput = ({ style, ...props }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <TextInput style={[styles.textInput, {borderColor: theme.borderColor}]} {...props} />
    )
}

export default ThemedTextInput

const styles = StyleSheet.create({
    textInput: {
        fontFamily: "RaleWay",
        fontSize: 15,
        width: 250,
        height: 50,
        borderWidth: 1,
        border: "solid",
        margin: 5,
        borderRadius: 10,
        textAlign: "center",
    }
})