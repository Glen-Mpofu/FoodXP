import { StyleSheet, Text } from 'react-native'
import * as React from 'react'
import { Camera, CameraPermissionStatus } from 'react-native-vision-camera'
import * as ExpoMediaLibrary from "expo-media-library"
import ThemedView from '../components/ThemedView'

const PermissionsScreen = () => {
    const [CameraPermissionStatus, setCameraPermissionStatus] = 
        React.useActionState<CameraPermissionStatus>("not-determined");

    const [mediaLibraryPermissions, requestMediaLibraryPermissions] = ExpoMediaLibrary.usePermissions();

  return (
    <ThemedView>
      <Text>FoodXP needs access to a few permissions in order to work properly</Text>
    </ThemedView>
  )
}

export default PermissionsScreen

const styles = StyleSheet.create({})