import React, { useState } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ThemedText from "./ThemedText";

const TimePicker = ({ value, onChange }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Web version
    if (Platform.OS === "web") {
        return (
            <View style={{ alignItems: "center", alignContent: "center", flexDirection: "column", }}>
                <DatePicker

                    selected={value}
                    onChange={(date) => onChange(date)}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={5}
                    dateFormat="h:mm aa"
                    placeholderText="Select time"
                    className="timepicker-input"
                />
            </View>
        );
    }

    // Android + iOS version
    return (
        <View style={{ alignItems: "center", alignContent: "center", flexDirection: "column", }}>
            <TouchableOpacity onPress={() => setIsVisible(true)}>
                <ThemedText>{value ? value.toLocaleTimeString() : "Select time"}</ThemedText>
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isVisible}
                mode="time"
                display="spinner"
                date={value || new Date()}
                onConfirm={(date) => {
                    onChange(date);
                    setIsVisible(false);
                }}
                onCancel={() => setIsVisible(false)}
            />
        </View>
    );
};

export default TimePicker;
