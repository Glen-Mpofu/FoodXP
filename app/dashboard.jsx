import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';

import ThemedView from '../components/ThemedView';
import ThemedText from '../components/ThemedText';
import ThemedCard from '../components/ThemedCard';
import { useCameraPermission } from 'react-native-vision-camera';
import { Redirect, useRouter } from 'expo-router';

const Dashboard = () => {
    const {hasPermission} = useCameraPermission();
    const redirectToPermissions = !hasPermission

    const device = useCameraDevice("front")
    const router = useRouter();

    <ThemedView>
        <ThemedText>Camera</ThemedText>
    </ThemedView>

    if(redirectToPermissions) return <Redirect href={"/permissions"} />;
    if(!device) return <></>
};

export default Dashboard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
});
