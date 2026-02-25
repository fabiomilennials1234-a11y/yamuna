
/**
 * Normalizes product names to group variations (e.g., Single vs Box).
 * Returns the canonical name and the quantity multiplier.
 */
export function normalizeProduct(name: string): { name: string; multiplier: number; isBox: boolean } {
    if (!name) return { name: "Desconhecido", multiplier: 1, isBox: false };

    let cleanName = name.trim();
    let multiplier = 1;
    let isBox = false;

    // Detect patterns like "Caixa 16", "Box 12", "Cxa 6"
    // Regex looks for Case/Caixa/Box followed by a number
    const boxRegex = /(?:caixa|cxa|box)\s*(?:de\s*)?(\d+)/i;
    const match = cleanName.match(boxRegex);

    if (match) {
        // Extract multiplier
        multiplier = parseInt(match[1], 10);
        isBox = true;

        // Remove the box part from the name to get the base product name
        // E.g. "Ghee 300g Caixa 16" -> "Ghee 300g"
        cleanName = cleanName
            .replace(match[0], "") // Remove "Caixa 16"
            .replace(/\s+un\b/i, "") // Remove " un" if left
            .replace(/\s+unidades\b/i, "") // Remove " unidades" if left
            .replace(/\s*-\s*$/, "") // Remove trailing dash
            .replace(/^\s*-\s*/, "") // Remove leading dash
            .trim();
    }

    // Capitalize first letter
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    return {
        name: cleanName,
        multiplier: Math.max(1, multiplier), // Ensure at least 1
        isBox
    };
}
