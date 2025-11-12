import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Toast } from 'toastify-react-native';
import axios from 'axios';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import ThemedButton from '../../../components/ThemedButton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';
import { Colors } from '../../../constants/Colors';

const Settings = () => {
  const [foodie, setFoodie] = useState(null);
  const [password, onPasswordChange] = useState('');
  const [name, onNameChange] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [phone, onPhoneChange] = useState('');
  const [borderColor, setBorderColor] = useState(theme.borderColor);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ]);

  // 🔁 Fetch user details
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return router.replace('/');
      setUserToken(token);

      const res = await axios.get(`${API_BASE_URL}/session`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status === 'ok') {
        setFoodie(res.data.data);
      } else {
        Toast.show({ type: 'error', text1: 'Session expired' });
        router.replace('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // 🔁 Fetch when screen gains focus or refresh flag changes
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  // --- Change Handlers ---
  async function nameChange() {
    try {
      const foodieData = { email: foodie?.email, name };
      const res = await axios.post(`${API_BASE_URL}/namechange`, foodieData, { withCredentials: true });
      Toast.show({
        type: res.data.status === 'ok' ? 'success' : 'error',
        text1: res.data.data,
      });
      if (res.data.status === 'ok') await fetchUserData();
      closeModal();
    } catch {
      Toast.show({
        type: 'error',
        text1: `There was a problem changing ${selectedOption}`,
      });
    }
  }

  async function passwordChange() {
    try {
      const foodieData = { email: foodie?.email, password };
      const res = await axios.post(`${API_BASE_URL}/passwordchange`, foodieData, { withCredentials: true });
      Toast.show({
        type: res.data.status === 'ok' ? 'success' : 'error',
        text1: res.data.data,
      });
      if (res.data.status === 'ok') await fetchUserData();
      closeModal();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'There was an error while saving changes',
      });
    }
  }

  async function deleteAccount() {
    if (value === 'no') return closeModal();

    try {
      const foodieData = { email: foodie?.email };
      const res = await axios.post(`${API_BASE_URL}/deleteaccount`, foodieData, { withCredentials: true });
      Toast.show({
        type: res.data.status === 'ok' ? 'success' : 'error',
        text1: res.data.data,
      });
      if (res.data.status === 'ok') router.replace('/');
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'There was an error deleting your account',
      });
    }
  }

  async function changePhone() {
    if (phone.trim() === '') {
      setBorderColor(Colors.error);
      return;
    }

    try {
      const foodieData = { email: foodie?.email, phone };
      const res = await axios.post(`${API_BASE_URL}/changePhone`, foodieData, { withCredentials: true });
      Toast.show({
        type: res.data.status === 'ok' ? 'success' : 'error',
        text1: res.data.data,
      });
      if (res.data.status === 'ok') {
        setBorderColor(theme.borderColor);
        onPhoneChange('');
        await fetchUserData();
      }
      closeModal();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'There was an error while saving changes',
      });
    }
  }

  async function handleLogout() {
    try {
      const res = await axios.post(`${API_BASE_URL}/logout`, {}, { withCredentials: true });
      if (res.data.status === 'ok') {
        Toast.show({ type: 'success', text1: res.data.data });
        await AsyncStorage.removeItem('userToken');
        router.replace('/');
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Something went wrong while logging out',
      });
    }
  }

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
        <Ionicons name="person-circle-outline" size={100} color={theme.iconColor} />
        <ThemedText style={styles.heading}>Account Settings</ThemedText>

        <View style={[styles.infoCard, { backgroundColor: theme.navBackground }]}>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={20} color={theme.iconColor} />
            <ThemedText style={styles.infoText}>{foodie?.name || 'Loading name...'}</ThemedText>
          </View>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={theme.iconColor} />
            <ThemedText style={styles.infoText}>{foodie?.email || 'Loading email...'}</ThemedText>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="phone" size={20} color={theme.iconColor} />
            <ThemedText style={styles.infoText}>{foodie?.phone || 'Loading phone...'}</ThemedText>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.navBackground }]}>
          <ThemedText style={styles.sectionHeading}>Security</ThemedText>

          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.optionBackground }]}
            onPress={() => {
              openModal();
              setSelectedOption('Password');
            }}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.iconColor} />
            <ThemedText style={styles.optionText}>Change Password</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.optionBackground }]}
            onPress={() => {
              openModal();
              setSelectedOption('Phone');
            }}>
            <MaterialCommunityIcons name="phone" size={20} color={theme.iconColor} />
            <ThemedText style={styles.optionText}>Change Phone Number</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.optionBackground }]}
            onPress={() => {
              openModal();
              setSelectedOption('Name');
            }}>
            <Ionicons name="create-outline" size={20} color={theme.iconColor} />
            <ThemedText style={styles.optionText}>Change Name</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.optionBackground }]}
            onPress={() => {
              openModal();
              setSelectedOption('Delete');
            }}>
            <Ionicons name="trash-outline" size={20} color="#d9534f" />
            <ThemedText style={[styles.optionText, { color: '#d9534f' }]}>
              Delete Account
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: 'red' }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={'white'} />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.footerText}>FoodXP • Designed by Tshepo Mpofu</ThemedText>
      </ScrollView>

      {/* MODAL */}
      <Modal transparent animationType="slide" visible={modalVisible} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContainer, { backgroundColor: theme.navBackground }]}>
            <ThemedText style={styles.modalTitle}>Change {selectedOption}</ThemedText>

            {selectedOption !== 'Delete' && (
              <ThemedTextInput
                placeholder={`New ${selectedOption}`}
                value={selectedOption === 'Name' ? name : selectedOption === 'Phone' ? phone : password}
                onChangeText={
                  selectedOption === 'Name'
                    ? onNameChange
                    : selectedOption === 'Phone'
                      ? onPhoneChange
                      : onPasswordChange
                }
                style={{ borderColor: borderColor }}
              />
            )}

            {selectedOption === 'Delete' && (
              <>
                <ThemedText style={{ marginBottom: 10 }}>
                  Are you sure you want to delete your account?
                </ThemedText>
                <DropDownPicker
                  open={open}
                  value={value}
                  items={items}
                  setOpen={setOpen}
                  setValue={setValue}
                  setItems={setItems}
                  placeholder="Select an option"
                  style={styles.dropDown}
                />
              </>
            )}

            <ThemedButton
              onPress={async () =>
                selectedOption === 'Name'
                  ? await nameChange()
                  : selectedOption === 'Password'
                    ? await passwordChange()
                    : selectedOption === 'Phone'
                      ? await changePhone()
                      : await deleteAccount()
              }>
              <ThemedText>Confirm {selectedOption}</ThemedText>
            </ThemedButton>

            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Ionicons name="close-circle-outline" size={35} color="#d9534f" />
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  infoCard: {
    width: '95%',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
  },
  section: {
    width: '95%',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  logoutText: {
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#ddd',
  },
  footerText: {
    marginTop: 25,
    fontSize: 13,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  dropDown: {
    width: 200,
    alignSelf: 'center',
    marginVertical: 10,
  },
  closeBtn: {
    marginTop: 15,
  },
});
