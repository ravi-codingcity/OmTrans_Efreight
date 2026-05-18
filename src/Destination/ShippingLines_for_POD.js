/**
 * Shipping Lines Master Data
 *
 * This file contains the complete list of shipping lines that can be
 * associated with POD destinations. This centralized approach makes it
 * easier to maintain and update shipping line information.
 *
 * Usage:
 * import { getShippingLinesForPOD } from './ShippingLines_for_POD.js';
 * const shippingLines = getShippingLinesForPOD();
 */

// Master list of shipping lines
const SHIPPING_LINES = [
  "Aegon Shipping",
  "Akkon",
  "ANL",
  "Arkas Line",
  "BARCO",
  "BLPL Singapore",
  "BLUE WATER LINES",
  "CARAVEL",
  "CMA CGM",
  "Cordelia Cruises",
  "COSCO",
  "CU Lines",
  "Econ Line",
  "Emirates Shipping",
  "Evergreen",
  "FESCO LINE",
  "GALEON",
  "Goodrich Maritime",
  "Hapag-Lloyd",
  "HMM",
  "Hub & Link",
  "HYUNDAI",
  "INOX",
  "INTERASIA LINE",
  "KMTC",
  "LEO GLOBAL",
  "Maersk",
  "Majestic Line",
  "Maxicon Shipping Agencies",
  "MSC",
  "NAVIO",
  "NAVIS",
  "Novel Lines",
  "ONE",
  "OOCL",
  "PIL",
  "POSEIDON SHIPPING",
  "RCL LINE",
  "Samsara Group",
  "SCI",
  "SeaLead Shipping",
  "Seahorse Ship Agencies Pvt Ltd",
  "Sinokor Merchant",
  "Trans Asia",
  "Transafe Global Limited",
  "Transworld Group",
  "TS Lines",
  "Turkon Line",
  "UAFL",
  "Unifeeder",
  "UNITED LINER",
  "Wan Hai",
  "WINOCEAN Maritime Pvt. Ltd.",
  "WINWIN Lines",
  "Yang Ming",
  "Z LINE",
  "ZIM",
];

/**
 * Get all available shipping lines
 * @returns {Array<string>} Array of shipping line names sorted alphabetically
 */
export const getShippingLinesForPOD = () => {
  // Remove duplicates and sort alphabetically
  const uniqueLines = [...new Set(SHIPPING_LINES)];
  return uniqueLines.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
};

/**
 * Search shipping lines by name
 * @param {string} searchTerm - The search term to filter shipping lines
 * @returns {Array<string>} Filtered array of shipping line names
 */
export const searchShippingLines = (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return getShippingLinesForPOD();
  }

  const term = searchTerm.toLowerCase().trim();
  return getShippingLinesForPOD().filter((line) =>
    line.toLowerCase().includes(term),
  );
};

/**
 * Check if a shipping line exists in the master list
 * @param {string} lineName - The shipping line name to check
 * @returns {boolean} True if the shipping line exists
 */
export const isValidShippingLine = (lineName) => {
  if (!lineName || typeof lineName !== "string") return false;

  const allLines = getShippingLinesForPOD();
  return allLines.some(
    (line) => line.toLowerCase() === lineName.toLowerCase().trim(),
  );
};

/**
 * Get shipping line statistics
 * @returns {object} Object containing statistics about shipping lines
 */
export const getShippingLineStats = () => {
  const allLines = getShippingLinesForPOD();

  return {
    total: allLines.length,
    categories: {
      majorLines: allLines.filter((line) =>
        [
          "Maersk",
          "MSC",
          "CMA CGM",
          "COSCO",
          "Hapag-Lloyd",
          "EVERGREEN",
          "Yang Ming",
          "HMM",
          "OOCL",
          "PIL",
        ].some((major) => line.toLowerCase().includes(major.toLowerCase())),
      ).length,
      regionalLines: allLines.filter((line) =>
        ["Aegon", "Hub & Link", "WINOCEAN", "Winwin", "Seahorse"].some(
          (regional) => line.toLowerCase().includes(regional.toLowerCase()),
        ),
      ).length,
    },
  };
};

// Export the master list for direct access if needed
export { SHIPPING_LINES as MASTER_SHIPPING_LINES };

// Default export
export default getShippingLinesForPOD;
