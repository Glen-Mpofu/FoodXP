import { Platform, PermissionsAndroid } from "react-native";
import Geolocation from "react-native-geolocation-service";

async function getUserLocation() {
    // Web
    if (Platform.OS === "web") {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    // Android: request permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => {
                console.warn('Geolocation error:', err);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, distanceFilter: 0 }
        );
    });
}

async function requestLocationPermission() {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "FoodXP Location Permission",
                    message: "FoodXP needs access to your location to provide better service",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK",
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }
    return true; // iOS permissions handled differently
}

export default getUserLocation;
