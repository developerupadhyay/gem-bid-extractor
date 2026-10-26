export interface GeMBidData {
  bidNumber: string;
  bidEndDateTime: string;
  totalQuantity: string;
  officeName: string;
  mseRelaxation: string;
  startupRelaxation: string;
  cableFireClassification: string;
  nominalAreaOfConductor: string;
  numberOfCore: string;
  materialOfConductor: string;
  typeOfCable: string;
  consigneeReportingOfficer: string;
  address: string;
  deliveryDays: string;
}

export interface FieldDefinition {
  key: keyof GeMBidData;
  label: string;
  hindiLabel?: string;
  category: "Overview" | "Relaxations" | "Technical Specifications" | "Consignee & Delivery";
}

export const BID_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "bidNumber",
    label: "Bid Number",
    hindiLabel: "बिड संख्या",
    category: "Overview",
  },
  {
    key: "bidEndDateTime",
    label: "Bid End Date/Time",
    hindiLabel: "बिड बंद होने की तारीख/समय",
    category: "Overview",
  },
  {
    key: "totalQuantity",
    label: "Total Quantity",
    hindiLabel: "कुल मात्रा",
    category: "Overview",
  },
  {
    key: "officeName",
    label: "Office Name",
    hindiLabel: "कार्यालय का नाम",
    category: "Overview",
  },
  {
    key: "mseRelaxation",
    label: "MSE Relaxation for Years Of Experience and Turnover",
    hindiLabel: "एमएसई को छूट",
    category: "Relaxations",
  },
  {
    key: "startupRelaxation",
    label: "Startup Relaxation for Years Of Experience and Turnover",
    hindiLabel: "स्टार्टअप के लिए छूट",
    category: "Relaxations",
  },
  {
    key: "cableFireClassification",
    label: "Classification of cables for improved fire performace category",
    hindiLabel: "केबल अग्निशमन प्रदर्शन श्रेणी",
    category: "Technical Specifications",
  },
  {
    key: "nominalAreaOfConductor",
    label: "Nominal Area of Conductor",
    hindiLabel: "कंडक्टर का नाममात्र क्षेत्रफल",
    category: "Technical Specifications",
  },
  {
    key: "numberOfCore",
    label: "Number of core",
    hindiLabel: "कोर की संख्या",
    category: "Technical Specifications",
  },
  {
    key: "materialOfConductor",
    label: "Material of conductor",
    hindiLabel: "कंडक्टर की सामग्री",
    category: "Technical Specifications",
  },
  {
    key: "typeOfCable",
    label: "Type of cable",
    hindiLabel: "केबल का प्रकार",
    category: "Technical Specifications",
  },
  {
    key: "consigneeReportingOfficer",
    label: "Consignee Reporting/Officer",
    hindiLabel: "परेषिती/रिपोर्टिंग अधिकारी",
    category: "Consignee & Delivery",
  },
  {
    key: "address",
    label: "Address",
    hindiLabel: "वितरण का पता",
    category: "Consignee & Delivery",
  },
  {
    key: "deliveryDays",
    label: "Delivery Days",
    hindiLabel: "डिलीवरी के दिन",
    category: "Consignee & Delivery",
  },
];
