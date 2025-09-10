import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useFonts } from "expo-font"

const FoodXPLayout = () => {
    const [loaded] = useFonts({
        Raleway: require("../assets/fonts/Raleway-VariableFont_wght.ttf")
    });

    if (!loaded) {
        return null;
    }

    return (
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
            <Stack.Screen name={"index"} options={{title: "Login", headerShown: false }}/>
            <Stack.Screen name={"register"} options={{title: "Register", headerShown: false }}/>
            <Stack.Screen name={"dashboard"} options={{title: "Home", headerShown: true }}/>
        </Stack>
    )
}

export default FoodXPLayout

const styles = StyleSheet.create({})