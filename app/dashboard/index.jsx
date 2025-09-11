// app/dashboard.js
import { StyleSheet } from 'react-native';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function Dashboard() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <ThemedView style={[styles.container, {backgroundColor: theme.uiBackground} ]}>
      <ThemedText>Your Dashboard</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: ""
  },
});
