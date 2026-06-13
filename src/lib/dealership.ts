/** Single source of truth for dealership business info used across the site. */
export const DEALERSHIP = {
  name: "RydeTime Auto",
  legalName: "RydeTime Auto",
  address: {
    street: "1913 Holland Road",
    city: "Suffolk",
    state: "VA",
    zip: "23434",
    full: "1913 Holland Road, Suffolk, VA 23434",
  },
  phone: "(757) 937-8664",
  phoneHref: "tel:+17579378664",
  smsHref: "sms:+17579378664",
  email: "info@rydetimeauto.com",
  hours: [
    { days: "Monday – Friday", hours: "10AM – 6PM" },
    { days: "Saturday", hours: "10AM – 5PM" },
    { days: "Sunday", hours: "Closed" },
  ],
  hoursShort: "Mon-Fri 10AM-6PM, Sat 10AM-5PM, Sun Closed",
  serviceAreas: [
    "Suffolk",
    "Virginia Beach",
    "Chesapeake",
    "Norfolk",
    "Portsmouth",
    "Hampton Roads",
    "Northeastern North Carolina",
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://rydetimeauto.com",
  geo: { latitude: 36.7282, longitude: -76.6105 },
} as const;

export const HOW_WE_PREPARE_COPY =
  "At RydeTime Auto, we know people are buying used vehicles, not brand-new ones. Our goal is to be clear, helpful, and realistic about what we sell. Before a vehicle is offered for sale, we review it for obvious drivability, safety, and comfort concerns. When we notice issues such as warning lights, window problems, A/C concerns, radio problems, or other visible problems, we work to address them before sale. Every vehicle is sent through Virginia state inspection. Many vehicles may receive an oil change or additional maintenance depending on recent service history, timing, and vehicle condition. Because every used vehicle is different, we encourage customers to review the Carfax when available, ask questions, inspect the vehicle, take a test drive, and make sure the vehicle feels right for their needs.";

export const FOOTER_DISCLAIMER =
  "Prices exclude taxes, title, registration, documentation fees, and any other applicable fees. Payment estimates are for informational purposes only. Financing is not guaranteed and is subject to credit approval. Vehicle availability subject to prior sale. Vehicle information believed accurate but not guaranteed — verify all details with dealership prior to purchase.";

export const PAYMENT_DISCLAIMER =
  "Payment estimates are for informational purposes only and do not constitute a financing offer. Actual terms depend on credit approval, lender, and down payment. Taxes, title, registration, and fees not included.";

export const VEHICLE_INFO_DISCLAIMER =
  "Vehicle information is believed accurate but not guaranteed. Please verify all details with the dealership prior to purchase.";

export const AI_DISCLAIMER =
  "AI assistant may make mistakes. Always confirm details with the dealership.";
