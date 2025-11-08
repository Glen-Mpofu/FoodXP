import { TouchableOpacity, useColorScheme, View } from "react-native"
import ThemedText from "./ThemedText"
import { Colors } from "../constants/Colors";

const Checkbox = ({ checked, onPress }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme] ?? Colors.light;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 15
            }}
        >
            <View
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: theme.text,
                    backgroundColor: checked ? "#4caf50" : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 10
                }}
            >
                {checked && (
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>✓</ThemedText>
                )}
            </View>

            <ThemedText>Use previous location</ThemedText>
        </TouchableOpacity>
    )
}

export default Checkbox
