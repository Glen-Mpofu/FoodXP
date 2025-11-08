import { useState } from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

const UnitDropDown = ({ selectedUnit, setSelectedUnit, options }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(!open)}
                style={styles.button}
            >
                <Text>{selectedUnit}</Text>
            </TouchableOpacity>

            {open && (
                <View style={styles.dropdown}>
                    <FlatList
                        data={options}
                        keyExtractor={(item, idx) => idx.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedUnit(item);
                                    setOpen(false);
                                }}
                                style={styles.item}
                            >
                                <Text>{item}</Text>
                            </TouchableOpacity>
                        )}
                        // limit the number of visible items to scroll
                        showsVerticalScrollIndicator={true}
                    />
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    button: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
        width: 120,
    },
    dropdown: {
        position: "absolute",
        top: "50%", // below button
        width: 120,
        maxHeight: 200, // <-- limit the height so it scrolls
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#fff",
        zIndex: 1000,
    },
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
});

export default UnitDropDown;
