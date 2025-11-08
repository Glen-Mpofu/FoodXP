import { StyleSheet, View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { useFonts } from "expo-font"
import { Dimensions } from 'react-native'
import * as Font from "expo-font";

//toast
import ToastManager from "toastify-react-native"

const FoodXPLayout = () => {
  const { height, width } = Dimensions.get("window")
  const toastPlacement = height - 100
  const [loaded] = useFonts({
    Raleway: require("../assets/fonts/Raleway-VariableFont_wght.ttf"),
    AlanSans: require("../assets/fonts/AlanSans-VariableFont_wght.ttf")
  });

  if (!loaded) {
    return null;
  }

  const toastConfig = {
    success: (props) => (
      <View style={{ backgroundColor: 'transparent', padding: 16, borderRadius: 10, position: "absolute", top: toastPlacement }}>
        <Text style={{ fontFamily: "Raleway", color: 'green', fontWeight: 'bold' }}>{props.text1}</Text>
        {props.text2 && <Text style={{ color: 'green' }}>{props.text2}</Text>}
      </View>
    ),
    error: (props) => (
      <View style={{ backgroundColor: 'transparent', padding: 16, borderRadius: 10, position: "absolute", top: toastPlacement }}>
        <Text style={{ fontFamily: "Raleway", color: 'red', fontWeight: 'bold' }}>{props.text1}</Text>
        {props.text2 && <Text style={{ color: 'red' }}>{props.text2}</Text>}
      </View>
    ),
    info: (props) => (
      <View style={{ backgroundColor: 'transparent', padding: 16, borderRadius: 10, position: "absolute", top: toastPlacement }}>
        <Text style={{ fontFamily: "Raleway", color: 'blue', fontWeight: 'bold' }}>{props.text1}</Text>
        {props.text2 && <Text style={{ color: 'blue' }}>{props.text2}</Text>}
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
            fontFamily: "AlanSans"
          },

        }}
      >
        <Stack.Screen name={"index"} options={{ title: "Login", headerShown: false }} />
        <Stack.Screen name={"register"} options={{ title: "Register", headerShown: false }} />
        <Stack.Screen name={"(protected)"} options={{ headerShown: false }} />
      </Stack>
      <ToastManager config={toastConfig} style={{ position: "absolute", top: 50, width: "100%", zIndex: 999 }} />
    </>
  )
}

export default FoodXPLayout

const styles = StyleSheet.create({})