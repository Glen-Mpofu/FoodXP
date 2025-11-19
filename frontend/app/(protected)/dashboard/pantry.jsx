import {
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  TouchableOpacity,
  useColorScheme
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Toast } from 'toastify-react-native';
import ThemedButton from '../../../components/ThemedButton';
import { API_BASE_URL } from "@env";
import { LinearGradient } from 'expo-linear-gradient';
import ThemedTextInput from '../../../components/ThemedTextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/Colors';
import { useFocusEffect } from "@react-navigation/native";
import Checkbox from '../../../components/Checkbox';
import TimePicker from '../../../components/TimePicker';

const Pantry = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [usePreviousLocation, setUsePreviousLocation] = useState(false)
  const router = useRouter();
  const [userToken, setUserToken] = useState(null);
  const [pantryFood, setPantryFood] = useState([]);
  const [country, setCountry] = useState('South Africa');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editExpiry, setEditExpiry] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = 150;
  const itemsPerRow = Math.floor(screenWidth / itemWidth);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteAmount, setDeleteAmount] = useState(1);
  const [showDonationDetailsModal, setShowDonationDetailsModal] = useState(false);
  const [street, setStreet] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');

  const [pickupTime, setPickupTime] = useState(null);
  const [date, setDate] = useState(new Date()); // ✅ Initialize with current date
  const [show, setShow] = useState(false);
  const [pickup_id, setPickupID] = useState(null)

  const [suggestedLocation, setSuggestedLocation] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null);
  // Fetch pantry food
  const fetchPantryFood = async (token) => {
    try {
      const result = await axios.get(`${API_BASE_URL}/getpantryfood`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      setPantryFood(result.data.data || []);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "Failed to fetch pantry food",
        useModal: false,
      });
    }
  };

  const fetchSuggestedLocations = async (token) => {
    try {
      const result = await axios.get(`${API_BASE_URL}/getSuggestedLocations`, { headers: { Authorization: `Bearer ${token}` } })
      setSuggestedLocation(result.data.data || [])
    } catch (error) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to fetch Suggested Locations", useModal: false });
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/");
          return;
        }
        setUserToken(token);
        fetchPantryFood(token);
        fetchSuggestedLocations(token);

      } catch (err) {
        console.error(err);
        Toast.show({
          type: "error",
          text1: "Something went wrong",
          useModal: false,
        });
      }
    }
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true; // optional guard to prevent updates after unmount

      const handleFocus = async () => {
        try {
          const shouldRefresh = await AsyncStorage.getItem("refreshPantry");

          // Always reload when screen gains focus for the first time
          if ((shouldRefresh === "true" || shouldRefresh === null) && userToken && isActive) {
            await fetchPantryFood(userToken); // refresh pantry list
            await AsyncStorage.setItem("refreshPantry", "false");
          }
        } catch (err) {
          console.error("Error handling pantry focus:", err);
        }
      };

      handleFocus();

      // ✅ Proper cleanup
      return () => {
        isActive = false;
      };
    }, [userToken])
  );

  const onChangeDate = (event, selectedDate) => {
    setShow(Platform.OS === 'ios')
    if (selectedDate) setDate(selectedDate)
  }

  const getStep = (unit) => {
    switch (unit?.toLowerCase()) {
      case "g":
      case "ml":
        return 10;
      case "kg":
      case "l":
        return 0.1;
      default:
        return 1; // default piece/unit
    }
  };

  const incrementEditAmount = () => {
    if (!editingItem) return;
    const step = getStep(editingItem.unitofmeasure);
    let current = parseFloat(editAmount) || 0;
    let newValue = current + step;

    const precision = (step.toString().split(".")[1] || "").length;
    setEditAmount(newValue.toFixed(precision));
  };

  const decrementEditAmount = () => {
    if (!editingItem) return;
    const step = getStep(editingItem.unitofmeasure);
    let current = parseFloat(editAmount) || 0;
    let newValue = current - step;
    if (newValue < 0) newValue = 0;

    const precision = (step.toString().split(".")[1] || "").length;
    setEditAmount(newValue.toFixed(precision));
  };

  // Manual input handler without max lock
  const handleEditAmountChange = (val) => {
    if (!editingItem) return;
    // Allow only digits and optional decimal
    if (/^\d*\.?\d*$/.test(val)) {
      setEditAmount(val);
    }
  };

  const onChangeExpiryDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) setEditExpiry(selectedDate)
  }

  const handleUsePreviousLocation = async () => {
    setUsePreviousLocation(prev => !prev); // toggle

    if (!usePreviousLocation) {
      // fetch previous location
      try {
        const res = await axios.get(`${API_BASE_URL}/getLatestLocation`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });

        if (res.data.status === "ok" && res.data.data) {
          const loc = res.data.data;
          setStreet(loc.street || "");
          setCity(loc.city || "");
          setProvince(loc.province || "");
          setPostalCode(loc.zipcode || "");
          setPickupID(loc.id || null);
        } else {
          Toast.show({ type: "info", text1: "No previous location found", useModal: false });
          setPickupID(null);
        }
      } catch (err) {
        console.log(err);
        Toast.show({ type: "error", text1: "Failed to load previous location", useModal: false });
        setPickupID(null);
      }
    } else {
      // checkbox turned off
      setPickupID(null)
      setStreet('')
      setCity('')
      setProvince('')
      setPostalCode('')
    }
  };


  // Delete item
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      const result = await axios.post(`${API_BASE_URL}/deletepantryfood`, {
        id: deletingItem.id,
        deleteAmount: deleteAmount,
        amount: deletingItem.amount,
        public_id: deletingItem.public_id
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (result.data.status === "ok") {
        setPantryFood(prev =>
          prev.map(item =>
            item.id === deletingItem.id
              ? { ...item, amount: item.amount - deleteAmount }
              : item
          ).filter(item => item.amount > 0)
        );
        Toast.show({ type: "success", text1: "Item updated successfully", useModal: false });
        await AsyncStorage.setItem("refreshPantry", "true");
        await AsyncStorage.setItem("refreshRecipes", "true");
        setShowDeleteModal(false);
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Delete failed", useModal: false });
    }
  };

  // Confirm donation
  const handleDonateConfirm = async () => {
    try {
      if (selectedItems.length === 0) {
        Toast.show({ type: "info", text1: "No items selected", useModal: false });
        return;
      }

      const donationData = selectedItems.map(({ id, name, donateQty, photo, foodie_id, actualQuantity, from, unitofmeasure }) => ({
        id, name, amount: donateQty, photo, foodie_id, actualQuantity, from, unitofmeasure
      }));

      const result = await axios.post(
        `${API_BASE_URL}/donate`,
        {
          items: donationData,
          selectedLocation,
          pickupTime,
          date
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      if (result.data.status === "ok") {
        Toast.show({ type: "success", text1: "Donation recorded successfully!", useModal: false });
        setSelectedItems([]);
        setStreet('');
        setPostalCode('');
        setProvince('');
        setCity('');
        setUsePreviousLocation(false)
        setPickupID(null)
        setCountry("South Africa")
      } else {
        Toast.show({ type: "error", text1: result.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Donation failed", useModal: false });
    }
  };

  // Edit item
  const handleEditConfirm = async () => {
    try {
      const newFood = {
        name: editName.trim(),
        amount: parseInt(editAmount.trim()),
        expiry_date: editExpiry,
        id: editingItem.id
      };

      const res = await axios.post(`${API_BASE_URL}/editPantryFood`, { newFood }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (res.data.status === "ok") {
        Toast.show({ type: "success", text1: res.data.data, useModal: false });
        await AsyncStorage.setItem("refreshPantry", "true");
        setShowEditModal(false);
        fetchPantryFood(userToken); // Refresh pantry list
      } else {
        Toast.show({ type: "error", text1: res.data.data, useModal: false });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Edit failed", useModal: false });
    }
  };

  const openDeleteModal = (item) => {
    setDeletingItem(item);
    setDeleteAmount(1);
    setShowDeleteModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount.toString());
    setEditExpiry(item.expirydate ? new Date(item.expirydate) : new Date());
    setShowEditModal(true);
  };

  const toggleSelectItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, { ...item, donateQty: 1, actualQuantity: item.amount, from: "pantry" }];
    });
  };

  const rows = [];
  for (let i = 0; i < pantryFood.length; i += itemsPerRow) {
    rows.push(pantryFood.slice(i, i + itemsPerRow));
  }

  // Adjust donation quantity for selected items
  const adjustAmount = (id, delta) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const step = getStep(item.unitofmeasure);
          let newQty = item.donateQty + delta * step;
          newQty = Math.max(step, Math.min(newQty, item.amount)); // min step, max item.amount
          return { ...item, donateQty: newQty };
        }
        return item;
      })
    );
  };

  return (
    <ImageBackground
      style={styles.imgBackground}
      source={require("../../../assets/foodxp/pantry bg.jpg")}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(0,0,0,0.8)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        {rows.length > 0 ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.shelf}>
                  {row.map(item => (
                    <TouchableOpacity key={item.id} onPress={() => openEditModal(item)}>
                      <View style={[styles.foodItem, { backgroundColor: theme.cardColor }]}>
                        <Image
                          source={{ uri: item.photo }}
                          style={styles.img}
                        />
                        <ThemedText style={styles.foodName}>{item.name}</ThemedText>
                        <ThemedText style={styles.qty}>{item.amount} {item.unitofmeasure}</ThemedText>
                        <View style={styles.buttonRow}>
                          <ThemedButton
                            style={[styles.btn, { backgroundColor: "#f28b82" }]}
                            onPress={() => openDeleteModal(item)}
                          >
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
              <ThemedButton
                style={[styles.btn, { backgroundColor: "#81c995", width: 180, zIndex: 1 }]}
                onPress={() => setShowDonateModal(true)}
              >
                <ThemedText>Donate Food</ThemedText>
              </ThemedButton>
            </View>
          </View>
        ) : (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.heading}>No food added yet</ThemedText>
          </ThemedView>
        )}

        {/* Modal code for donating */}
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
                {pantryFood.map(item => {
                  const selected = selectedItems.find(i => i.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modalItem, selected && { backgroundColor: theme.selected, borderColor: "#34a853" }]}
                      onPress={() => toggleSelectItem(item)}
                    >
                      <Image
                        source={{ uri: item.photo }}
                        style={styles.modalImg}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.foodName}>{item.name}</ThemedText>
                        <ThemedText style={styles.qty}>Available: {item.amount}</ThemedText>
                      </View>

                      {selected && (
                        <View style={styles.qtyControl}>
                          <TouchableOpacity onPress={() => adjustAmount(item.id, -1)}>
                            <ThemedText style={styles.qtyBtn}>−</ThemedText>
                          </TouchableOpacity>

                          <ThemedTextInput
                            value={selected.donateQty.toString()}
                            keyboardType="numeric"
                            onChangeText={(val) => {
                              const num = parseFloat(val);
                              if (!isNaN(num)) {
                                setSelectedItems(prev =>
                                  prev.map(i => i.id === item.id ? { ...i, donateQty: Math.min(num, item.amount) } : i)
                                );
                              }
                            }}
                            style={[styles.qtyValue, { width: 100, textAlign: "center" }]}
                          />

                          <TouchableOpacity onPress={() => adjustAmount(item.id, 1)}>
                            <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalButtons}>
                <ThemedButton style={[styles.btn, { backgroundColor: "#81c995" }]} onPress={() => {
                  if (selectedItems.length === 0) {
                    Toast.show({ type: "info", text1: "Please select at least one item", useModal: false });
                    return;
                  }
                  setShowDonateModal(false);
                  setShowDonationDetailsModal(true);
                }}>
                  <ThemedText>Next</ThemedText>
                </ThemedButton>
                <ThemedButton style={[styles.btn, { backgroundColor: theme.cardColor }]} onPress={() => setShowDonateModal(false)}>
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
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText style={styles.modalTitle}>Edit Food</ThemedText>

              <ScrollView contentContainerStyle={{ alignItems: "center" }}>
                <ThemedText>Name</ThemedText>
                <ThemedTextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Food Name"
                />

                <ThemedText>Amount</ThemedText>
                {/* Amount + / - Controls */}
                <View style={[styles.qtyControl, { marginTop: 10 }]}>
                  <TouchableOpacity onPress={decrementEditAmount}>
                    <ThemedText style={styles.qtyBtn}>−</ThemedText>
                  </TouchableOpacity>

                  <ThemedTextInput
                    value={editAmount.toString()}
                    keyboardType="numeric"
                    onChangeText={handleEditAmountChange}
                    style={[styles.qtyValue, { width: 100, textAlign: "center" }]}
                  />

                  <TouchableOpacity onPress={incrementEditAmount}>
                    <ThemedText style={styles.qtyBtn}>＋</ThemedText>
                  </TouchableOpacity>
                </View>

                <ThemedText>Expiry Date</ThemedText>
                <View style={{ alignItems: "center" }}>
                  {Platform.OS === "web" ? (
                    <input
                      type="date"
                      value={editExpiry.toLocaleDateString('en-CA')}
                      onChange={(e) => setEditExpiry(new Date(e.target.value))}
                      style={{
                        marginVertical: 10,
                        padding: 8,
                        fontSize: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#ccc',
                        width: 150
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={styles.dateBox}
                      >
                        <ThemedText style={styles.dateText}>
                          {editExpiry.toLocaleDateString('en-CA')}
                        </ThemedText>
                      </TouchableOpacity>

                      {showDatePicker && (
                        <DateTimePicker
                          value={editExpiry}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={onChangeExpiryDate}
                          style={{ width: 150, alignSelf: "center" }}
                        />
                      )}
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <ThemedButton style={[styles.btn, { backgroundColor: "#81c995" }]} onPress={() => { handleEditConfirm() }}>
                  <ThemedText>Save Changes</ThemedText>
                </ThemedButton>
                <ThemedButton style={[styles.btn, { backgroundColor: theme.cardColor }]} onPress={() => setShowEditModal(false)}>
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
                    <TouchableOpacity onPress={() => setDeleteAmount(prev => Math.max(getStep(deletingItem.unitofmeasure), prev - getStep(deletingItem.unitofmeasure)))}>
                      <ThemedText style={styles.qtyBtn}>−</ThemedText>
                    </TouchableOpacity>

                    <ThemedTextInput
                      value={deleteAmount.toString()}
                      keyboardType="numeric"
                      onChangeText={(val) => {
                        const num = parseFloat(val);
                        if (!isNaN(num)) setDeleteAmount(Math.min(num, deletingItem.amount));
                      }}
                      style={[styles.qtyValue, { width: 100, textAlign: "center" }]}
                    />

                    <TouchableOpacity
                      onPress={() => setDeleteAmount(prev => Math.min(deletingItem.amount, prev + getStep(deletingItem.unitofmeasure)))}
                    >
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
              {/* Suggested Locations */}
              <ScrollView
                horizontal
                contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 5 }}
                showsHorizontalScrollIndicator={false}
              >
                {suggestedLocation.length > 0 ? (
                  suggestedLocation.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      onPress={() => {
                        setStreet(loc.street);
                        setCity(loc.city);
                        setProvince(loc.province);
                        setCountry(loc.country);
                        setPostalCode(loc.postalCode);
                        setSelectedLocation(loc);
                      }}
                      style={[
                        styles.locationCard,
                        {
                          backgroundColor:
                            street === loc.street ? theme.selected : theme.background,
                        },
                      ]}
                    >
                      <ThemedText style={styles.locationText}>{loc.name} ({loc.type})</ThemedText>
                      <ThemedText style={styles.locationText}>{loc.street}</ThemedText>
                      <ThemedText style={styles.locationText}>
                        {loc.city}, {loc.province}, {loc.postalcode}
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText>No suggested locations found</ThemedText>
                )}
              </ScrollView>

              <ThemedText style={{ marginTop: 10, textAlign: "center" }}>Pickup Time</ThemedText>

              <TimePicker
                value={pickupTime}
                onChange={(time) => setPickupTime(time)}
              />

              <ThemedText style={{ marginTop: 10, textAlign: "center" }}>Pickup Date</ThemedText>

              <View style={{ alignItems: "center" }}>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={date.toLocaleDateString('en-CA')}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    style={{
                      marginVertical: 10,
                      padding: 8,
                      fontSize: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#ccc',
                      width: 150
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setShow(true)}
                      style={styles.dateBox}
                    >
                      <ThemedText style={styles.dateText}>
                        {date.toLocaleDateString('en-CA')}
                      </ThemedText>
                    </TouchableOpacity>

                    {show && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onChangeDate}
                        style={{ width: 150, alignSelf: "center" }}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.btn, { backgroundColor: "#81c995" }]}
                  onPress={async () => {
                    if (usePreviousLocation === true) {
                      // Skip manual field validation and submit directly
                      await handleDonateConfirm();
                      setShowDonationDetailsModal(false);
                      return;
                    }
                    setUsePreviousLocation(false)
                    // Manual address mode
                    if (!date || !selectedLocation || !pickupTime) {
                      Toast.show({ type: "info", text1: "Please fill in all details", useModal: false });
                      return;
                    }

                    await handleDonateConfirm();
                    setShowDonationDetailsModal(false);

                    // reset only manual fields
                    setStreet('');
                    setPostalCode('');
                    setCity('');
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
      </View>
    </ImageBackground>
  );
};

export default Pantry;

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  imgBackground: { width: "100%", height: "100%", ...StyleSheet.absoluteFillObject },
  scrollContainer: { flexGrow: 1, padding: 15, alignItems: "center" },
  shelf: { flexDirection: "row", marginBottom: 20, justifyContent: "flex-start", alignItems: "flex-start" },
  foodItem: {
    width: 140, marginRight: 15, padding: 10, borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 3, height: 4 },
    shadowRadius: 4, elevation: 4,
  },
  img: { width: 100, height: 100, borderRadius: 12, marginBottom: 6 },
  foodName: { fontSize: 16, fontWeight: "bold", color: "#4a2c0a", textAlign: "center" },
  qty: { fontSize: 13, color: "#5a3c1a", marginBottom: 6 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  btn: { flex: 1, margin: 3, paddingVertical: 8, borderRadius: 8, alignItems: "center", height: 50, zIndex: 1 },
  emptyContainer: { flex: 1, justifyContent: "", alignItems: "center", padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", color: "#4a2c0a" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { width: "90%", maxHeight: "80%", borderRadius: 16, padding: 15 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: "#4a2c0a" },
  modalItem: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  selectedItem: { borderColor: "#34a853" },
  modalImg: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  qtyControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#aaa", borderRadius: 6, paddingHorizontal: 6 },
  qtyBtn: { fontSize: 20, fontWeight: "bold", color: "#34a853", paddingHorizontal: 6 },
  qtyValue: { fontSize: 16, fontWeight: "bold", marginHorizontal: 4 },
  dateBox: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, width: '100%', alignItems: 'center', marginBottom: 10 },
  input: { width: "100%", margin: 1 },
  dateText: { fontSize: 16, color: '#333' },
  locationCard: { width: "45%", padding: 10, margin: 4, borderRadius: 5 },
  locationText: { textAlign: "center" }
});