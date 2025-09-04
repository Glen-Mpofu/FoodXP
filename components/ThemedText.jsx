import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const ThemedText = ({ style, ...props }) => {
    return (
        <Text style={[styles.text, style]} {...props} />
    )
}

export default ThemedText

const styles = StyleSheet.create({
    text: {
        fontFamily: "Raleway"
    }
})