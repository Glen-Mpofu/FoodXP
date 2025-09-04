import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const ThemedCard = ({ style, ...props }) => {
    return (
        <View style={[styles.card, style]} {...props} />
    )
}

export default ThemedCard

const styles = StyleSheet.create({
    card: {
        height: 400,
        width: 300,
        backgroundColor: "red"
    }
})