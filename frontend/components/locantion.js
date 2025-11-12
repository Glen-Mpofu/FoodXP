import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

/**
 * Request location permissions from user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export async function requestLocationPermission() {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Location Permission Required',
                'FoodXP needs access to your location to show nearby restaurants and delivery options.',
                [{ text: 'OK' }]
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
}

/**
 * Get current user location coordinates
 * @returns {Promise<Object|null>} Location object with latitude, longitude, etc.
 */
export async function getCurrentLocation() {
    try {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
            return null;
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
        };
    } catch (error) {
        console.error('Error getting current location:', error);
        Alert.alert(
            'Location Error',
            'Unable to retrieve your location. Please make sure location services are enabled.',
            [{ text: 'OK' }]
        );
        return null;
    }
}

/**
 * Get address from coordinates (Reverse Geocoding)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object|null>} Address object
 */
export async function getAddressFromCoordinates(latitude, longitude) {
    try {
        const addresses = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
        });

        if (addresses && addresses.length > 0) {
            const address = addresses[0];
            return {
                street: address.street || '',
                city: address.city || '',
                region: address.region || '',
                postalCode: address.postalCode || '',
                country: address.country || '',
                name: address.name || '',
                // Formatted address string
                formatted: [
                    address.street,
                    address.city,
                    address.region,
                    address.postalCode,
                    address.country
                ].filter(Boolean).join(', ')
            };
        }

        return null;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return null;
    }
}

/**
 * Get coordinates from address string (Geocoding)
 * @param {string} address 
 * @returns {Promise<Object|null>}
 */
export async function getCoordinatesFromAddress(address) {
    try {
        const locations = await Location.geocodeAsync(address);

        if (locations && locations.length > 0) {
            return {
                latitude: locations[0].latitude,
                longitude: locations[0].longitude,
            };
        }

        return null;
    } catch (error) {
        console.error('Error geocoding address:', error);
        return null;
    }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Watch user location for continuous updates
 * @param {Function} callback - Called with location updates
 * @returns {Promise<Object>} Subscription object to remove listener
 */
export async function watchLocation(callback) {
    try {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
            return null;
        }

        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 10000, // Update every 10 seconds
                distanceInterval: 50, // Or when user moves 50 meters
            },
            (location) => {
                callback({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                    timestamp: location.timestamp,
                });
            }
        );

        return subscription;
    } catch (error) {
        console.error('Error watching location:', error);
        return null;
    }
}

/**
 * Check if location services are enabled
 * @returns {Promise<boolean>}
 */
export async function isLocationEnabled() {
    try {
        return await Location.hasServicesEnabledAsync();
    } catch (error) {
        console.error('Error checking location services:', error);
        return false;
    }
}