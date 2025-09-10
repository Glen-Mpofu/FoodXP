// app/dashboard.js
import { StyleSheet } from 'react-native';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';

export default function Dashboard() {
  return (
    <ThemedView style={styles.container}>
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
