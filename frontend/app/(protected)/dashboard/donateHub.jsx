import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { API_BASE_URL } from "@env"
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import ThemedButton from '../../../components/ThemedButton'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Toast } from 'toastify-react-native'

const DonateMap = () => {
  const [userToken, setUserToken] = useState(null)
  const [availableDonations, setAvailableDonations] = useState([])
  const [selectedDonation, setSelectedDonation] = useState(null)

  useEffect(() => {
    async function init() {
      try {
        const token = await AsyncStorage.getItem("userToken")
        if (!token) return
        setUserToken(token)

        const result = await axios.get(`${API_BASE_URL}/getDonations`, { headers: { Authorization: `Bearer ${token}` } })
        if (result.data.status === "ok") {
          setAvailableDonations(result.data.data)
        }
      } catch (err) {
        console.error(err)
        Toast.show({ type: "error", text1: "Something went wrong", useModal: false })
      }
    }
    init()
  }, [])

  const claimDonation = async (donation) => {
    try {
      await axios.post(`${API_BASE_URL}/claimDonation`, { donation_id: donation.donation_id, token: userToken })
      Toast.show({ type: "success", text1: `You claimed ${donation.name}!` })
      setSelectedDonation(null)
      setAvailableDonations(prev => prev.filter(d => d.donation_id !== donation.donation_id))
    } catch (err) {
      console.error(err)
      Toast.show({ type: "error", text1: "Failed to claim donation" })
    }
  }

  const toggleSelectDonation = (donation) => {
    setSelectedDonation(prev => (prev?.donation_id === donation.donation_id ? null : donation))
  }

  const renderDonation = ({ item }) => {
    const selected = selectedDonation?.donation_id === item.donation_id

    return (
      <TouchableOpacity
        key={item.donation_id}
        style={[styles.donationRow, selected && { borderColor: "#34a853", borderWidth: 2, backgroundColor: "#e6f4ea" }]}
        onPress={() => toggleSelectDonation(item)}
      >
        {/* Donation Info */}
        <View style={styles.donationColumn}>
          <Image source={{ uri: item.photo }} style={styles.donationImage} />
          <View style={styles.donationDetails}>
            <ThemedText style={styles.donationName}>{item.name}</ThemedText>
            <ThemedText>Available: {item.amount} {item.unitofmeasure ?? ""}</ThemedText>
          </View>
        </View>

        {/* Donor Info */}
        <View style={styles.column}>
          {item.fname && <ThemedText>Donor: {item.fname}</ThemedText>}
          {item.email && <ThemedText>Email: {item.email}</ThemedText>}
        </View>

        {selected && (
          <ThemedButton style={styles.claimBtn} onPress={() => claimDonation(item)}>
            <ThemedText>Claim Donation</ThemedText>
          </ThemedButton>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>Available Donations</ThemedText>

      <FlatList
        data={availableDonations}
        keyExtractor={item => item.donation_id}
        renderItem={renderDonation}
        contentContainerStyle={{ padding: 10 }}
      />
    </ThemedView>
  )
}

export default DonateMap

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  heading: {
    alignSelf: "center",
    fontSize: 25,
    marginVertical: 10,
  },
  donationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f7f7",
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  donationColumn: {
    flexDirection: "row",
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  donationImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 10,
  },
  donationDetails: {
    flex: 1,
  },
  donationName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  column: {
    flex: 1,
  },
  claimBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#34a853",
    borderRadius: 5,
  }
})
