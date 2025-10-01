import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import axios from "axios"

export default function CustomDrawerContent(props) {
    const router = useRouter();

    async function handleLogout() {
        // Clear auth/session here
        // redirect to login screen

        await axios.post("http://192.168.101.219:5001/logout", {}, { withCredentials: true }).
            then((res) => {
                if (res.data.status === "ok") {
                    if (Platform.OS === "android" || Platform.OS === "ios") {
                        Alert.alert("Logged Out", res.data.data, [{ text: "Logging Out", onPress: () => router.replace("/") }]);
                    }
                    else {
                        alert(res.data.data);
                        router.replace("/");
                    }
                }
            }).catch((e) => {
                console.log(e)
                alert("Something went Wrong")
            })


    }

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ flex: 1, justifyContent: 'space-between' }}
        >
            <View>
                <DrawerItemList {...props} />
            </View>

            <View style={{ marginBottom: 20 }}>
                <DrawerItem
                    label="Logout"
                    onPress={() => {
                        handleLogout();
                    }}
                    labelStyle={{ color: 'red', fontWeight: 'bold' }}
                />
            </View>
        </DrawerContentScrollView>
    );
}
