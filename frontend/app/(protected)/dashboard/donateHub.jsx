import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, useColorScheme, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { API_BASE_URL } from "@env"
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import ThemedButton from '../../../components/ThemedButton'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Toast } from 'toastify-react-native'
import { Colors } from '../../../constants/Colors'
import { MaterialCommunityIcons } from "@expo/vector-icons"

const DonateMap = () => {
  const [userToken, setUserToken] = useState(null);
  const [availableDonations, setAvailableDonations] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const [donorRequests, setDonorRequests] = useState([]);

  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        setUserToken(token);

        // Fetch all donations
        const donationsResult = await axios.get(`${API_BASE_URL}/getDonations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const donations = donationsResult.data.data || [];

        // Fetch donations this user has already requested
        const requestsResult = await axios.get(`${API_BASE_URL}/getMyDonationRequests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const requestedDonations = requestsResult.data.data || [];

        // Create a set of requested donation IDs for fast lookup
        const requestedIds = new Set(requestedDonations.map(d => d.donation_id));

        // Filter out requested donations from available donations
        const remainingDonations = donations.filter(d => !requestedIds.has(d.donation_id));

        setMyRequests(requestedDonations);
        setAvailableDonations(remainingDonations);

      } catch (err) {
        console.error(err);
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false });
      }
    }

    fetchDonorRequests();
    init();
  }, []);

  const acceptRequest = async (request) => {
    try {
      await axios.post(`${API_BASE_URL}/acceptRequest`, { request_id: request.request_id }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Toast.show({ type: "success", text1: `Accepted request from ${request.requester_name}` });

      // Remove accepted request from donorRequests
      setDonorRequests(prev => prev.filter(r => r.request_id !== request.request_id));
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to accept request" });
    }
  };


  async function fetchDonorRequests() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/getRequestsForMe`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDonorRequests(res.data.data || []);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to fetch donor requests" });
    }
  }

  const requestDonation = async (donation) => {
    try {
      await axios.post(`${API_BASE_URL}/requestDonation`, { donation }, { headers: { Authorization: `Bearer ${userToken}` } })
      Toast.show({ type: "success", text1: `You claimed ${donation.name}!` });

      setAvailableDonations(prev => prev.filter(d => d.donation_id !== donation.donation_id));
      setMyRequests(prev => [...prev, donation]);
      setSelectedDonation(null);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to claim donation" });
    }
  }

  const toggleSelectDonation = (donation) => {
    setSelectedDonation(prev => (prev?.donation_id === donation.donation_id ? null : donation));
  }

  const renderDonation = ({ item, isRequest = false }) => {
    const selected = selectedDonation?.donation_id === item.donation_id;

    return (
      <TouchableOpacity
        key={item.donation_id}
        style={[
          styles.donationRow,
          { backgroundColor: theme.cardColor },
          selected && { borderColor: "#34a853", borderWidth: 2 }
        ]}
        onPress={() => toggleSelectDonation(item)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.food_photo ?? item.photo }} style={styles.donationImage} />

        <View style={styles.donationDetails}>
          <ThemedText style={styles.donationName}>{item.food_name ?? item.name}</ThemedText>
          <ThemedText style={styles.donationAmount}>
            {item.amount} {item.unitofmeasure ?? ""}
          </ThemedText>
          {item.fname && <ThemedText style={styles.donorInfo}>Donor: {item.fname}</ThemedText>}
          {item.email && <ThemedText style={styles.donorInfo}>{item.email}</ThemedText>}

          {/* Show pickup location only if accepted THIS SHOWS ON THE REQUESTER SIDE */}
          {item.status === "Accepted" && item.city && (
            <View style={{ marginTop: 5 }}>
              <ThemedText style={{ fontSize: 13, color: "#444", fontWeight: "bold" }}>
                Pickup Location:
              </ThemedText>
              <ThemedText style={{ fontSize: 13, color: "#555" }}>
                {item.street}, {item.city}, {item.province}, {item.zipcode}, {item.country}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.actionContainer}>
          {!isRequest && selected && (
            <ThemedButton style={styles.claimBtn} onPress={() => requestDonation(item)}>
              <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Request</ThemedText>
            </ThemedButton>
          )}
          {isRequest && (
            <ThemedView>
              <View style={styles.requestBadge}>
                <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>
                  {item.status ?? "Requested"}
                </ThemedText>
              </View>
            </ThemedView>
          )}

        </View>
      </TouchableOpacity>
    );
  };


  return (

    <ThemedView style={[styles.container, { backgroundColor: theme.uiBackground }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* My Requests */}
        <ThemedText style={styles.heading}>My Donation Requests</ThemedText>
        {myRequests.length === 0 ? (
          <ThemedText style={{ textAlign: "center", marginBottom: 10 }}>You have no donation requests</ThemedText>
        ) : (
          <FlatList
            data={myRequests}
            keyExtractor={item => item.donation_id}
            renderItem={({ item }) => renderDonation({ item, isRequest: true })}
            scrollEnabled={false} // allow outer ScrollView to handle scrolling
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}

        {/* Donor Requests */}
        <ThemedText style={styles.heading}>Requests for My Donations</ThemedText>
        {donorRequests.length === 0 ? (
          <ThemedText style={{ textAlign: "center", marginBottom: 10 }}>No requests yet</ThemedText>
        ) : (
          <FlatList
            data={donorRequests}
            keyExtractor={item => item.request_id}
            renderItem={({ item }) => (
              <View style={[styles.donationRow, { backgroundColor: theme.cardColor }]}>
                <Image source={{ uri: item.food_photo }} style={styles.donationImage} />
                <View style={styles.donationDetails}>
                  <ThemedText style={styles.donationName}>{item.food_name}</ThemedText>
                  <ThemedText>Requester: {item.requester_name}</ThemedText>
                  <ThemedText>Email: {item.requester_email}</ThemedText>
                  <ThemedText>Status: {item.status ?? "Pending"}</ThemedText>
                </View>
                {item.status !== "Accepted" && (
                  <ThemedButton style={styles.claimBtn} onPress={() => acceptRequest(item)}>
                    <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Accept</ThemedText>
                  </ThemedButton>
                )}
                {item.status === "Accepted" && (
                  <TouchableOpacity
                    style={{ marginTop: 10 }}
                    onPress={async () => {
                      try {
                        await axios.post(`${API_BASE_URL}/incrementDonatedItem`, { donor_id: item.donor_id, requester_id: item.requester_id }, {
                          headers: { Authorization: `Bearer ${userToken}` }
                        });
                        Toast.show({ type: "success", text1: "Donation count incremented!" });
                      } catch (err) {
                        console.error(err);
                        Toast.show({ type: "error", text1: "Failed to increment donation" });
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="hand-heart-outline" size={30} color="#34a853" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

        )}

        {/* Available Donations */}
        <ThemedText style={styles.heading}>Available Donations</ThemedText>
        {availableDonations.length === 0 ? (
          <ThemedText style={{ textAlign: "center", marginBottom: 10 }}>No Donations yet</ThemedText>
        ) : (
          <FlatList
            data={availableDonations}
            keyExtractor={item => item.donation_id}
            renderItem={renderDonation}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>
    </ThemedView>
  )
}

export default DonateMap

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%" },
  heading: { alignSelf: "center", fontSize: 26, fontWeight: "bold", marginVertical: 15 },
  donationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  donationImage: { width: 90, height: 90, borderRadius: 12 },
  donationDetails: { flex: 1, marginLeft: 15, justifyContent: "center" },
  donationName: { fontSize: 17, fontWeight: "bold", marginBottom: 5 },
  donationAmount: { fontSize: 15, color: "#555", marginBottom: 5 },
  donorInfo: { fontSize: 13, color: "#777" },
  actionContainer: { justifyContent: "center", alignItems: "center" },
  claimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#34a853",
    borderRadius: 8,
    height: 35,
    width: 100
  },
  requestBadge: {
    backgroundColor: "#34a853",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  }
});
