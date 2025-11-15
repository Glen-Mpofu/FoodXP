import { StyleSheet, View, Text } from 'react-native'
import { router, Stack } from 'expo-router'
import { useFonts } from "expo-font"
import { Dimensions } from 'react-native'
import * as Font from "expo-font";
import * as Notifications from 'expo-notifications';
//toast
import ToastManager, { Toast } from "toastify-react-native"
import { useEffect } from 'react';

const FoodXPLayout = () => {
  useEffect(() => {
    // Listener for foreground notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Optionally show a toast
      Toast.show({ type: 'success', text1: notification.request.content.title, text2: notification.request.content.body });
    });

    // Listener for when the user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Navigate the user somewhere if needed
      router.push('(protected)/dashboard/');
    });

    return () => {
      subscription.remove();
      responseListener.remove();
    };
  }, []);

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