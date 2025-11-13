import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Application from 'expo-application';

const applicationId = Application.applicationId || "com.glenmpofu.FoodXP";
export async function registerForPushNotificationsAsync() {
    let token;

    if (!Device.isDevice && Platform.OS !== 'web') {
        alert('Must use a physical device for Push Notifications');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
    }

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
            applicationId: Platform.OS === 'android' ? applicationId : undefined,
        })).data;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
            });
        }
    } else if (Platform.OS === 'web') {
        // Web push registration handled separately
        console.log('Push notifications on web require service worker registration.');
    }

    console.log('📱 Expo Push Token:', token);
    return token;
}

