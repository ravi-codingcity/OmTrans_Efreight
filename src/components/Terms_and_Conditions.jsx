// Terms and Conditions Data for Quotation Segments

// Common terms shown for all segments
export const commonTerms = [
  "Above rates are subject to booking and space confirmation.",
  "Transit insurance will be in the shipper/consignee's account.",
  "OmTrans will not be responsible for any insurance claim.",
  "All receipted and incidental charges will be charged as actuals.",
];

// Terms-based conditions for Sea Export segments (FCL, LCL, Break Bulk)
export const termsBasedConditions = {
  "Ex-WORK": [
    "5% GST on freight and 18% on other charges will be applicable.",
    "Transit insurance will be in the shipper/consignee's account.",
    "OmTrans will not be responsible for any insurance claim.",
    "Above quote is based on factory stuffing.",
    "Above rates are port-to-port basis and subject to destination local charges.",
    "Receipted or incidental charges will be charged as actuals.",
    "Transportation rates are subject to revision in case of fuel hike.",
    "8 hours free for loading/offloading thereafter ₹3500/day per trailer detention will be charged.",
  ],
  CIF: [
    "Freight rates are subject to equipment and space availability.",
    "Transit insurance will be in the customer's account; OmTrans will not be responsible for any claim.",
    "Freight is valid until 31st December (vessel sailing).",
    "Rates are subject to destination local charges and are valid on a port-to-port basis.",
    "Standard free time at destination applies.",
    "Any customs hold or examination charges will be billed as actuals and are not part of the quotation.",
    "Storage or detention charges will be billed as actuals.",
    "Any incidental charges will be subject to prior approval.",
    "GST will be charged as per government guidelines.",
  ],
  DAP: [
    "Freight rates are subject to equipment and space availability.",
    "Transit insurance will be in the customer's account; OmTrans will not be responsible for any claim.",
    "2 hours free for offloading; thereafter €100 per half-hour detention will apply.",
    "Customs duty, HMF, and MPF will be charged as actuals.",
    "Any customs hold or examination charges will be billed as actuals and are not part of the quotation.",
    "Storage or detention charges will be billed as actuals.",
    "Any incidental charges will be subject to prior approval.",
    "GST will be charged as per government guidelines.",
    "Offloading and customs clearance will be in the consignee's account.",
    "Any bond cost and ISF filing charges will be extra.",
  ],
};

// Segment-specific terms
export const segmentTerms = {
  "Sea Import FCL": [
    "GST 5% on freight & 18% on other charges will be applicable as per Indian government regulations. GST will not apply if billing is to a foreign party.",
    "Exchange rate will be charged as per carrier or bank rate.",
    "Shipping line charges are tentative and subject to current tariff and receipts.",
    "CONCOR/CFS charges will be billed as actuals.",
    "8 hours free for offloading thereafter ₹4000/day per trailer detention will apply.",
    "Empty return to ICD Dadri will be charged extra (approx. ₹4000/40') when destination delivery is included.",
    "Quotation not valid for ODC & HAZ cargo.",
    "All duties, taxes, and incidental charges will be billed as actuals.",
    "Rates are subject to origin local charges.",
    "Rates are subject to storage, inspection, fumigation, COO, and destination duties/taxes.",
  ],
  "Sea Import LCL": [
    "GST 5% on freight & 18% on other charges will be applicable as per Indian government regulations. GST will not apply if billing is to a foreign party.",
    "Exchange rate will be charged as per carrier or bank rate.",
    "Shipping line charges are tentative and subject to current tariff and receipts.",
    "CONCOR/CFS charges will be billed as actuals.",
    "8 hours free for offloading thereafter ₹4000/day per trailer detention will apply.",
    "Empty return to ICD Dadri will be charged extra (approx. ₹4000/40') when destination delivery is included.",
    "Quotation not valid for ODC & HAZ cargo.",
    "All duties, taxes, and incidental charges will be billed as actuals.",
    "Rates are subject to origin local charges.",
    "Rates are subject to storage, inspection, fumigation, COO, and destination duties/taxes.",
  ],
  "Sea Import Break Bulk": [
    "GST 5% on freight & 18% on other charges will be applicable as per Indian government regulations. GST will not apply if billing is to a foreign party.",
    "Exchange rate will be charged as per carrier or bank rate.",
    "Shipping line charges are tentative and subject to current tariff and receipts.",
    "Port handling and stevedoring charges will be billed as actuals.",
    "Quotation not valid for HAZ cargo.",
    "All duties, taxes, and incidental charges will be billed as actuals.",
    "Rates are subject to origin local charges.",
  ],
  "Air Import": [
    "GST 5% on freight & 18% on other charges will be applicable as per Indian government regulations. GST will not apply if billing is to a foreign party.",
    "Exchange rate will be charged as per airline or bank rate.",
    "Airline charges are tentative and subject to current tariff and receipts.",
    "Airport THC and storage charges will be billed as actuals.",
    "8 hours free for offloading thereafter ₹4000/day per vehicle detention applies.",
    "Quotation not valid for ODC & HAZ cargo.",
    "All duties, taxes, and incidental charges will be billed as actuals.",
    "Rates are subject to origin local charges.",
    "Rates are subject to storage, inspection, COO, destination duties, taxes, and CONCOR charges.",
  ],
  "Air Export": [
    "GST 5% on freight & 18% on other charges will be applicable as per Indian government regulations. GST will not apply if billing is to a foreign party.",
    "Exchange rate will be charged as per airline or bank rate.",
    "Airline charges are tentative and subject to current tariff and receipts.",
    "Airport THC and storage charges will be billed as actuals.",
    "8 hours free for loading thereafter ₹4000/day per vehicle detention applies.",
    "Quotation not valid for ODC & HAZ cargo.",
    "All duties, taxes, and incidental charges will be billed as actuals.",
    "Rates are subject to origin local charges.",
    "Rates are subject to storage, COO, inspection, destination duties, and taxes.",
  ],
  "Service Job": [
    "Service charges are subject to scope of work confirmation.",
    "Any additional work beyond agreed scope will be charged extra.",
    "All government fees, duties, and taxes will be billed as actuals.",
  ],
};

