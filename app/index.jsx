import { StyleSheet, Text, View, TextInput } from 'react-native'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'

import React from 'react'

//login page
const index = () => {
    const [userName, onUserNameChange] = React.useState("")
    const [password, onPasswordChange] = React.useState("")

    return (
        <ThemedView >
            <ThemedText style={styles.heading} >Login</ThemedText>
            <ThemedTextInput value={userName} onChangeText={onUserNameChange} placeholder="Username" />
            <ThemedTextInput value={password} onChangeText={onPasswordChange} placeholder="Password" />

            <ThemedLink href="/dashboard">
                <ThemedText>Login</ThemedText>
            </ThemedLink>

            <ThemedLink href="/register" style={{ margin: 0 }}>
                <ThemedText>No Account? Register</ThemedText>
            </ThemedLink>
        </ThemedView>
    )
}

export default index

const styles = StyleSheet.create({
    heading: {
        fontSize: 50
    }
})