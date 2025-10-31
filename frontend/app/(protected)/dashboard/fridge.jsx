import {
  ScrollView,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  TouchableOpacity,
  Modal
} from 'react-native';
import React, { useEffect, useState } from 'react';
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

const Fridge = () => {
  const [fridgeFood, setFridgeFood] = useState([]);
  const [userToken, setUserToken] = useState(null);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);
  const baseUrl = API_BASE_URL;
  const [showEditModal, setShowEditModal] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  // Fetch fridge food
  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");
        setUserToken(token);

        const result = await axios.get(`${baseUrl}/getfridgefood`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        });
        setFridgeFood(result.data.data || []);
      } catch (error) {
        console.error("Fridge fetch failed:", error);
        Toast.show({ type: "error", text1: "Failed to load fridge items", useModal: false });
      }
    }
    init();
  }, []);

  async function deleteEaten(id, photo) {
    try {
      const result = await axios.post(`${baseUrl}/deletefridgefood`, { id, photo }, { withCredentials: true });
      if (result.data.status === "ok") {
        setFridgeFood(prev => prev.filter(item => item.id !== id));
        Toast.show({ type: "success", text1: result.data.data, useModal: false });
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Could not delete item", useModal: false });
    }
  }

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setShowEditModal(true);
  };

  const toggleSelectItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, { ...item, donateQty: 1 }];
    });
  };

  const adjustQuantity = (id, delta, maxQty) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, donateQty: Math.min(Math.max(1, item.donateQty + delta), maxQty) }
          : item
      )
    );
  };

  const handleDonateConfirm = async () => {
    if (selectedItems.length === 0) {
      Toast.show({ type: "info", text1: "No items selected", useModal: false });
      return;
    }
    try {
      const donationData = selectedItems.map(({ id, name, donateQty }) => ({
        id, name, quantity: donateQty
      }));

      const result = await axios.post(
        `${baseUrl}/donate`,
        { items: donationData },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      if (result.data.status === "ok") {
        Toast.show({ type: "success", text1: "Donation recorded successfully!", useModal: false });
        setShowDonateModal(false);
        setSelectedItems([]);
        router.replace("/dashboard/donateHub");
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Donation failed", useModal: false });
    }
  };

  async function handleEditConfirm() {
    const newFood = {
      name: editName.trim(),
      quantity: parseInt(editQuantity.trim()),
      id: editingItem.id
    }

    axios.post(`${API_BASE_URL}/editFridgeFood`, { newFood }).
      then((res) => {
        if (res.data.status === "ok") {
          Toast.show({
            type: "success",
            text1: res.data.data,
            useModal: false
          });
        }
        else {
          Toast.show({
            type: "error",
            text1: res.data.data,
            useModal: false
          });
        }
      }).catch(err => {
        Toast.show({
          type: "error",
          text1: "Edit failed",
          useModal: false
        });
        console.error(err);
      })
  }

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
                    <TouchableOpacity onPress={() => {
                      openEditModal(item)
                    }}>
                      <View key={item.id} style={styles.foodItem}>
                        <Image source={{ uri: convertFilePathtoUri(item.photo) }} style={styles.img} />
                        <ThemedText>{item.name}</ThemedText>
                        <ThemedText>Qty: {item.quantity}</ThemedText>

                        <View style={{ flexDirection: "row" }}>
                          <ThemedButton style={[styles.btn, { backgroundColor: "#f28b82" }]} onPress={() => deleteEaten(item.id, item.photo)}>
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
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Select Food to Donate</ThemedText>

              <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
                {fridgeFood.map(item => {
                  const selected = selectedItems.find(i => i.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modalItem, selected && styles.selectedItem]}
                      onPress={() => toggleSelectItem(item)}
                    >
                      <Image source={{ uri: convertFilePathtoUri(item.photo) }} style={styles.modalImg} />
                      <View style={{ flex: 1 }}>
                        <ThemedText>{item.name}</ThemedText>
                        <ThemedText>Available: {item.quantity}</ThemedText>
                      </View>

                      {selected && (
                        <View style={styles.qtyControl}>
                          <TouchableOpacity onPress={() => adjustQuantity(item.id, -1, item.quantity)}>
                            <ThemedText style={styles.qtyBtn}>−</ThemedText>
                          </TouchableOpacity>
                          <ThemedText style={styles.qtyValue}>{selected.donateQty}</ThemedText>
                          <TouchableOpacity onPress={() => adjustQuantity(item.id, 1, item.quantity)}>
                            <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalButtons}>
                <ThemedButton style={[styles.btn, { backgroundColor: "#81c995" }]} onPress={handleDonateConfirm}>
                  <ThemedText>Confirm Donation</ThemedText>
                </ThemedButton>
                <ThemedButton style={[styles.btn, { backgroundColor: "#ccc" }]} onPress={() => setShowDonateModal(false)}>
                  <ThemedText>Cancel</ThemedText>
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
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Edit Food</ThemedText>

              <ScrollView contentContainerStyle={{ alignItems: "center" }}>
                <ThemedText>Name</ThemedText>
                <ThemedTextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Food Name"
                />

                <ThemedText>Quantity</ThemedText>
                <ThemedTextInput
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  placeholder="Food Quantity"
                  keyboardType="numeric"
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <ThemedButton style={[styles.btn, { backgroundColor: "#81c995" }]} onPress={() => { handleEditConfirm() }}>
                  <ThemedText>Save Changes</ThemedText>
                </ThemedButton>
                <ThemedButton style={[styles.btn, { backgroundColor: "#ccc" }]} onPress={() => setShowEditModal(false)}>
                  <ThemedText>Cancel</ThemedText>
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

function convertFilePathtoUri(filePath) {
  const fileName = filePath.split("\\").pop();
  return `${API_BASE_URL}/uploads/${fileName}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%", },
  imgBackground: { width: "100%", height: "100%", ...StyleSheet.absoluteFillObject },
  scrollContainer: { flexGrow: 1, padding: 10, alignItems: "center" },
  row: { flexDirection: 'row', marginBottom: 10 },
  foodItem: { width: 150, marginRight: 10, padding: 8, borderRadius: 6, backgroundColor: "#fff2", alignItems: "center", justifyContent: "center", marginTop: 50 },
  img: { width: 100, height: 100, borderRadius: 6, marginBottom: 4 },
  btn: { flex: 1, margin: 3, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
  heading: { alignSelf: "center", fontSize: 25 },

  // Modal styles
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { width: "90%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 16, padding: 15 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  modalItem: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 10, borderRadius: 10, backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#ddd" },
  selectedItem: { backgroundColor: "#e0f7e9", borderColor: "#34a853" },
  modalImg: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  qtyControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#aaa", borderRadius: 6, paddingHorizontal: 6 },
  qtyBtn: { fontSize: 20, fontWeight: "bold", color: "#34a853", paddingHorizontal: 6 },
  qtyValue: { fontSize: 16, fontWeight: "bold", marginHorizontal: 4 },
});
