import {
  ScrollView,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  useColorScheme
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import ThemedButton from '../../../components/ThemedButton';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Toast } from "toastify-react-native";
import { API_BASE_URL } from "@env";
import { LinearGradient } from 'expo-linear-gradient';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { Colors } from '../../../constants/Colors';
import { useFocusEffect } from "@react-navigation/native";
import Checkbox from '../../../components/Checkbox';
import TimePicker from '../../../components/TimePicker';

const Fridge = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fridgeFood, setFridgeFood] = useState([]);
  const [userToken, setUserToken] = useState(null);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [pickup_id, setPickupID] = useState(null);
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  const baseUrl = API_BASE_URL;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usePreviousLocation, setUsePreviousLocation] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteAmount, setDeleteAmount] = useState(1);
  const [showDonationDetailsModal, setShowDonationDetailsModal] = useState(false);
  const [street, setStreet] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [pickupTime, setPickupTime] = useState(null);

  // Fetch fridge food function
  const fetchFridgeFood = async (token) => {
    try {
      const result = await axios.get(`${API_BASE_URL}/getfridgefood`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      setFridgeFood(result.data.data || []);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to fetch fridge food", useModal: false });
    }
  };

  // Initialize token and fetch
  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");
        setUserToken(token);
        fetchFridgeFood(token);
      } catch (err) {
        console.error(err);
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false });
      }
    }
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      async function handleFocus() {
        try {
          const shouldRefresh = await AsyncStorage.getItem('refreshFridge');
          if ((shouldRefresh === 'true' || shouldRefresh === null) && userToken) {
            await fetchFridgeFood(userToken);
            await AsyncStorage.setItem('refreshFridge', 'false');
          }
        } catch (err) {
          console.error('Error handling focus:', err);
        }
      }
      handleFocus();
      return () => { isActive = false; };
    }, [userToken])
  );

  // Delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      const result = await axios.post(`${API_BASE_URL}/deletefridgefood`, {
        id: deletingItem.id,
        deleteAmount,
        amount: deletingItem.amount,
        public_id: deletingItem.public_id
      }, { headers: { Authorization: `Bearer ${userToken}` } });

      if (result.data.status === "ok") {
        Toast.show({ type: "success", text1: "Item updated successfully", useModal: false });
        await AsyncStorage.setItem("refreshRecipes", "true");
        await AsyncStorage.setItem("refreshFridge", "true");
        setShowDeleteModal(false);
        fetchFridgeFood(userToken);
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Delete failed", useModal: false });
    }
  };

  // Edit confirmation
  const handleEditConfirm = async () => {
    if (!editingItem) return;
    const newFood = { name: editName.trim(), amount: parseInt(editAmount.trim()), id: editingItem.id };

    try {
      const res = await axios.post(`${API_BASE_URL}/editFridgeFood`, { newFood }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (res.data.status === "ok") {
        Toast.show({ type: "success", text1: res.data.data, useModal: false });
        await AsyncStorage.setItem("refreshFridge", "true");
        setShowEditModal(false);
        fetchFridgeFood(userToken);
      } else {
        Toast.show({ type: "error", text1: res.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Edit failed", useModal: false });
    }
  };

  const handleUsePreviousLocation = async () => {
    setUsePreviousLocation(prev => !prev);
    if (!usePreviousLocation) {
      try {
        const res = await axios.get(`${API_BASE_URL}/getLatestLocation`, { headers: { Authorization: `Bearer ${userToken}` } });
        if (res.data.status === "ok" && res.data.data) {
          const loc = res.data.data;
          setStreet(loc.street || "");
          setCity(loc.city || "");
          setProvince(loc.province || "");
          setPostalCode(loc.zipcode || "");
          setPickupID(loc.id || null);
          setCountry(loc.country || null)
        } else {
          Toast.show({ type: "error", text1: "No previous location found", useModal: false });
          setPickupID(null);
        }
      } catch (err) {
        console.log(err);
        Toast.show({ type: "error", text1: "Failed to load previous location", useModal: false });
        setPickupID(null);
      }
    } else {
      setPickupID(null);
      setStreet('');
      setCity('');
      setProvince('');
      setPostalCode('');
      setCountry('South Africa')
    }
  };

  const handleDonateConfirm = async () => {
    if (selectedItems.length === 0) {
      Toast.show({ type: "info", text1: "No items selected", useModal: false });
      return;
    }
    try {
      const donationData = selectedItems.map(({ id, name, donateQty, photo, foodie_id, actualQuantity, from }) => ({
        id, name, amount: donateQty, photo, foodie_id, actualQuantity, from
      }));

      const result = await axios.post(`${API_BASE_URL}/donate`, {
        items: donationData,
        street, province, postalCode, city, pickup_id, country, pickupTime
      }, { headers: { Authorization: `Bearer ${userToken}` } });

      if (result.data.status === "ok") {
        Toast.show({ type: "success", text1: "Donation recorded successfully!", useModal: false });
        await AsyncStorage.setItem("refreshFridge", "true");
        setSelectedItems([]);
        setStreet('');
        setPostalCode('');
        setProvince('');
        setCity('');
        setUsePreviousLocation(false);
        setPickupID(null);
        setCountry("South Africa");
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Donation failed", useModal: false });
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount.toString());
    setShowEditModal(true);
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setDeleteAmount(1);
    setShowDeleteModal(true);
  };

  const toggleSelectItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, { ...item, donateQty: 1, actualQuantity: item.amount, from: "fridge" }];
    });
  };

  const adjustAmount = (id, delta, maxQty) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, donateQty: Math.min(Math.max(1, item.donateQty + delta), maxQty) }
          : item
      )
    );
  };

  // Split items into rows
  const rows = [];
  for (let i = 0; i < fridgeFood.length; i += itemsPerRow) {
    rows.push(fridgeFood.slice(i, i + itemsPerRow));
  }

  return (
    <View style={styles.container}>
      <ImageBackground style={styles.imgBackground} source={require("../../../assets/foodxp/fridge bg.jpg")}>
        <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />

        {rows.length > 0 ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                  {row.map(item => (
                    <TouchableOpacity key={item.id} onPress={() => openEditModal(item)}>
                      <View style={[styles.foodItem, { backgroundColor: theme.cardColor }]}>
                        <Image source={{ uri: item.photo }} style={styles.img} />
                        <ThemedText>{item.name}</ThemedText>
                        <ThemedText>{item.amount} {item.unitofmeasure}</ThemedText>
                        <View style={styles.buttonRow}>
                          <ThemedButton style={[styles.btn, { backgroundColor: "#f28b82" }]} onPress={() => openDeleteModal(item)}>
                            <ThemedText>Eaten</ThemedText>
                          </ThemedButton>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={{ justifyContent: "center", alignItems: "center", height: 50, marginBottom: 20 }}>
              <ThemedButton style={[styles.btn, { backgroundColor: "#81c995" }]} onPress={() => setShowDonateModal(true)}>
                <ThemedText>Donate Food</ThemedText>
              </ThemedButton>
            </View>
          </View>
        ) : (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.heading}>No food added yet</ThemedText>
          </ThemedView>
        )}

        {/* Donation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDonateModal}
          onRequestClose={() => setShowDonateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText style={styles.modalTitle}>Select Food to Donate</ThemedText>

              <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
                {fridgeFood.map(item => {
                  const selected = selectedItems.find(i => i.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modalItem, selected && { backgroundColor: theme.selected, borderColor: "#34a853" }]}
                      onPress={() => toggleSelectItem(item)}
                    >
                      <Image source={{ uri: item.photo }} style={styles.modalImg} />
                      <View style={{ flex: 1 }}>
                        <ThemedText>{item.name}</ThemedText>
                        <ThemedText>Available: {item.amount}</ThemedText>
                      </View>

                      {selected && (
                        <View style={styles.qtyControl}>
                          <TouchableOpacity onPress={() => adjustAmount(item.id, -1, item.amount)}>
                            <ThemedText style={styles.qtyBtn}>−</ThemedText>
                          </TouchableOpacity>
                          <ThemedText style={styles.qtyValue}>{selected.donateQty}</ThemedText>
                          <TouchableOpacity onPress={() => adjustAmount(item.id, 1, item.amount)}>
                            <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.btn, { backgroundColor: "#81c995" }]}
                  onPress={() => {
                    if (selectedItems.length === 0) {
                      Toast.show({ type: "info", text1: "Please select at least one item", useModal: false });
                      return;
                    }
                    setShowDonateModal(false);
                    setShowDonationDetailsModal(true);
                  }}
                >
                  <ThemedText>Next</ThemedText>
                </ThemedButton>

              </View>
            </View>
          </View>
        </Modal>

        {/* Modal code for editing */}
        <Modal
          animationType='fade'
          transparent={true}
          visible={showEditModal}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText style={styles.modalTitle}>Edit Food</ThemedText>

              {editingItem && (
                <>
                  <ScrollView contentContainerStyle={{ alignItems: "center" }}>
                    <ThemedText>Name</ThemedText>
                    <ThemedTextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Food Name"
                    />

                    <ThemedText style={{ marginTop: 10 }}>Amount</ThemedText>

                    {/* Amount + / - Controls */}
                    <View style={[styles.qtyControl, { marginTop: 10, alignSelf: "center" }]}>
                      <TouchableOpacity
                        onPress={() =>
                          setEditAmount(prev => {
                            const value = parseInt(prev || "0");
                            return Math.max(1, value - 1).toString();
                          })
                        }
                      >
                        <ThemedText style={styles.qtyBtn}>−</ThemedText>
                      </TouchableOpacity>

                      <ThemedText style={styles.qtyValue}>{editAmount}</ThemedText>

                      <TouchableOpacity
                        onPress={() =>
                          setEditAmount(prev => {
                            const value = parseInt(prev || "0");
                            return (value + 1).toString();
                          })
                        }
                      >
                        <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.btn, { backgroundColor: "#81c995" }]}
                  onPress={handleEditConfirm}
                >
                  <ThemedText>Save Changes</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.btn, { backgroundColor: theme.cardColor }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal code for deleting */}
        <Modal
          animationType='fade'
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText style={styles.modalTitle}>Remove Some Food</ThemedText>

              {deletingItem && (
                <>
                  <ThemedText style={{ textAlign: "center", marginBottom: 10 }}>
                    {deletingItem.name}
                  </ThemedText>

                  <ThemedText style={{ textAlign: "center" }}>Select amount to remove</ThemedText>

                  <View style={[styles.qtyControl, { marginTop: 10, alignSelf: "center" }]}>
                    <TouchableOpacity onPress={() => setDeleteAmount(q => Math.max(1, q - 1))}>
                      <ThemedText style={styles.qtyBtn}>−</ThemedText>
                    </TouchableOpacity>
                    <ThemedText style={styles.qtyValue}>{deleteAmount}</ThemedText>
                    <TouchableOpacity onPress={() => setDeleteAmount(q => Math.min(deletingItem.amount, q + 1))}>
                      <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.btn, { backgroundColor: "#f28b82" }]}
                  onPress={handleDeleteConfirm}
                >
                  <ThemedText>Confirm</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.btn, { backgroundColor: theme.cardColor }]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </Modal>

        {/*donation details modal*/}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDonationDetailsModal}
          onRequestClose={() => setShowDonationDetailsModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>

              <ThemedText style={styles.modalTitle}>Pickup Location Details</ThemedText>
              {useCurrentLocation === false && (
                <ScrollView contentContainerStyle={{ paddingVertical: 10, width: "100%" }}>
                  <ThemedText>Street Address</ThemedText>
                  <ThemedTextInput
                    placeholder="Enter street address"
                    value={street}
                    onChangeText={setStreet}
                    style={styles.input}
                  />

                  <ThemedText style={{ marginTop: 10 }}>City</ThemedText>
                  <ThemedTextInput
                    placeholder="Enter city"
                    value={city}
                    onChangeText={setCity}
                    style={styles.input}
                  />

                  <ThemedText style={{ marginTop: 10 }}>Province</ThemedText>
                  <ThemedTextInput
                    placeholder="Enter province"
                    value={province}
                    onChangeText={setProvince}
                    style={styles.input}
                  />

                  <ThemedText style={{ marginTop: 10 }}>Country</ThemedText>
                  <ThemedTextInput
                    placeholder="Enter country"
                    value={country}
                    onChangeText={setCountry}
                    style={styles.input}
                  />

                  <ThemedText style={{ marginTop: 10 }}>Postal Code</ThemedText>

                  <ThemedTextInput
                    placeholder="Enter postal code"
                    keyboardType="numeric"
                    value={postalCode}
                    onChangeText={setPostalCode}
                    style={styles.input}
                  />
                </ScrollView>
              )}
              <Checkbox
                checked={usePreviousLocation}
                onPress={handleUsePreviousLocation}
              />
              <ThemedText style={{ marginTop: 10, textAlign: "center" }}>Pickup Time</ThemedText>

              <TimePicker
                value={pickupTime}
                onChange={(time) => setPickupTime(time)}
              />
              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.btn, { backgroundColor: "#81c995" }]}
                  onPress={async () => {
                    if (!street || !province || !postalCode || !city) {
                      Toast.show({ type: "info", text1: "Please fill in all details", useModal: false });
                      return;
                    }
                    await handleDonateConfirm(); // calls backend
                    setShowDonationDetailsModal(false);
                    setStreet('')
                    setPostalCode('');
                    setCity('')
                    setProvince('');
                  }}
                >
                  <ThemedText>Submit Donation</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.btn, { backgroundColor: theme.cardColor }]}
                  onPress={() => {
                    setShowDonationDetailsModal(false);
                    setShowDonateModal(true);
                  }}
                >
                  <ThemedText>Back</ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
};

export default Fridge;

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  imgBackground: { width: "100%", height: "100%", ...StyleSheet.absoluteFillObject },
  scrollContainer: { flexGrow: 1, padding: 10, alignItems: "center" },
  row: { flexDirection: 'row', marginBottom: 10 },
  foodItem: {
    width: 140, marginRight: 15, padding: 10, borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 3, height: 4 },
    shadowRadius: 4, elevation: 4,
  },
  img: { width: 100, height: 100, borderRadius: 6, marginBottom: 4 },
  btn: { flex: 1, margin: 3, paddingVertical: 8, borderRadius: 8, alignItems: "center", height: 50, zIndex: 1 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
  heading: { alignSelf: "center", fontSize: 25 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { width: "90%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 16, padding: 15 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  modalItem: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  modalImg: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  qtyControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#aaa", borderRadius: 6, paddingHorizontal: 6 },
  qtyBtn: { fontSize: 20, fontWeight: "bold", color: "#34a853", paddingHorizontal: 6 },
  qtyValue: { fontSize: 16, fontWeight: "bold", marginHorizontal: 4 },
  input: { width: "100%", margin: 1 }
});
