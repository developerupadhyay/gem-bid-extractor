export interface DocumentLinkItem {
  page: number;
  type: string;        // e.g. "Specification Document", "BOQ Detail Document"
  title: string;       // e.g. Item title or surrounding heading
  url: string;         // target download/view URL
  isDownloadable: boolean;
}

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
  documentLinks?: string;
  extractedLinksList?: DocumentLinkItem[];
}

export interface FieldDefinition {
  key: keyof GeMBidData;
  label: string;
  category: "Overview" | "Relaxations" | "Technical Specifications" | "Consignee & Delivery" | "Links & References";
}

export const BID_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "bidNumber",
    label: "Bid Number",
    category: "Overview",
  },
  {
    key: "bidEndDateTime",
    label: "Bid End Date/Time",
    category: "Overview",
  },
  {
    key: "totalQuantity",
    label: "Total Quantity",
    category: "Overview",
  },
  {
    key: "officeName",
    label: "Office Name",
    category: "Overview",
  },
  {
    key: "mseRelaxation",
    label: "MSE Relaxation for Years Of Experience and Turnover",
    category: "Relaxations",
  },
  {
    key: "startupRelaxation",
    label: "Startup Relaxation for Years Of Experience and Turnover",
    category: "Relaxations",
  },
  {
    key: "cableFireClassification",
    label: "Classification of cables for improved fire performace category",
    category: "Technical Specifications",
  },
  {
    key: "nominalAreaOfConductor",
    label: "Nominal Area of Conductor",
    category: "Technical Specifications",
  },
  {
    key: "numberOfCore",
    label: "Number of core",
    category: "Technical Specifications",
  },
  {
    key: "materialOfConductor",
    label: "Material of conductor",
    category: "Technical Specifications",
  },
  {
    key: "typeOfCable",
    label: "Type of cable",
    category: "Technical Specifications",
  },
  {
    key: "consigneeReportingOfficer",
    label: "Consignee Reporting/Officer",
    category: "Consignee & Delivery",
  },
  {
    key: "address",
    label: "Address",
    category: "Consignee & Delivery",
  },
  {
    key: "deliveryDays",
    label: "Delivery Days",
    category: "Consignee & Delivery",
  },
  {
    key: "documentLinks",
    label: "Document Links & Downloads",
    category: "Links & References",
  },
];
