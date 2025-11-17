import { StyleSheet, useColorScheme, Modal, TouchableOpacity, View, Platform, Pressable, Image, Dimensions } from 'react-native'
import { useEffect, useState } from 'react'
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
import { registerForPushNotificationsAsync } from '../components/notificationsSetup'

const Index = () => {
    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token));
    }, []);
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
    const [expoPushToken, setExpoPushToken] = useState(null);

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

        const foodieData = { email: email.trim(), password: password.trim(), expoPushToken: expoPushToken }
        const baseURL = API_BASE_URL

        await axios.post(`${baseURL}/login`, foodieData, { withCredentials: true })
            .then(async res => {

                if (res.data.status === "ok") {
                    Toast.show({ type: "success", text1: res.data.data, useModal: false })
                    await AsyncStorage.setItem("userToken", res.data.token)
                    //await AsyncStorage.setItem("user_id", res.data.user_id)

                    await AsyncStorage.setItem("refreshRecipes", "false")
                    await AsyncStorage.setItem("refreshPantry", "false")
                    await AsyncStorage.setItem("refreshFridge", "false")

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
            .catch(e => console.error(e))
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
                colors={[theme.background, theme.navBackground, theme.uiBackground, theme.uiBackground]} // modern warm blend
                style={[styles.footer, { width: width }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.footerCard}>
                    <ThemedText style={styles.footerHeading}>Did You Know?</ThemedText>
                    <ThemedText style={styles.footerText}>
                        An absurd amount of food produced globally — nearly a third — is wasted before it’s ever eaten.
                        In South Africa, millions go hungry while edible food ends up in landfills.
                    </ThemedText>
                    <ThemedText style={styles.footerCredit}>© Paballo Thekiso, WWF</ThemedText>
                </View>
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
        justifyContent: "center",
    },
    wHeading: { fontSize: 28, fontWeight: '600', marginBottom: 5, fontFamily: "Raleway" },
    topGradient: {
        width: "100%",
        paddingVertical: 40,  // controls the vertical space of the gradient
        alignItems: "center",
        justifyContent: "flex-end",
        flex: 0.3,
        paddingHorizontal: 0
    },
    heading: {
        fontSize: 40,
        fontWeight: "bold", // fallback color if gradient fails
        textAlign: "center",
    },
    forgotPassword: { fontSize: 12, marginBottom: Platform.OS === 'android' ? 5 : 30, alignSelf: 'flex-end' },
    inputView: { marginTop: 20, marginBottom: Platform.OS === "android" ? 0 : 20, width: "100%" },
    input: { width: '100%' },
    links: { flex: Platform.OS === "web" ? 1 : 0.5, alignContent: "center", alignItems: "stretch", marginTop: 0, margin: Platform.OS === "web" ? 50 : 0 },
    registerLink: { alignSelf: 'center', marginTop: 5 },
    button: { paddingVertical: 15, borderRadius: 10, marginBottom: 10 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(30, 38, 49, 0.6)", justifyContent: "center", alignItems: "center" },
    modalContent: { padding: 20, borderRadius: 15, width: "80%", maxWidth: 400, alignItems: "center", flex: 0.6 },
    icon: { alignSelf: "center" },
    passwordContainer: { height: 70, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" },
    footer: {
        width: "100%",
        flex: 0.3,
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 6,
        elevation: 6,
    },

    footerCard: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        padding: 15,
        marginHorizontal: 20,
        borderRadius: 16,
        backdropFilter: "blur(10px)",
        alignItems: "center",
        justifyContent: "center",
    },

    footerHeading: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: 1,
    },

    footerText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#fff",
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 8,
    },

    footerCredit: {
        fontSize: 11,
        color: "#fff",
        opacity: 0.8,
        textAlign: "center",
    },

})