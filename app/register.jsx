import { StyleSheet, useColorScheme, TouchableOpacity, View } from 'react-native'

//themedui
import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedTextInput from '../components/ThemedTextInput'
import ThemedLink from '../components/ThemedLink'
import ThemedButton from '../components/ThemedButton'

import React from 'react'
import { Colors } from '../constants/Colors'

//login page
const Register = () => {
    const [email, onEmailChange] = React.useState("");
    const [password, onPasswordChange] = React.useState("");
    const [userName, onNameChange] = React.useActionState("");

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <ThemedView style = { styles.container }>
            <View style = {{width: "70%"}}>
                <ThemedText style = {styles.heading}>FoodXP</ThemedText>
            </View>

            <ThemedView style = {styles.mainView}>
                <ThemedText style={styles.wHeading} >Sign Up</ThemedText>
                <ThemedText >Sign up to access your Everything FoodXP!</ThemedText>

                    <View style = {styles.cView}>
                        <ThemedText style={[{marginBottom: 0, alignSelf: "flex-start"} ]}>Email</ThemedText>
                    </View>
                    <ThemedTextInput value={email} onChangeText={onEmailChange} placeholder="Enter your Email" />
                    
                    <View style = {styles.cView}>
                        <ThemedText style={[{marginBottom: 0, alignSelf: "flex-start"} ]}>Name</ThemedText>
                    </View>
                    <ThemedTextInput value={userName} onChangeText={onNameChange} placeholder="Enter your Name" />

                    <View style = {styles.cView}>
                        <ThemedText style={[{marginBottom: 0} ]}>Password</ThemedText>
                    </View>

                    <ThemedTextInput secureTextEntry={true} value={password} onChangeText={onPasswordChange} placeholder="Enter your Password" />

                <ThemedLink href="/">
                    <ThemedButton>
                        <ThemedText>Sign Up</ThemedText>
                    </ThemedButton>
                </ThemedLink>

                <ThemedLink href="/" style={{ margin: 0 }}>
                    <ThemedText>Already Have an Account? Sign In</ThemedText>
                </ThemedLink>
            </ThemedView>  
        </ThemedView>
    )
}

export default Register

const styles = StyleSheet.create({    
    container: {
        justifyContent: 'center',
    },
    mainView:{
        width: "70%",
        elevation: 50, 
        borderRadius: 5,
        justifyContent: 'center',
        //boxShadow: "10px 10px 0px rgba(123, 48, 236, 0.5)"
    },
    wHeading: {
        fontSize: 40,
        fontWeight: 'bold'
    },
    heading: {
        fontSize: 45,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
    },
    forgotPassword:{
        alignSelf: 'flex-end',
        marginBottom: 0, fontSize: 10
    }, 
    cView: {
        height: 10, width: 250, marginTop: 20, marginBottom: 5, marginLeft: 10
    }
})