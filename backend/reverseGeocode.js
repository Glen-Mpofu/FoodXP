import axios from "axios";

async function reverseGeocode({ latitude, longitude }, GOOGLE_MAPS_API_KEY) {
    console.log("Reverse geocoding for:", latitude, longitude);
    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: {
                latlng: `${latitude},${longitude}`,
                key: GOOGLE_MAPS_API_KEY,
            },
        });

        const results = response.data.results;
        if (!results || results.length === 0) {
            console.warn("⚠️ Google returned zero results:", response.data.status);
            return null;
        }

        const firstResult = results[0];
        const components = {};

        firstResult.address_components.forEach((comp) => {
            if (comp.types.includes("street_number")) components.streetNumber = comp.long_name;
            if (comp.types.includes("route")) components.street = comp.long_name;
            if (comp.types.includes("locality")) components.city = comp.long_name;
            if (comp.types.includes("administrative_area_level_1")) components.province = comp.long_name;
            if (comp.types.includes("country")) components.country = comp.long_name;
            if (comp.types.includes("postal_code")) components.postalCode = comp.long_name;
        });

        return {
            formattedAddress: firstResult.formatted_address,
            ...components,
            latitude,
            longitude
        };

    } catch (err) {
        console.error("❌ Google reverse geocoding failed:", err.response?.data || err.message);
        return null;
    }
}

export default reverseGeocode;
