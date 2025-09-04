import { StyleSheet, Text, View, TextInput } from 'react-native'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'

import React from 'react'

//login page
const Register = () => {
    const [userName, onUserNameChange] = React.useState("")
    const [password, onPasswordChange] = React.useState("")
    const [email, onEmailChange] = React.useState("")

    return (
        <ThemedView >
            <ThemedText style={styles.heading} >Register</ThemedText>
            <ThemedTextInput value={userName} onChangeText={onUserNameChange} placeholder="Username" />
            <ThemedTextInput value={password} onChangeText={onPasswordChange} placeholder="Password" />
            <ThemedTextInput value={email} onChangeText={onEmailChange} placeholder="Email" />

            <ThemedLink href="/">
                <ThemedText>Register</ThemedText>
            </ThemedLink>
        </ThemedView>
    )
}

export default Register

const styles = StyleSheet.create({
    heading: {
        fontSize: 50
    }
})