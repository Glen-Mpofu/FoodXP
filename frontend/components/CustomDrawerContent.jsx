import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function CustomDrawerContent(props) {
    const router = useRouter();

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
                        // Clear auth/session here
                        router.replace("/"); // redirect to login screen
                    }}
                    labelStyle={{ color: 'red', fontWeight: 'bold' }}
                />
            </View>
        </DrawerContentScrollView>
    );
}
