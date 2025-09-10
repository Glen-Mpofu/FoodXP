import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';

import ThemedView from '../components/ThemedView';
import ThemedText from '../components/ThemedText';
import ThemedCard from '../components/ThemedCard';


const dashboard = () => {

    return (
        <ThemedView style={styles.container}>
            <ThemedText>Your DashBoard</ThemedText>

            <ThemedView>
                <ThemedCard>

                </ThemedCard>
            </ThemedView>
        </ThemedView>
    );
};

export default dashboard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

});
