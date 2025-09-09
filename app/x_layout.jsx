import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Slot } from 'expo-router'
import { useFonts } from "expo-font"

const x_layout = () => {
    const [loaded] = useFonts({
        Raleway: require("../assets/fonts/Raleway-VariableFont_wght.ttf")
    });

    if (!loaded) {
        return null;
    }

    return (
        <View style={{ flex: 1, fontFamily: 'Raleway' }}>
            <Slot />
        </View>
    )
}

export default x_layout

const styles = StyleSheet.create({})