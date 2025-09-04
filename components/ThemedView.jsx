import { StyleSheet, Text, View } from 'react-native'

const ThemedView = ({ style, ...props }) => {
    return (
        <View style={[styles.container, style]} {...props} />
    )
}

export default ThemedView

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        alignItems: "center"
    }
})