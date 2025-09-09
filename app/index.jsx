import { StyleSheet, useColorScheme, TouchableOpacity, View, Platform } from 'react-native'

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
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        //main view
        <ThemedView style={styles.container}>

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

                </View>

                <ThemedView style={styles.links}>
                    <ThemedText style={styles.forgotPassword}>Forgot Password?</ThemedText>
                    <ThemedLink href="/dashboard" style={{ margin: 0 }}>
                        <ThemedButton style={styles.button}>
                            <ThemedText>Sign In</ThemedText>
                        </ThemedButton>
                    </ThemedLink>

                    <ThemedLink href="/register" style={styles.registerLink}>
                        <ThemedText>No Account? SignUp</ThemedText>
                    </ThemedLink>

                </ThemedView>
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
        flex: 0.7,
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
        color: '#FF7F50',
        alignSelf: 'flex-end',
        marginTop: Platform.OS === "android" ? 0 : 70,
        marginBottom: 15,
        marginRight: Platform.OS === "android" ? 0 : 50
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
        width: "100%",
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
        marginBottom: 10
    }

})