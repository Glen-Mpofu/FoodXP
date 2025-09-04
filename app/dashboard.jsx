import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';

import ThemedView from '../components/ThemedView';
import ThemedText from '../components/ThemedText';
import ThemedCard from '../components/ThemedCard';

import { CameraView, useCameraPermissions } from 'expo-camera';

const Dashboard = () => {
    const [facing, setFacing] = useState('back');

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText>Dashboard</ThemedText>

            <ThemedView>
                <ThemedCard>

                    <CameraView style={styles.camera} facing={facing} />

                    <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                        <Text style={styles.flipText}>Flip Camera</Text>
                    </TouchableOpacity>
                </ThemedCard>
            </ThemedView>
        </ThemedView>
    );
};

export default Dashboard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        textAlign: 'center',
        marginBottom: 10,
    },
    camera: {
        width: 300,
        height: 400,
        borderRadius: 10,
    },
    flipButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#333',
        borderRadius: 5,
    },
    flipText: {
        color: '#fff',
        textAlign: 'center',
    },
});
