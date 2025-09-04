import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Slot } from 'expo-router'

const x_layout = () => {
    const [loaded] = useFonts[{
        Raleway: require("../assets/fonts/Raleway-VariableFont_wght.ttf")
    }]

    return (
        <Slot />
    )
}

export default x_layout

const styles = StyleSheet.create({})