import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Toast } from "toastify-react-native";
import axios from "axios"
import ThemedView from '../../../components/ThemedView'
import ThemedText from '../../../components/ThemedText'
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ThemedTextInput from '../../../components/ThemedTextInput';
import ThemedButton from '../../../components/ThemedButton';
import { router } from 'expo-router'
import DropDownPicker from "react-native-dropdown-picker";
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from "@env"

const Settings = () => {
  const [foodie, setFoodie] = React.useState(null)

  const [password, onPasswordChange] = React.useState("")
  const [name, onNameChange] = React.useState("")

  const [modalVisible, setModalVisible] = React.useState(false)
  const openModal = () => {
    setModalVisible(true)
  }
  const closeModal = () => {
    setModalVisible(false)
  }

  const [selectedOption, setSelectedOption] = React.useState(null)

  const [userToken, setUserToken] = React.useState(null)

  //drop down
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(null)
  const [items, setItems] = React.useState([
    {label: "Yes", value: "yes"},
    {label: "No", value: "no"}
  ])

  useEffect(() => {
    const init = async () =>{
      const token = await AsyncStorage.getItem("userToken")
      if(!token){
        return router.replace("/")
      }
      setUserToken(token)
    };

    //const baseUrl = Platform.OS === "web" ? "http://localhost:5001/session" : "http://192.168.137.1:5001/session"
    axios.get(`${API_BASE_URL}/session`, {withCredentials: true})
    .then((res) => {
      if(res.data.status === "ok"){
        Toast.show({
          type: "success",
          text1: "Session on",
          useModal: false
        })
        setFoodie(res.data.data)
      }else{
        Toast.show({
          type: "error",
          text1: "Session off",
          useModal: false
        })
      }
    }).catch( err => {
      console.log(err)
    });
    init();
  }, [])

  // Name change
  async function nameChange() {
    const foodieData = {
      email: foodie?.email, 
      name: name
    }
    //const baseUrl = Platform.OS === "web" ? "http://localhost:5001/namechange" : "http://192.168.137.1:5001/namechange"
    axios.post(`${API_BASE_URL}/namechange`, foodieData, {withCredentials: true}).
    then((res) => {
      if(res.data.status === "ok"){
        Toast.show({
          type: "success",
          text1: res.data.data,
          useModal: false
        })
        closeModal();
      }
      else{
        Toast.show({
          type: "error",
          text1: res.data.data,
          useModal: false
        })
        closeModal();
      }

    }).catch(err => {
      console.log(err)
      Toast.show({
        type: "error",
        text1: "There was a problem changing the " + selectedOption,
        useModal: false
      })
    })
  
  }

  async function passwordChange() {
    const foodieData = {
      email: foodie?.email, 
      password: password
    }

    //const baseUrl = Platform.OS === "web" ? "http://localhost:5001/passwordchange" : "http://192.168.137.1:5001/passwordchange"
    axios.post(`${API_BASE_URL}/passwordchange`, foodieData, {withCredentials: true}).then((res) => {
      if(res.data.status === "ok"){
        Toast.show({
          type: "success",
          text1: res.data.data,
          useModal: false
        })
        closeModal();
      }
      else{
        Toast.show({
          type: "error",
          text1: res.data.data,
          useModal: false
        })
      }
    }).catch(err => {
      console.log(err)
      Toast.show({
          type: "error",
          text1: "There was an error while saving changes",
          useModal: false
        })
    })

  }

  async function deleteAccount() {
    if(value === "no"){
      return closeModal();
    }else if(value === "yes"){
      const foodieData = {
        email: foodie?.email, 
      }
      //const baseUrl = Platform.OS === "web" ? "http://localhost:5001/deleteaccount" : "http://192.168.137.1:5001/deleteaccount"
      axios.post(`${API_BASE_URL}/deleteaccount`, foodieData, {withCredentials: true}).then((res)=>{
        if(res.data.status === "ok"){
          Toast.show({
            type: "success",
            text1: res.data.data,
            useModal: false
          })
          router.replace("/")
        }else{
          Toast.show({
            type: "error",
            text1: res.data.data,
            useModal: false
          })
        }
      }).catch(err => {
        console.log(err)
      })
    }
  }

  async function handleLogout() {
  // Clear auth/session here
  // redirect to login screen

  await axios.post(`${API_BASE_URL}/logout`, {}, { withCredentials: true }).
    then((res) => {
        if (res.data.status === "ok") {
            Toast.show({
              type: "success",
              text1: res.data.data,
              useModal: false
            })

            AsyncStorage.removeItem("userToken")
            router.replace("/");                    
        }
    }).catch((e) => {
        console.log(e)
        Toast.show({
          type: "error",
          text1: "Something went wrong when logging out" + e,
          useModal: false
        })
    })
  }

  return (
    <ThemedView style={styles.container}>
      <Ionicons name='person-circle' size={100}/>
      <ThemedText style={styles.heading}>Foodie Details</ThemedText>

      <View style={styles.rowContainer}>
        <MaterialCommunityIcons name ="food-steak" size={20}/>
        <ThemedText style={styles.text}>
          {foodie?.name || "Loading Name"}
        </ThemedText>
      </View>

      <View style={styles.rowContainer}>
        <Ionicons name ="mail" size={20}/>
        <ThemedText style={styles.text}>
          {foodie?.email || "Loading Email"}
        </ThemedText>
      </View>

      <View style={{
        height: 1,
        backgroundColor: 'gray',
        width: '100%',
        marginVertical: 10
      }} />

      <View style={styles.cardContainer}>
        <ThemedView style={styles.cards}>

          <View style={styles.securityRow}>
            <Ionicons name='lock-closed-outline' size={20}/>
            <ThemedText style={styles.cardHeading}>Security</ThemedText>
          </View>
          {/* CHANGE PASSWORD */}
          <TouchableOpacity onPress={()=> {
              openModal();
              setSelectedOption("Password")
            }}>
            <ThemedText>Change Password</ThemedText>
          </TouchableOpacity>

          {/* CHANGE NAME */}
          <TouchableOpacity onPress={()=> {
              openModal();
              setSelectedOption("Name")
            }}>
            <ThemedText>Change Name</ThemedText>
          </TouchableOpacity>

            <View style={{
              height: 1,
              backgroundColor: 'gray',
              width: '100%',
              marginVertical: 10
            }} />

          <TouchableOpacity onPress={()=> {
              openModal();
              setSelectedOption("Delete")
            }}>
            <ThemedText>Delete Account</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
              handleLogout();
            }}>
            <ThemedText>Logout</ThemedText>
          </TouchableOpacity>

        </ThemedView>      

        <ThemedView style={styles.cards}>
          <ThemedText style={styles.cardHeading}>About FoodXP & the Programmer</ThemedText>
        </ThemedView>      
      </View>

      {/* MODAL FOR CHANGING AND DELETING */}
      <Modal
        transparent = {true}
        animationType='fade'
        visible={modalVisible}
        onDismiss={() => closeModal()}
      >
        <ThemedView style={styles.modalViewContainer}>
            <ThemedText style={styles.cardHeading}>
              Change/Confirm {selectedOption}
            </ThemedText>
            { selectedOption != "Password" && selectedOption != "Delete" &&
              <ThemedTextInput placeholder={"Old " + selectedOption} value = {
                selectedOption === "Name" ? foodie?.name : selectedOption === "Email" ? foodie?.email : foodie?.password
              }/>
            } 
            
            {selectedOption != "Delete" && 
              <ThemedTextInput placeholder={"New " + selectedOption} value={ 
                selectedOption === "Name" ? name : selectedOption === "Email" ? email : password
              } 
              onChangeText = {
                selectedOption === "Name" ? onNameChange : selectedOption === "Email" ? onEmailChange : onPasswordChange
              }
              />
            }

            {selectedOption === "Delete" && 
              <>
                <ThemedText>Are you sure you want to delete the account?</ThemedText>
                  <DropDownPicker 
                    open={open}
                    value={value}
                    items={items}
                    setOpen={setOpen}
                    setValue={setValue}
                    setItems={setItems}
                    placeholder='Select an Option'
                    zIndex={1000}
                    style={styles.dropBox}
                  />
              </>          
            }

            <ThemedButton
              onPress={()=> {
                selectedOption === "Name" ? nameChange() : selectedOption === "Password" ? passwordChange() : selectedOption === "Delete" ? deleteAccount() : console.log("SelectedOption is null")
              }}
            > 
              <ThemedText>Update/Confirm {selectedOption}</ThemedText>
            </ThemedButton>

            <TouchableOpacity onPress={()=> closeModal()} style={{position: "absolute", bottom: 500, alignSelf: "flex-end"}}>
              <Ionicons name='close' size={30} color={"red"} />
            </TouchableOpacity>
        </ThemedView>        
      </Modal>

    </ThemedView>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    justifyContent: "",
    alignItems: "center",
    
  },
  rowContainer: {
    flexDirection: "row",
  },
  cardContainer: {
    flexDirection: "row",
    height: "100%",
    width: "100%",
    margin: 5,
  },
  text: {
    fontSize: 13
  },
  heading:{
    fontSize: 20,
    paddingBottom: 10
  },
  cards: {
    height: "50%",
    width: "50%",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#773030ff",
    justifyContent: "",
    alignItems: "center",
    margin: 5
  },
  cardHeading: {
    fontSize: 18,
    paddingBottom: 10
  }, 
  securityRow:{
    flexDirection: "row",
    alignContent: "center",
    justifyContent: "center",
    width: "100%"
  },
  modalViewContainer:{
    flex: 1,
    backgroundColor: "rgba(218, 252, 211, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropBox: {
    width: 200,
    alignSelf: "center",
    justifyContent: "center",
    alignContent: "center",
    margin: 10
  }
})