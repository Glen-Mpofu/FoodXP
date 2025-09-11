import { StyleSheet, useColorScheme, Modal,TouchableOpacity, View, Platform, Pressable } from 'react-native'
import { useState } from 'react'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'

import React from 'react'
import { Colors } from '../constants/Colors'

//login page
const index = () => {
    const [email, onEmailChange] = React.useState("");
    const [password, onPasswordChange] = React.useState("");
    const [newPassword, onNewPasswordChange] = React.useState("");
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    //modal
    const [modalVisible, setModalVisible] = useState(false)
    const openFogotPassWordModal =() => {
        setModalVisible(true);
    }

    const closeForgotPasswordModal = () => {
        setModalVisible(false);
    }

    return (
        //main view
        <ThemedView style={[styles.container, {backgroundColor: theme.background}]}>

            <ThemedView style={styles.mainView}>
                {/* foodxp heading*/}
                <ThemedText style={styles.heading}>FoodXP</ThemedText>

                <ThemedText style={styles.wHeading} >Welcome Back!</ThemedText>
                <ThemedText >Sign in to access your dashboard!</ThemedText>

                <View style={styles.inputView}>
                    <ThemedText style={[{ marginBottom: 0, alignSelf: "flex-start" }]}>Email</ThemedText>
                    <ThemedTextInput style={styles.input} value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />

                    <View style={styles.password}>
                        <ThemedText style={[{ marginBottom: 0 }]}>Password</ThemedText>
                        <ThemedTextInput style={styles.input} secureTextEntry={true} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />

                    </View>

                    <TouchableOpacity onPress={openFogotPassWordModal} style = {{ width: "100%", alignSelf: 'flex-end'}}>
                        <ThemedText style={[styles.forgotPassword, {color: "#e4450bff", backgroundColor: "transparent"}]}>Forgot Password?</ThemedText>
                    </TouchableOpacity>

                </View>

                <ThemedView style={styles.links}>
                    

                    <ThemedLink href="/dashboard" style={{ margin: 0 }}>
                        <ThemedButton style={styles.button}>
                            <ThemedText>Sign In</ThemedText>
                        </ThemedButton>
                    </ThemedLink>

                    <ThemedLink href="/register" style={styles.registerLink}>
                        <ThemedText>No Account? SignUp</ThemedText>
                    </ThemedLink>

                </ThemedView>

                <Modal
                    transparent = {true}
                    animationType='slide'
                    visible={modalVisible}
                    onRequestClose={closeForgotPasswordModal}
                >
                    <ThemedView style = {styles.modalOverlay}>
                         <ThemedView style = {[styles.modalContent,  {backgroundColor: theme.background}]}>
                            <ThemedText>
                                Password Change
                            </ThemedText>

                            <ThemedTextInput style={styles.input} value={password} onChangeText={onPasswordChange} placeholder="Enter your Old Password" />
                            <ThemedTextInput style={styles.input} value={newPassword} onChangeText={onNewPasswordChange} placeholder="Enter your New Password" />

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
    },
    mainView: {
        width: "100%",
        maxWidth: 450,
        flex: Platform.OS === "android" ? 0.6 : 0.9,
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
        marginBottom: 10
    },
    subText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20
    },
    forgotPassword: {
        fontSize: 12,
        marginBottom: Platform.OS ==='android' ? 5 : 30,
        alignSelf: 'flex-end'
    },
    inputView: {
        marginTop: 20,
        marginBottom: Platform.OS === "android" ? 0 : 20,
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
        alignItems: "stretch", // stretch children to full width
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
    modalOverlay:{
        flex: 1,
        backgroundColor: "rgba(30, 38, 49, 0.6)", // dim background
        justifyContent: "center", // center vertically
        alignItems: "center", 
    },
    modalContent: {
        padding: 20,
        borderRadius: 15,
        width: "80%",     // responsive width
        maxWidth: 400,    // optional limit for large screens
        alignItems: "center",
        flex: 0.6
    },

})