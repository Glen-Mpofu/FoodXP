import { StyleSheet, useColorScheme, Modal, TouchableOpacity, View, Platform, Alert, ImageBackground, Pressable, Image } from 'react-native'
import { useState } from 'react'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'

import React from 'react'
import { Colors } from '../constants/Colors'

import axios from "axios"
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';

//toast
import { Toast } from 'toastify-react-native'

// gradient
import { LinearGradient } from 'expo-linear-gradient'

import { API_BASE_URL } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"

//Notification
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"

//login page
const index = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        })
    })

    async function registerForPushNotificationsAsync() {
        let token;

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus

            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== "granted") {
                Toast.show({
                    type: "error",
                    text1: "Failed to get push token for notifications",
                    useModal: false
                })
                return;
            }

            // Get the expo push token
            token = (await Notifications.getExpoPushTokenAsync()).data
            console.log("Expo Push Token: ", token)

            await AsyncStorage.setItem("expoPushToken", token)
        } else {
            Toast.show({
                type: "error",
                text1: "Must use physical device for Push Notifications",
                useModal: false
            })
        }

        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.MAX
            })
        }
        return token
    }

    const [email, onEmailChange] = React.useState("");
    const [password, onPasswordChange] = React.useState("");
    const [showPassword, onShowPasswordChange] = React.useState(true);

    const [newPassword, onNewPasswordChange] = React.useState("");
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [emailBorderColor, setEmailBorderColor] = useState(theme.borderColor)
    const [passwordBorderColor, setPasswordBorderColor] = useState(theme.borderColor)

    async function handleSubmit() {
        if (!email.endsWith("@gmail.com")) {
            Toast.show({
                type: "error",
                text1: "Please enter a valid email",
                useModal: false
            })
            setEmailBorderColor(Colors.error)
            return;
        } else if (password.trim() === "") {
            Toast.show({
                type: "error",
                text1: "Please enter a password",
                useModal: false
            })
            setPasswordBorderColor(Colors.error)
            return;
        }
        setEmailBorderColor(theme.borderColor)
        setPasswordBorderColor(theme.borderColor)
        const foodieData = {
            email,
            password
        }
        const baseURL = Platform.OS === "web" ? "http://localhost:5001" : API_BASE_URL
        console.log(API_BASE_URL)
        axios.post(`${baseURL}/login`, foodieData, { withCredentials: true }).
            then(async res => {
                console.log(res.data);

                if (res.data.status === "ok") {
                    Toast.show({
                        type: "success",
                        text1: res.data.data,
                        useModal: false
                    });

                    // SETTING THE TOKEN 
                    await AsyncStorage.setItem("userToken", res.data.token)
                    setPasswordBorderColor(theme.borderColor)
                    setEmailBorderColor(theme.borderColor)

                    //EXPO NOTIFICATION TOKEN
                    if(Platform.OS === "android"){
                        const expoPushToken = await registerForPushNotificationsAsync();
                        await axios.post(`${API_BASE_URL}/save-token`, {
                            token: expoPushToken,
                            userEmail: email,
                        }).catch(err => console.log("Failed to save push token:", err));

                        router.replace("/(protected)/dashboard/");
                    } 

                    router.replace("/dashboard/");
                }
                else if (res.data.status === "no account") {
                    Toast.show({
                        type: "error",
                        text1: res.data.data,
                        useModal: false
                    })
                    setEmailBorderColor(Colors.error)
                }
                else if (res.data.status === "wrong password") {
                    Toast.show({
                        type: "error",
                        text1: res.data.data,
                        useModal: false
                    })
                    setPasswordBorderColor(Colors.error)
                } else {
                    Toast.show({
                        type: "error",
                        text1: res.data.data,
                        useModal: false
                    })
                }

            }).
            catch(e => { console.log(e) })
    }

    //modal
    const [modalVisible, setModalVisible] = useState(false)
    const openFogotPassWordModal = () => {
        setModalVisible(true);
    }

    const closeForgotPasswordModal = () => {
        setModalVisible(false);
    }

    return (
        //main view
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>

            <ThemedView style={styles.mainView}>
                {/* foodxp heading*/}
                <ThemedText style={styles.heading}>FoodXP</ThemedText>

                <ThemedText style={styles.wHeading} >Welcome Back!</ThemedText>
                <ThemedText >Sign in to access your dashboard!</ThemedText>

                <View style={styles.inputView}>
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>
                    <ThemedTextInput style={[{ borderColor: emailBorderColor }, styles.input]} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    <ThemedText style={[{ marginBottom: 0 }]}>Password</ThemedText>

                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[styles.input, { width: "85%", borderColor: passwordBorderColor }]} secureTextEntry={showPassword} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />
                        <Pressable onPress={() => onShowPasswordChange(!showPassword)}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={"purple"} />
                        </Pressable>
                    </View>

                    <TouchableOpacity onPress={openFogotPassWordModal} style={{ width: "100%", alignSelf: 'flex-end' }}>
                        <ThemedText style={[styles.forgotPassword, { color: theme.forgotPassword, backgroundColor: "transparent" }]}>Forgot Password?</ThemedText>
                    </TouchableOpacity>

                </View>

                <ThemedView style={styles.links}>

                    <ThemedButton style={styles.button} onPress={() => handleSubmit()}>
                        <ThemedText>Sign In</ThemedText>
                    </ThemedButton>

                    <ThemedLink href="/register" style={styles.registerLink}>
                        <ThemedText>No Account? SignUp</ThemedText>
                    </ThemedLink>

                </ThemedView>

                <Modal
                    transparent={true}
                    animationType='slide'
                    visible={modalVisible}
                    onRequestClose={closeForgotPasswordModal}
                >
                    <ThemedView style={styles.modalOverlay}>
                        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
                            <ThemedText>
                                Password Change
                            </ThemedText>

                            <ThemedTextInput style={styles.input} value={password} onChangeText={onPasswordChange} placeholder="Enter your Old Password" />

                            <ThemedTextInput style={styles.input} value={newPassword} onChangeText={onNewPasswordChange} placeholder="Enter your New Password" />
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={"purple"} />

                            <ThemedButton onPress={closeForgotPasswordModal}>
                                <ThemedText>
                                    Change
                                </ThemedText>
                            </ThemedButton>
                        </ThemedView>
                    </ThemedView>
                </Modal>
            </ThemedView>

        </ThemedView>
    )
}

export default index

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        flex: 1,
    },
    mainView: {
        width: "100%",
        maxWidth: 450,
        flex: Platform.OS === "android" ? 0.6 : 0.9,
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
        marginBottom: 10
    },
    forgotPassword: {
        fontSize: 12,
        marginBottom: Platform.OS === 'android' ? 5 : 30,
        alignSelf: 'flex-end'
    },
    inputView: {
        marginTop: 20,
        marginBottom: Platform.OS === "android" ? 0 : 20,
        width: "100%"
    },
    input: {
        width: '100%',
    },
    links: {
        flex: 0,
        alignContent: "center",
        alignItems: "stretch",
        marginTop: 10,
    },
    registerLink: {
        alignSelf: 'center',
        marginTop: 5,
    },
    button: {
        paddingVertical: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(30, 38, 49, 0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        padding: 20,
        borderRadius: 15,
        width: "80%",
        maxWidth: 400,
        alignItems: "center",
        flex: 0.6
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: "cover"
    },
    icon: {
        alignSelf: "center",
    },
    passwordContainer: {
        height: 70,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    }
})