import { StyleSheet, useColorScheme, TouchableOpacity, View, Platform } from 'react-native'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'

//api access
import axios from "axios"


import React from 'react'
import { Colors } from '../constants/Colors'
import { router } from 'expo-router'


//login page
const Register = () => {
    const [email, onEmailChange] = React.useState("");
    const [password, onPasswordChange] = React.useState("");
    const [userName, onNameChange] = React.useState("");
    const [userPhone, onPhoneChange] = React.useState("");

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    function handleSubmit() {
        const foodieData = {
            email: email,
            name: userName,
            password: password,
            phone: userPhone
        };
        axios.post("http://192.168.101.174:5000/register", foodieData).
            then(res => { console.log(res.data); router.push("/"); }).
            catch((e) => { console.log(e) })
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>

            <ThemedView style={styles.mainView}>
                <ThemedText style={styles.heading}>FoodXP</ThemedText>

                <ThemedText style={styles.wHeading} >Sign Up</ThemedText>
                <ThemedText >Sign up to access your Everything FoodXP!</ThemedText>

                <View style={styles.inputView}>
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>

                    <ThemedTextInput style={styles.input} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Name</ThemedText>

                    <ThemedTextInput style={styles.input} value={userName} onChangeText={onNameChange} placeholder="Enter your Name" />

                    <ThemedText style={[{ marginBottom: 0 }]}>Password</ThemedText>

                    <ThemedTextInput style={styles.input} secureTextEntry={true} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />

                    <ThemedText style={[{ marginBottom: 0 }]}>Phone</ThemedText>

                    <ThemedTextInput style={styles.input} value={userPhone} onChangeText={onPhoneChange} placeholder="Enter your Phone" />
                </View>
                <ThemedView style={styles.links}>
                    <ThemedButton style={styles.button} onPress={() => handleSubmit()}>
                        <ThemedText>Sign Up</ThemedText>
                    </ThemedButton>

                    <ThemedLink href="/" style={styles.registerLink}>
                        <ThemedText>Already Have an Account? Sign In</ThemedText>
                    </ThemedLink>
                </ThemedView>

            </ThemedView>
        </ThemedView>
    )
}

export default Register

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
    mainView: {
        width: "100%",
        maxWidth: 450,
        flex: Platform.OS === "android" ? 0.8 : 0.9,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderRadius: 50, // center children horizontally
        padding: 30,
        alignItems: "center",
    },
    wHeading: {
        fontSize: 28,
        fontWeight: '600',
        marginBottom: 5
    },
    heading: {
        fontSize: 40,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 10,
        marginTop: Platform.OS === "android" ? 20 : 0
    },
    inputView: {
        marginTop: 20,
        marginBottom: Platform.OS === "android" ? 0 : 20,
    },
    button: {
        borderRadius: 10,
        marginBottom: 10,
        marginTop: Platform.OS === "android" ? 5 : 50
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
    },
    links: {
        flex: 0,
        alignContent: "center",
        alignItems: "center",
        marginTop: 10,
        width: '100%',
    },
    registerLink: {
        alignSelf: 'center',
        marginTop: 5,
    },
})