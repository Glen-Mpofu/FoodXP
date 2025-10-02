import { StyleSheet, useColorScheme, TouchableOpacity, View, Platform, Alert, Image, Pressable } from 'react-native'

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

import { Toast } from 'toastify-react-native'

import { Ionicons } from '@expo/vector-icons';

//login page
const Register = () => {
    const [email, onEmailChange] = React.useState("");
    const [userName, onNameChange] = React.useState("");
        //password
        const [password, onPasswordChange] = React.useState("");
        const [showPassword, onShowPasswordChange] = React.useState(true);

        //confirm pasword
        const [userConfirmPassword, onChangeConfirmPassword] = React.useState("");
        const [showConfirmPassword, onConfirmShowPasswordChange] = React.useState(true);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    function handleSubmit() {
        //valid email check
        const emailCheck = email.endsWith("@gmail.com");
        if(!emailCheck){
            Toast.show({
                type: "error",
                text1: "Wrong Email Format"
            })
            return;
        }

        //Name
        if(userName.trim() === ""){
            Toast.show({
                type: "error",
                text1: "Please enter a Name",
                useModal: false
            })
            return;
        }

        //password match check
        if(password != userConfirmPassword){
            Toast.show({
                type: "error",
                text1: "Passwords don't match",
                useModal: false
            })
            return;
        }

        const foodieData = {
            email: email,
            name: userName,
            password: userConfirmPassword,
        };
        axios.post("http://192.168.137.1:5001/register", foodieData).
            then(res => {
                if (res.data.status === 'ok') {                  
                    Toast.show({
                        type: "success",
                        text1: res.data.data,
                        useModal: false
                    })
                    router.push("/");
                }
                else if (res.data.status === 'foodie exists') {
                    Toast.show({
                        type: "error",
                        text1: res.data.data,
                        useModal: false
                    })
                }
                else {
                    Toast.show({
                        type: "error",
                        text1: res.data.data,
                        useModal: false
                    })    
                };

            }).
            catch((e) => { console.log(e) })
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <Image style={styles.bgImage} source={require("../assets/foodxp/bg2.jpg")} />

            <ThemedView style={styles.mainView}>
                <ThemedText style={styles.heading}>FoodXP</ThemedText>

                <ThemedText style={styles.wHeading} >Sign Up</ThemedText>
                <ThemedText>Sign up to access Everything FoodXP!</ThemedText>
                
                <View style={styles.inputView}>
                    {/* EMAIL */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>
                    <ThemedTextInput style={styles.input} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    {/* NAME */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Name</ThemedText>
                    <ThemedTextInput style={styles.input} value={userName} onChangeText={onNameChange} placeholder="Enter your Name" />

                    {/* PASSWORD */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Password</ThemedText>
                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[{width: "80%"}, styles.input]} secureTextEntry={showPassword} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />
                        <Pressable onPress={()=>onShowPasswordChange(!showPassword)}>
                            <Ionicons name={ showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={"purple"}/>    
                        </Pressable>
                    </View>

                    {/* CONFIRM PASSWORD */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Confirm Password</ThemedText>
                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[{width: "80%"},styles.input]} secureTextEntry={showConfirmPassword} value={userConfirmPassword} onChangeText={onChangeConfirmPassword} placeholder="Confirm Password" />
                        <Pressable onPress={()=>onConfirmShowPasswordChange(!showConfirmPassword)}>
                            <Ionicons name={ showConfirmPassword ? "eye" : "eye-off"} size={30} style={styles.icon}color={"purple"}/>    
                        </Pressable>
                    </View>
                </View>
                <ThemedView style={styles.links}>
                    <ThemedButton style={styles.button} onPress={() => handleSubmit()}>
                        <ThemedText>Sign Up</ThemedText>
                    </ThemedButton>

                    <ThemedLink href="/" style={styles.registerLink}>
                        <ThemedText style={{marginBottom: 30}}>Already Have an Account? Sign In</ThemedText>
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
        flex: Platform.OS === "android" ? 0.8 : 1,
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
        marginTop: Platform.OS === "android" ? 20 : 0,
    },
    inputView: {
        marginTop: 10,
        marginBottom: Platform.OS === "android" ? 0 : 20,
        alignItems: "center"
    },
    button: {
        borderRadius: 10,
        marginBottom: 10,
        marginTop: Platform.OS === "android" ? 5 : 50
    },
    input: {
        fontSize: 16,
        backgroundColor: 'transparent',
    },
    links: {
        flex: 0,
        alignContent: "center",
        alignItems: "center",
        marginTop: 20,
        width: '100%',
    },
    registerLink: {
        alignSelf: 'center',
        marginTop: 5,
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        height: "100%",
        width: "100%",
    },
    icon:{
        alignSelf:"center",
    },
    passwordContainer:{
        height: 70,
        width: "100%", 
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    }
})