import { StyleSheet, View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { useFonts } from "expo-font"

//toast
import ToastManager from "toastify-react-native"

const FoodXPLayout = () => {
    const [loaded] = useFonts({
        Raleway: require("../assets/fonts/Raleway-VariableFont_wght.ttf")
    });

    if (!loaded) {
        return null;
    }

    const toastConfig ={
        success: (props) => (
        <View style={{ backgroundColor: 'transparent', padding: 16, borderRadius: 10}}>
          <Text style={{ fontFamily: "Raleway", color: 'green', fontWeight: 'bold' }}>{props.text1}</Text>
          {props.text2 && <Text style={{ color: 'green' }}>{props.text2}</Text>}
        </View>        
      ),
      error: (props) => (
        <View style={{ backgroundColor: 'transparent', padding: 16, borderRadius: 10 }}>
          <Text style={{ fontFamily: "Raleway", color: '#af0606ff', fontWeight: 'bold' }}>{props.text1}</Text>
          {props.text2 && <Text style={{ color: '#af0606f' }}>{props.text2}</Text>}
        </View> 
      )
    }

    return (
        <>
            <Stack
                screenOptions={{
                    headerTitleAlign: "center",
                    headerTintColor: "#8d9ba5ff",
                    headerTitleStyle: {
                        fontSize: 40,
                        fontFamily: "Raleway"
                    },

                }}
            >
                <Stack.Screen name={"index"} options={{ title: "Login", headerShown: false }} />
                <Stack.Screen name={"register"} options={{ title: "Register", headerShown: false }} />
                <Stack.Screen name={"dashboard"} options={{ headerShown: false }} />
            </Stack>
            <ToastManager config={toastConfig} style={{position: "absolute", top: 50, width: "100%", zIndex: 999}} />
        </>
    )
}

export default FoodXPLayout

const styles = StyleSheet.create({})