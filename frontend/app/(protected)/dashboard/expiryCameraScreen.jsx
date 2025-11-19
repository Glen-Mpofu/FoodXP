import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ExpiryCameraScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);

    if (!permission) return <View />;
    if (!permission.granted)
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>We need camera access</Text>
                <Button title="Grant Permission" onPress={requestPermission} />
            </View>
        );

    const capture = async () => {
        const photo = await cameraRef.current.takePictureAsync({
            base64: true,
        });

        // Move back to the correct screen
        router.push({
            pathname: "/dashboard/camerascreen",
            params: {
                photoReturned: JSON.stringify(photo)
            }
        });
    };



    return (
        <View style={{ flex: 1 }}>
            <CameraView style={{ flex: 1 }} ref={cameraRef}>

                <View style={styles.overlayContainer}>
                    <View style={styles.squareBox} />
                </View>

                <View style={styles.bottomBar}>
                    <TouchableOpacity onPress={capture} style={styles.captureButton}>
                        <Ionicons name="camera" size={40} color="white" />
                    </TouchableOpacity>
                </View>

            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    squareBox: {
        width: 250,
        height: 250,
        borderWidth: 3,
        borderColor: "white",
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    bottomBar: {
        position: "absolute",
        bottom: 40,
        width: "100%",
        alignItems: "center",
    },
    captureButton: {
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 18,
        borderRadius: 50,
    },
});