// All available terms for auto-suggestion (combined unique list)
export const allAvailableTerms = [
  // Common terms
  ...commonTerms,
  // Terms-based conditions
  ...Object.values(termsBasedConditions).flat(),
  // All segment-specific terms (unique)
  "Exchange rate will be charged as per carrier or bank rate.",
  "Exchange rate will be charged as per airline or bank rate.",
  "Shipping line charges are tentative and subject to current tariff and receipts.",
  "Airline charges are tentative and subject to current tariff and receipts.",
  "CONCOR/CFS charges will be billed as actuals.",
  "Airport THC and storage charges will be billed as actuals.",
  "8 hours free for offloading thereafter ₹4000/day per trailer detention will apply.",
  "8 hours free for offloading thereafter ₹4000/day per vehicle detention applies.",
  "8 hours free for loading thereafter ₹4000/day per trailer detention will apply.",
  "8 hours free for loading thereafter ₹4000/day per vehicle detention applies.",
  "Empty return to ICD Dadri will be charged extra (approx. ₹4000/40) when destination delivery is included.",
  "Quotation not valid for ODC & HAZ cargo.",
  "Quotation not valid for HAZ cargo.",
  "All duties, taxes, and incidental charges will be billed as actuals.",
  "Rates are subject to origin local charges.",
  "Rates are subject to destination local charges.",
  "Rates are subject to storage, inspection, fumigation, COO, and destination duties/taxes.",
  "Rates are subject to storage, inspection, COO, destination duties, taxes, and CONCOR charges.",
  "Rates are subject to storage, COO, inspection, destination duties, and taxes.",
  "Port handling and stevedoring charges will be billed as actuals.",
  "Service charges are subject to scope of work confirmation.",
  "Any additional work beyond agreed scope will be charged extra.",
  "All government fees, duties, and taxes will be billed as actuals.",
  "Freight rates are subject to equipment and space availability.",
  "Payment terms: As per agreed contract.",
  "This quotation is valid for 30 days from the date of issue.",
  "Demurrage and detention charges as per shipping line tariff.",
  "Free time at destination port as per shipping line terms.",
  "Cargo insurance to be arranged by shipper/consignee.",
  "Hazardous cargo surcharges will apply if applicable.",
  "Peak season surcharges may apply.",
  "Bunker adjustment factor (BAF) subject to change.",
  "Currency adjustment factor (CAF) subject to change.",
  "War risk surcharge subject to change.",
  "Piracy surcharge subject to change for affected routes.",
].sort();

// Sea Export segments that use terms-based filtering
export const seaExportSegments = [
  "Sea Export FCL",
  "Sea Export LCL",
  "Sea Export Break Bulk",
];

// Helper function to get terms for a specific segment and terms option
export const getTermsForSegment = (segment, termsOption = null) => {
  // Check if this is a Sea Export segment and a terms option is provided
  if (
    seaExportSegments.includes(segment) &&
    termsOption &&
    termsBasedConditions[termsOption]
  ) {
    return [...commonTerms, ...termsBasedConditions[termsOption]];
  }

  // Otherwise, use segment-specific terms
  const specificTerms = segmentTerms[segment] || [];
  return [...commonTerms, ...specificTerms];
};

export default {
  commonTerms,
  segmentTerms,
  termsBasedConditions,
  allAvailableTerms,
  getTermsForSegment,
  seaExportSegments,
};
