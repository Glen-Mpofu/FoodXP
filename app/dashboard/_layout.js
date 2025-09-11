import { Drawer } from "expo-router/drawer";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function DashboardLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light
  
  return (
    <Drawer
      screenOptions={{
        headerTitleAlign: "center",
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: "bold",
        },
        drawerActiveBackgroundColor: Colors.drawerActive,
        drawerActiveTintColor: theme.uiBackground,
        headerStyle: {
          backgroundColor: theme.navBackground,
          
        },
        drawerStyle: {
          backgroundColor: theme.uiBackground,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push("/dashboard/camerascreen")}
            style={{ marginRight: 15 }}
          >
            <Ionicons
              name="camera-outline"
              size={30}
              accessibilityLabel="Add Fruit"
              color={theme.camera}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ drawerLabel: "Home", title: "Dashboard" }}
      />
      <Drawer.Screen
        name="recipes"
        options={{ drawerLabel: "Recipes", title: "Recipes" }}
      />
      <Drawer.Screen
        name="pantry"
        options={{ drawerLabel: "Pantry", title: "My Pantry" }}
      />
      <Drawer.Screen
        name="fridge"
        options={{ drawerLabel: "Fridge", title: "My Fridge" }}
      />
      <Drawer.Screen
        name="camerascreen"
        options={{
          drawerLabel: "Camera",
          title: "Capture Food",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
