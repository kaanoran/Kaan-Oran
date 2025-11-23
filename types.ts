
export enum OrderStatus {
  DRAFT = 'Taslak',
  PENDING = 'Onay Bekliyor',
  APPROVED = 'Onaylandı',
  IN_PRODUCTION = 'Üretimde',
  IN_TRANSIT = 'Yolda',
  PARTIAL = 'Kısmi Teslim',
  SHIPPED = 'Kargoya Verildi',
  DELIVERED = 'Tamamlandı'
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface Delivery {
  id: string;
  date: string;
  quantity: number;
  note?: string;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ProductSpecs {
  // Dış Ambalaj
  outerMaterial: string; 
  outerDimensions: Dimensions; 
  outerLayerCount: number; 
  printColors: number; 
  lamination: 'Parlak' | 'Mat' | 'Kısmi Lak';
  
  // İç Havlu
  towelMaterial: string; 
  towelGsm: number; 
  towelDimensionsOpen: Dimensions; 
  
  // Solüsyon (Sıvı)
  essenceName: string; 
  essenceAmount: number; 
  alcoholFree: boolean;
  
  // Kutu/Koli
  piecesPerBox: number; 
}

export interface OrderItem {
  id: string;
  specs: ProductSpecs;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
  deliveries: Delivery[];
  imageUrl?: string; // Added image URL support for individual items
}

export interface Financials {
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  subTotal: number; // Sum of items total price
  vatRate: number; 
  totalAmount: number; // subTotal + VAT
  downPayment: number; 
}

export interface ClientInfo {
  companyName: string;
  contactPerson: string;
  phone: string;
  taxId?: string;
  email?: string;
  
  // New structured address
  addressStreet?: string;
  addressDoorNo?: string;
  addressPostCode?: string;
  addressCity?: string;
}

export interface Customer {
  id: string;
  info: ClientInfo;
  notes: string; 
  tags: string[];
}

export interface CatalogItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string; // Added image URL support
  specs: ProductSpecs;
  basePrice?: number;
}

export interface Order {
  id: string;
  customerId?: string; 
  client: ClientInfo; 
  items: OrderItem[]; // Supports multiple products per order
  financials: Financials;
  orderDate: string;
  estimatedDeliveryDate: string;
  notes: string; 
  status: OrderStatus;
  paymentHistory?: PaymentTransaction[];
}
