import { Drawer } from "expo-router/drawer";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function DashboardLayout() {
  const router = useRouter();

  return (
    <Drawer
      screenOptions={{
        headerTitleAlign: "center",
        headerTintColor: "#8d9ba5ff",
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: "bold",
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
              color="#8d9ba5ff"
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
