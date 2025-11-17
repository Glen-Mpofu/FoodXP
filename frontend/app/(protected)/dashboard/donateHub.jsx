import {
  StyleSheet,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Platform
} from "react-native";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@env";
import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import ThemedButton from "../../../components/ThemedButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Toast } from "toastify-react-native";
import { Colors } from "../../../constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getCurrentLocation } from '../../../components/locantion';

const DonateMap = () => {
  const [userToken, setUserToken] = useState(null);
  const [availableDonations, setAvailableDonations] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [donorRequests, setDonorRequests] = useState([]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const [stats, setStats] = useState([])
  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        setUserToken(token);

        const donationsResult = await axios.get(`${API_BASE_URL}/getDonations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const donations = donationsResult.data.data || [];

        const requestsResult = await axios.get(
          `${API_BASE_URL}/getMyDonationRequests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const requestedDonations = requestsResult.data.data || [];
        const requestedIds = new Set(
          requestedDonations.map((d) => d.donation_id)
        );

        const remainingDonations = donations.filter(
          (d) => !requestedIds.has(d.donation_id)
        );

        setMyRequests(requestedDonations);
        setAvailableDonations(remainingDonations);

        const result = await axios.get(`${API_BASE_URL}/getStats`,
          { headers: { Authorization: `Bearer ${token}` } })
        setStats(result.data.data)
      } catch (err) {
        console.error(err);
        Toast.show({
          type: "error",
          text1: "Something went wrong",
          useModal: false,
        });
      }
    }

    fetchDonorRequests();
    init();
  }, []);

  async function fetchDonorRequests() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/getRequestsForMe`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDonorRequests(res.data.data || []);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "Failed to fetch donor requests",
      });
    }
  }

  const acceptRequest = async (request) => {
    try {
      await axios.post(
        `${API_BASE_URL}/acceptRequest`,
        {
          request_id: request.request_id,
          requester_id: request.requester_id
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      Toast.show({
        type: "success",
        text1: `Accepted request from ${request.requester_name}`,
      });
      setDonorRequests((prev) =>
        prev.filter((r) => r.request_id !== request.request_id)
      );
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to accept request" });
    }
  };

  const requestDonation = async (donation) => {
    try {
      await axios.post(
        `${API_BASE_URL}/requestDonation`,
        { donation },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      Toast.show({
        type: "success",
        text1: `You requested ${donation.name}!`,
      });

      setAvailableDonations((prev) =>
        prev.filter((d) => d.donation_id !== donation.donation_id)
      );
      setMyRequests((prev) => [...prev, donation]);
      setSelectedDonation(null);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to claim donation" });
    }
  };

  const toggleSelectDonation = (donation) => {
    setSelectedDonation((prev) =>
      prev?.donation_id === donation.donation_id ? null : donation
    );
  };

  // Inside DonateMap component
  const rejectRequest = async (request) => {
    try {
      await axios.post(
        `${API_BASE_URL}/rejectRequest`,
        {
          request_id: request.request_id,
          requester_id: request.requester_id
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      Toast.show({
        type: "success",
        text1: `Rejected request from ${request.requester_name}`,
      });
      setDonorRequests((prev) =>
        prev.filter((r) => r.request_id !== request.request_id)
      );
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to reject request" });
    }
  };

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
          <ThemedText style={styles.donationName}>{item.food_name ?? item.name} ({item.amount})</ThemedText>

          {item.donor_name && <ThemedText style={styles.donorInfo}>Donor: {item.donor_name}</ThemedText>}
          {item.donor_email && <ThemedText style={styles.donorInfo}><MaterialCommunityIcons name="email" color={theme.iconColor} /> {item.donor_email}</ThemedText>}
          {item.donor_phone && <ThemedText style={styles.donorInfo}> <MaterialCommunityIcons name="phone" color={theme.iconColor} /> {item.donor_phone}</ThemedText>}

          {/* Show pickup location only if accepted THIS SHOWS ON THE REQUESTER SIDE */}
          {item.status === "Accepted" && item.city && (
            <View style={{ marginTop: 5 }}>
              <ThemedText style={{ fontSize: 13, color: "#444", fontWeight: "bold" }}>
                Pickup Location:
              </ThemedText>
              <ThemedText style={{ fontSize: 13, color: "#555" }}>
                {item.street}, {item.city}, {item.province}, {item.zipcode}, {item.country}
              </ThemedText>
              <ThemedText>
                Pick Up at {item.pickuptime} on {item.pickupdate}
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
    <ThemedView
      style={[styles.container, { backgroundColor: theme.uiBackground }]}
    >
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

        {/* Requests for My Donations */}
        <ThemedText style={styles.heading}>Requests for My Donations</ThemedText>
        {donorRequests.length === 0 ? (
          <ThemedText style={styles.emptyText}>No requests yet</ThemedText>
        ) : (
          <FlatList
            data={donorRequests}
            keyExtractor={(item) => item.request_id}
            renderItem={({ item }) => (
              <View
                style={[styles.donationRow, { backgroundColor: theme.cardColor }]}
              >
                <Image source={{ uri: item.food_photo }} style={styles.donationImage} />
                <View style={styles.donationDetailsColumn}>
                  <ThemedText style={styles.donationName}>{item.food_name}</ThemedText>
                  <ThemedText>Requester: {item.requester_name}</ThemedText>
                  <ThemedText>Email: {item.requester_email}</ThemedText>
                  <ThemedText>Status: {item.status ?? "Pending"}</ThemedText>

                  {item.status !== "Accepted" && (
                    <View style={{ flexDirection: "row", marginTop: 10, marginBottom: 5, }}>
                      <ThemedButton
                        style={[styles.claimBtn, { marginRight: 5 }]}
                        onPress={() => acceptRequest(item)}
                      >
                        <ThemedText style={styles.btnText}>Accept</ThemedText>
                      </ThemedButton>

                      <ThemedButton
                        style={[styles.rejectBtn]}
                        onPress={() => rejectRequest(item)}
                      >
                        <ThemedText style={styles.btnText}>Reject</ThemedText>
                      </ThemedButton>
                    </View>
                  )}

                  {item.status === "Accepted" && (
                    <TouchableOpacity
                      style={[styles.heartIconContainer, { marginTop: 10 }]}
                      onPress={async () => {
                        try {
                          await axios.post(
                            `${API_BASE_URL}/finaliseDonation`,
                            {
                              donor_id: item.donor_id,
                              requester_id: item.requester_id,
                              donation_id: item.donation_id,
                              donation: item
                            },
                            { headers: { Authorization: `Bearer ${userToken}` } }
                          );
                          Toast.show({
                            type: "success",
                            text1: "Donation count incremented!",
                          });
                        } catch (err) {
                          console.error(err);
                          Toast.show({
                            type: "error",
                            text1: "Failed to increment donation",
                          });
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name="hand-heart-outline"
                        size={28}
                        color="#34a853"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

        )}

        {/* Available Donations */}
        <ThemedText style={styles.heading}>Available Donations</ThemedText>
        {availableDonations.length === 0 ? (
          <ThemedText style={styles.emptyText}>No Donations yet</ThemedText>
        ) : (
          <FlatList
            data={availableDonations}
            keyExtractor={(item) => item.donation_id}
            renderItem={renderDonation}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", justifyContent: "space-evenly", margin: 15 }}>
        <ThemedText>
          Donations Made: {stats?.donationsmade || 0}
        </ThemedText>
        <ThemedText>
          Donations Received: {stats?.donationsreceived || 0}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

export default DonateMap;

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%" },
  heading: {
    alignSelf: "center",
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 15,
  },
  emptyText: { textAlign: "center", marginBottom: 10, color: "#777" },
  donationRow: {
    borderRadius: 15,
    marginHorizontal: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    ...Platform.select({
      ios: { backgroundColor: "#fff" },
      android: { backgroundColor: "#fafafa" },
    }),
  },
  donationImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    resizeMode: "cover",
  },
  donationDetailsColumn: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 10,
  },
  donationName: { fontSize: 16, fontWeight: "bold", margin: 4, textAlign: "center" },
  donorInfo: { fontSize: 13, color: "#555", marginTop: 2 },
  pickupContainer: { marginTop: 8 },
  pickupLabel: { fontSize: 13, fontWeight: "bold", color: "#444" },
  pickupText: { fontSize: 13, color: "#555" },
  pickupTime: { fontSize: 13, color: "#333", fontWeight: "600" },
  claimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#34a853",
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  heartIconContainer: { alignItems: "center", justifyContent: "center" }, rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ea4335", // red for reject
    borderRadius: 8,
  },
  actionContainer: {
    alignItems: "center",
    padding: 5
  }
});
