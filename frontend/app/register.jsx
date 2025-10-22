import { StyleSheet, useColorScheme, TouchableOpacity, View, Platform, Alert, Image, Pressable, ImageBackground } from 'react-native'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'
import { LinearGradient } from 'expo-linear-gradient'
import { API_BASE_URL } from "@env"
//api access
import axios from "axios"

import React from 'react'
import { Colors } from '../constants/Colors'
import { router } from 'expo-router'

import { Toast } from 'toastify-react-native'

import { Ionicons } from '@expo/vector-icons';
import registerNNPushToken from 'native-notify'

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
    
    let [emailBorderColor, setEmailBorderColor] = React.useState(theme.borderColor)
    let [passwordBorderColor, setPasswordBorderColor] = React.useState(theme.borderColor)
    let [nameBorderColor, setNameBorderColor] = React.useState(theme.borderColor)

    async function handleSubmit() {
        const subID = await registerNNPushToken(32486, 'rO2Gkf0kRxykOTtwu2XDeX');
        //valid email check
        const emailCheck = email.endsWith("@gmail.com");
        if(!emailCheck){
            Toast.show({
                type: "error",
                text1: "Wrong Email Format"
            })
            setEmailBorderColor(Colors.error)
            return;
        }

        setEmailBorderColor(theme.backgroundColor)
        
        //Name
        if(userName.trim() === ""){
            Toast.show({
                type: "error",
                text1: "Please enter a Name",
                useModal: false
            })
            setNameBorderColor(Colors.error)
            return;
        }

        setNameBorderColor(theme.borderColor)

        //password match check
        if(password != userConfirmPassword){
            Toast.show({
                type: "error",
                text1: "Passwords don't match",
                useModal: false
            })
            setPasswordBorderColor(Colors.error)
            return;
        }
        setPasswordBorderColor(theme.borderColor)

        const foodieData = {
            email: email.trim(),
            name: userName.trim(),
            password: userConfirmPassword.trim(),
            subID
        };

        const baseUrl = Platform.OS === "web" ? "http://localhost:5001" : API_BASE_URL

        axios.post(`${baseUrl}/register`, foodieData, {withCredentials: true}).
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
                    setEmailBorderColor(Colors.error)
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
            <ThemedView style={styles.mainView}>
                <ThemedText style={styles.heading}>FoodXP</ThemedText>

                <ThemedText style={styles.wHeading} >Sign Up</ThemedText>
                <ThemedText>Sign up to access Everything FoodXP!</ThemedText>
                
                <View style={styles.inputView}>
                    {/* EMAIL */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>
                    <ThemedTextInput style={[{ borderColor: emailBorderColor },styles.input]} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    {/* NAME */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Name</ThemedText>
                    <ThemedTextInput style={[{borderColor: nameBorderColor} , styles.input]} value={userName} onChangeText={onNameChange} placeholder="Enter your Name" />

                    {/* PASSWORD */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Password</ThemedText>
                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[styles.input, {width: "85%", borderColor: passwordBorderColor}]} secureTextEntry={showPassword} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />
                        <Pressable onPress={()=>onShowPasswordChange(!showPassword)}>
                            <Ionicons name={ showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={"purple"}/>    
                        </Pressable>
                    </View>

                    {/* CONFIRM PASSWORD */}
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Confirm Password</ThemedText>
                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[styles.input, {width: "85%", borderColor: passwordBorderColor}]} secureTextEntry={showConfirmPassword} value={userConfirmPassword} onChangeText={onChangeConfirmPassword} placeholder="Confirm Password" />
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
        alignItems: "center",
        width: "100%"
    },
    button: {
        borderRadius: 10,
        marginBottom: 10,
        marginTop: Platform.OS === "android" ? 5 : 50
    },
    input: {
        width: '100%',
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
        resizeMode: "cover"
    },
    icon:{
        alignSelf:"center",
    },
    passwordContainer:{
        height: 70,
        width: "100%", 
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        margin: 0,
        padding: 0,
    }
})