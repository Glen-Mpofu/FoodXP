import { Drawer } from "expo-router/drawer";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from "@expo/vector-icons"
import LogoutDrawer from "../../components/LogoutDrawer"

export default function DashboardLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <Drawer
      drawerContent={(props) => <LogoutDrawer {...props} />}
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
        options={{ drawerLabel: "Home", title: "Dashboard", 
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color}/>
          )
         }}
      />
      <Drawer.Screen
        name="recipes"
        options={{ drawerLabel: "Recipes", title: "Recipes",
          drawerIcon: ({ color, size}) => (
            <MaterialCommunityIcons name = "chef-hat" size={size} color={color}/>
          )
         }}
      />
      <Drawer.Screen
        name="pantry"
        options={{ drawerLabel: "Pantry", title: "My Pantry",
          drawerIcon: ({ color, size}) => (
            <MaterialCommunityIcons name = "cupboard-outline" size={size} color={color}/>
          )
         }}
      />
      <Drawer.Screen
        name="fridge"
        options={{ drawerLabel: "Fridge", title: "My Fridge",
          drawerIcon: ({ color, size}) => (
            <MaterialCommunityIcons name = "fridge-outline" size={size} color={color}/>
          )
        }}
      />
      <Drawer.Screen
        name="camerascreen"
        options={{
          drawerLabel: "Camera",
          title: "Capture Food",
          drawerItemStyle: { display: "none" },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{ drawerLabel: "Settings", title: "Settings", 
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color}/>
          )
        }}
      />

    </Drawer >
  );
}
