import { StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'

const ThemedTextInput = ({ style, ...props }) => {
    return (
        <TextInput style={[styles.textInput]} {...props} />
    )
}

export default ThemedTextInput

const styles = StyleSheet.create({
    textInput: {
        fontSize: 20,
        width: 250,
        height: 30,
        borderWidth: 10,
        border: "solid",
        margin: 5,
        borderRadius: 10,
        textAlign: "center"
    }
})