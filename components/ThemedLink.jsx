import { StyleSheet } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const ThemedLink = ({ style, ...props }) => {
    return (
        <Link style={[styles.link, style]} {...props} asChild/>
    )
}

export default ThemedLink

const styles = StyleSheet.create({
    link: {
        borderBottomWidth: 1,
        borderBottom: "solid",
        margin: 10
    }
})