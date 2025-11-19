export const extractExpiryFromText = (text) => {
    // Match common expiry date formats:
    const patterns = [
        /\b(20\d{2})[-/\.](0[1-9]|1[0-2])[-/\.]([0-2]\d|3[01])\b/,   // 2025-02-18 or 2025/02/18
        /\b([0-2]\d|3[01])[-/\.](0[1-9]|1[0-2])[-/\.](20\d{2})\b/,   // 18-02-2025
        /\b(0[1-9]|1[0-2])[-/\.]([0-2]\d|3[01])[-/\.](20\d{2})\b/,   // 02-18-2025
        /\b(?:EXP|Expiry|Best Before|BB)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})\b/i // EXP 18/02/2025
    ];

    for (const p of patterns) {
        const match = text.match(p);
        if (match) {
            let cleaned = match[0]
                .replace("EXP", "")
                .replace("Expiry", "")
                .replace("Best Before", "")
                .trim();

            // Normalize to yyyy-mm-dd
            const parts = cleaned.split(/[-/\.]/);

            if (parts[0].length === 4) {
                // yyyy mm dd
                return `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
            if (parts[2].length === 4) {
                // dd mm yyyy or mm dd yyyy → detect
                const [a, b, year] = parts;
                if (a > 12) return `${year}-${b}-${a}`; // dd-mm-yyyy
                return `${year}-${a}-${b}`; // mm-dd-yyyy
            }
        }
    }

    return null;
};