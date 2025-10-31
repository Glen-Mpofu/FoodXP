import { StyleSheet, useColorScheme, Modal, TouchableOpacity, View, Platform, Pressable, Image, Dimensions } from 'react-native'
import { useEffect, useState } from 'react'
import registerNNPushToken, { getUserId } from 'native-notify';
//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'
import { LinearGradient } from 'expo-linear-gradient';

import React from 'react'
import { Colors } from '../constants/Colors'

import axios from "axios"
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';

//toast
import { Toast } from 'toastify-react-native'

import { API_BASE_URL } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"

const Index = () => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    const [email, onEmailChange] = React.useState("");
    const [password, onPasswordChange] = React.useState("");
    const [showPassword, onShowPasswordChange] = React.useState(true);
    const [newPassword, onNewPasswordChange] = React.useState("");

    const [emailBorderColor, setEmailBorderColor] = useState(theme.borderColor)
    const [passwordBorderColor, setPasswordBorderColor] = useState(theme.borderColor)

    const [modalVisible, setModalVisible] = useState(false)
    const { width, height } = Dimensions.get("window")

    // Handle login
    async function handleSubmit() {
        if (!email.endsWith("@gmail.com")) {
            Toast.show({ type: "error", text1: "Please enter a valid email", useModal: false })
            setEmailBorderColor(Colors.error)
            return;
        } else if (password.trim() === "") {
            Toast.show({ type: "error", text1: "Please enter a password", useModal: false })
            setPasswordBorderColor(Colors.error)
            return;
        }

        setEmailBorderColor(theme.borderColor)
        setPasswordBorderColor(theme.borderColor)

        const foodieData = { email: email.trim(), password: password.trim() }
        const baseURL = API_BASE_URL

        axios.post(`${baseURL}/login`, foodieData, { withCredentials: true })
            .then(async res => {
                console.log(res.data);

                if (res.data.status === "ok") {
                    Toast.show({ type: "success", text1: res.data.data, useModal: false })
                    await AsyncStorage.setItem("userToken", res.data.token)

                    router.replace("/dashboard/");
                }
                else if (res.data.status === "no account") {
                    Toast.show({ type: "error", text1: res.data.data, useModal: false })
                    setEmailBorderColor(Colors.error)
                }
                else if (res.data.status === "wrong password") {
                    Toast.show({ type: "error", text1: res.data.data, useModal: false })
                    setPasswordBorderColor(Colors.error)
                } else {
                    Toast.show({ type: "error", text1: res.data.data, useModal: false })
                }
            })
            .catch(e => console.log(e))
    }

    const openFogotPassWordModal = () => setModalVisible(true);
    const closeForgotPasswordModal = () => setModalVisible(false);

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background, height: height }]}>
            <LinearGradient
                colors={[theme.background, theme.navBackground]} // fade from transparent to background
                style={[styles.topGradient, { width: width }]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
            >
                <ThemedText style={styles.heading}>FoodXP</ThemedText>
            </LinearGradient>

            <ThemedView style={styles.mainView}>

                <ThemedText style={styles.wHeading}>Welcome Back!</ThemedText>
                <ThemedText>Sign in to access your dashboard!</ThemedText>

                <View style={styles.inputView}>
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>
                    <ThemedTextInput style={[{ borderColor: emailBorderColor }, styles.input]} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    <ThemedText style={[{ marginBottom: 0 }]}>Password</ThemedText>
                    <View style={styles.passwordContainer}>
                        <ThemedTextInput style={[styles.input, { width: "85%", borderColor: passwordBorderColor }]} secureTextEntry={showPassword} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />
                        <Pressable onPress={() => onShowPasswordChange(!showPassword)}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={theme.iconColor} />
                        </Pressable>
                    </View>

                    <TouchableOpacity onPress={openFogotPassWordModal} style={{ width: "100%", alignSelf: 'flex-end' }}>
                        <ThemedText style={[styles.forgotPassword, { color: theme.forgotPassword, backgroundColor: "transparent" }]}>Forgot Password?</ThemedText>
                    </TouchableOpacity>
                </View>

                <ThemedView style={styles.links}>
                    <ThemedButton style={styles.button} onPress={handleSubmit}>
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
                            <ThemedText>Password Change</ThemedText>
                            <ThemedTextInput style={styles.input} value={password} onChangeText={onPasswordChange} placeholder="Enter your Old Password" />
                            <ThemedTextInput style={styles.input} value={newPassword} onChangeText={onNewPasswordChange} placeholder="Enter your New Password" />
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={30} style={styles.icon} color={"purple"} />
                            <ThemedButton onPress={closeForgotPasswordModal}>
                                <ThemedText>Change</ThemedText>
                            </ThemedButton>
                        </ThemedView>
                    </ThemedView>
                </Modal>
            </ThemedView>
            <LinearGradient
                colors={[theme.navBackground, theme.uiBackground]} // fade from transparent to background
                style={[styles.footer, { width: width }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ThemedText style={styles.footerText}>
                    An absurd amount of the food produced in the world today – as much as a third – goes to waste across the supply chain.
                    A third of all edible food in South Africa is never consumed and ends up in landfill, adding pressure to an already over-extended waste system.
                    Meanwhile, millions don’t have enough to eat.
                </ThemedText>
                <ThemedText style={styles.footerText}>
                    © Paballo Thekiso of WWF
                </ThemedText>
            </LinearGradient>
        </ThemedView >
    )
}

export default Index

const styles = StyleSheet.create({
    container: { alignItems: "center", flex: 1, justifyContent: "space-between", },
    mainView: {
        width: "100%",
        maxWidth: 450,
        flex: 1, // take remaining space
        padding: 30,
        alignItems: "center",
        justifyContent: "center" // optional: center content vertically
    },
    wHeading: { fontSize: 28, fontWeight: '600', marginBottom: 5 },
    topGradient: {
        width: "100%",
        paddingVertical: 40,  // controls the vertical space of the gradient
        alignItems: "center",
        justifyContent: "flex-end",
        height: 230,
    },
    heading: {
        fontSize: 40,
        fontWeight: "bold", // fallback color if gradient fails
        textAlign: "center",
    },
    forgotPassword: { fontSize: 12, marginBottom: Platform.OS === 'android' ? 5 : 30, alignSelf: 'flex-end' },
    inputView: { marginTop: 20, marginBottom: Platform.OS === "android" ? 0 : 20, width: "100%" },
    input: { width: '100%' },
    links: { flex: 0, alignContent: "center", alignItems: "stretch", marginTop: 10 },
    registerLink: { alignSelf: 'center', marginTop: 5 },
    button: { paddingVertical: 15, borderRadius: 10, marginBottom: 10 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(30, 38, 49, 0.6)", justifyContent: "center", alignItems: "center" },
    modalContent: { padding: 20, borderRadius: 15, width: "80%", maxWidth: 400, alignItems: "center", flex: 0.6 },
    icon: { alignSelf: "center" },
    passwordContainer: { height: 70, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" },
    footer: {
        width: "100%",
        height: 150, // fixed height or adjust
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFDD59",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 5,
        elevation: 5,
        alignContent: "center",
    },
    footerText: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center"
    }
})
