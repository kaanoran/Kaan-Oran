
import React, { useState, useEffect } from 'react';
import Layout, { TabType } from './components/Layout';
import OrderList from './components/OrderList';
import CreateOrder from './components/CreateOrder';
import CustomerList from './components/CustomerList';
import ProductCatalog from './components/ProductCatalog';
import Reports from './components/Reports';
import { Order, OrderStatus, Customer, CatalogItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic Options (Dropdowns that can be added to)
  const [customMaterials, setCustomMaterials] = useState<string[]>([]);
  const [customTowelTypes, setCustomTowelTypes] = useState<string[]>([]);

  // Temporary state to hold product spec when moving from Catalog -> New Order
  const [selectedCatalogSpec, setSelectedCatalogSpec] = useState<any>(null);

  // --- MOCK DATA GENERATORS ---
  const generateMockData = () => {
    const daysAgo = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString();
    };

    const customers: Customer[] = [
        { id: 'c1', tags: ['Restoran'], notes: 'Cuma günleri aranmalı.', info: { companyName: 'Lezzet Kebap Dünyası', contactPerson: 'Ahmet Yılmaz', phone: '0532 100 0001', email: 'ahmet@lezzetkebap.com', addressStreet: 'Bağdat Caddesi', addressDoorNo: 'No: 12', addressPostCode: '34000', addressCity: 'İstanbul' } },
        { id: 'c2', tags: ['Otel'], notes: 'Lobi için özel koku.', info: { companyName: 'Grand Royal Hotel', contactPerson: 'Selin Demir', phone: '0212 200 0002', email: 'info@grandroyal.com', addressStreet: 'Çırağan Cd.', addressDoorNo: 'No: 55', addressPostCode: '34349', addressCity: 'İstanbul' } },
        { id: 'c3', tags: ['Hastane'], notes: 'Steril ürün hassasiyeti.', info: { companyName: 'Özel Şifa Hastanesi', contactPerson: 'Dr. Kemal Can', phone: '0216 300 0003', email: 'satinalma@sifa.com', addressStreet: 'E-5 Yan Yol', addressDoorNo: 'No: 10', addressPostCode: '34800', addressCity: 'İstanbul' } },
        { id: 'c4', tags: ['Zincir'], notes: 'Yüksek hacim çalışıyorlar.', info: { companyName: 'Burger King Franchise', contactPerson: 'Murat Bey', phone: '0544 400 0004', email: 'murat@franchise.com', addressStreet: 'Alemdağ Cad.', addressDoorNo: 'No: 120', addressPostCode: '34700', addressCity: 'İstanbul' } },
        { id: 'c5', tags: ['Benzinlik'], notes: 'Promosyon ürünleri.', info: { companyName: 'Opet İstasyonları A.Ş.', contactPerson: 'Veli Usta', phone: '0216 500 0005', email: 'veli@opetbayi.com', addressStreet: 'Libadiye Cd.', addressDoorNo: 'No: 88', addressPostCode: '34600', addressCity: 'İstanbul' } },
        { id: 'c6', tags: ['Cafe'], notes: 'Limon kokulu istiyorlar.', info: { companyName: 'Mado Bostancı', contactPerson: 'Ayşe Hanım', phone: '0216 600 0006', email: 'ayse@mado.com', addressStreet: 'Sahil Yolu', addressDoorNo: 'No: 4', addressPostCode: '34744', addressCity: 'İstanbul' } },
        { id: 'c7', tags: ['Kozmetik'], notes: 'Makyaj temizleme mendili.', info: { companyName: 'Güzellik Merkezi Ltd.', contactPerson: 'Beren Soylu', phone: '0555 700 0007', email: 'beren@guzellik.com', addressStreet: 'Nişantaşı', addressDoorNo: 'No: 21', addressPostCode: '34365', addressCity: 'İstanbul' } },
        { id: 'c8', tags: ['Spor Salonu'], notes: 'Ter havlusu.', info: { companyName: 'MacFit Club', contactPerson: 'Caner Bey', phone: '0212 800 0008', email: 'info@macfit.com', addressStreet: 'Maslak', addressDoorNo: 'No: 99', addressPostCode: '34500', addressCity: 'İstanbul' } },
        { id: 'c9', tags: ['Ulaşım'], notes: 'Otobüs ikramı.', info: { companyName: 'Kamil Koç A.Ş.', contactPerson: 'Operasyon Md.', phone: '0212 900 0009', email: 'ops@kamilkoc.com', addressStreet: 'Otogar', addressDoorNo: 'No: 1', addressPostCode: '34200', addressCity: 'İstanbul' } },
        { id: 'c10', tags: ['Catering'], notes: 'Düğün organizasyonları.', info: { companyName: 'Elegance Catering', contactPerson: 'Zeynep Kaya', phone: '0533 000 0010', email: 'zeynep@elegance.com', addressStreet: 'Kavacık', addressDoorNo: 'No: 5', addressPostCode: '34810', addressCity: 'İstanbul' } },
    ];

    const allStatuses = [
        OrderStatus.DRAFT,
        OrderStatus.PENDING,
        OrderStatus.APPROVED,
        OrderStatus.IN_PRODUCTION,
        OrderStatus.IN_TRANSIT,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.PARTIAL
    ];

    const orders: Order[] = [];

    customers.forEach((cust, index) => {
        // Distribute statuses: Cycle through available statuses
        const status = allStatuses[index % allStatuses.length];
        
        // Product Logic
        // Base quantities: 10,000 to 50,000
        const quantity = 10000 + (index * 5000); 
        const unitPrice = 0.045; // Fixed reasonable price
        const subTotal = quantity * unitPrice; // e.g. 10,000 * 0.045 = 450
        const vatRate = 20;
        const vatAmount = subTotal * 0.20; // 450 * 0.2 = 90
        const totalAmount = subTotal + vatAmount; // 450 + 90 = 540
        
        // Payment Logic based on status
        let downPayment = 0;
        let history = [];
        let deliveryDate = daysAgo(-10); // Future date default
        let deliveredQty = 0;

        // Customize based on status
        if (status === OrderStatus.PENDING || status === OrderStatus.DRAFT) {
            downPayment = 0;
        } else if (status === OrderStatus.APPROVED || status === OrderStatus.IN_PRODUCTION) {
            // Usually 30-50% down payment received
            downPayment = Math.round(totalAmount * 0.30);
            history.push({ id: `pay_${index}_1`, date: daysAgo(5), amount: downPayment, note: 'Sipariş Onayı (Peşinat)' });
        } else if (status === OrderStatus.IN_TRANSIT || status === OrderStatus.SHIPPED) {
             downPayment = Math.round(totalAmount * 0.50);
             history.push({ id: `pay_${index}_1`, date: daysAgo(10), amount: downPayment, note: 'Peşinat' });
             deliveryDate = daysAgo(-2); // Arriving soon
        } else if (status === OrderStatus.DELIVERED) {
             downPayment = Math.round(totalAmount * 0.30);
             const finalPay = totalAmount - downPayment;
             history.push({ id: `pay_${index}_1`, date: daysAgo(20), amount: downPayment, note: 'Peşinat' });
             history.push({ id: `pay_${index}_2`, date: daysAgo(1), amount: finalPay, note: 'Bakiye Kapama' });
             deliveredQty = quantity;
             deliveryDate = daysAgo(1);
        } else if (status === OrderStatus.PARTIAL) {
             downPayment = Math.round(totalAmount * 0.60);
             history.push({ id: `pay_${index}_1`, date: daysAgo(15), amount: downPayment, note: 'Kısmi Tahsilat' });
             deliveredQty = Math.floor(quantity / 2);
        }

        orders.push({
            id: `100${index + 1}`, // 1001, 1002...
            customerId: cust.id,
            client: cust.info,
            orderDate: daysAgo(10 + index),
            estimatedDeliveryDate: deliveryDate,
            status: status,
            notes: cust.notes,
            financials: {
                currency: 'GBP',
                subTotal: subTotal,
                vatRate: vatRate,
                totalAmount: totalAmount,
                downPayment: 0 // We track payments in history mostly, but keep 0 here for clean logic
            },
            paymentHistory: history,
            items: [{
                id: `item_${index}`,
                imageUrl: `https://source.unsplash.com/random/200x200?wetwipe&sig=${index}`,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: subTotal, // Ensure item total matches subTotal for single item orders
                deliveries: deliveredQty > 0 ? [{ id: `del_${index}`, date: daysAgo(0), quantity: deliveredQty }] : [],
                specs: {
                    outerMaterial: index % 2 === 0 ? 'Kuşe + PE' : 'Triplex (PET/ALU/PE)',
                    outerDimensions: { width: 6, height: 10 + (index % 3) },
                    outerLayerCount: 3,
                    printColors: 4,
                    lamination: index % 3 === 0 ? 'Mat' : 'Parlak',
                    towelMaterial: 'Nonwoven Spunlace',
                    towelGsm: 40 + (index * 2),
                    towelDimensionsOpen: { width: 15, height: 20 },
                    essenceName: ['Limon', 'Lavanta', 'Dove', 'Okyanus', 'Bambu'][index % 5],
                    essenceAmount: 2.5,
                    alcoholFree: true,
                    piecesPerBox: 1000
                }
            }]
        });
    });

    return { customers, orders };
  };

  const getMockCatalog = (): CatalogItem[] => [
        {
            id: 'p1',
            title: 'Standart Restoran Mendili',
            description: 'Uygun fiyatlı, yüksek sirkülasyonlu işletmeler için ideal.',
            basePrice: 0.045,
            imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=300&h=200',
            specs: {
                outerMaterial: 'Kuşe + PE',
                outerDimensions: { width: 6, height: 10 },
                outerLayerCount: 2,
                printColors: 2,
                lamination: 'Parlak',
                towelMaterial: 'Nonwoven Spunlace',
                towelGsm: 40,
                towelDimensionsOpen: { width: 13, height: 18 },
                essenceName: 'Klasik Limon',
                essenceAmount: 2,
                alcoholFree: true,
                piecesPerBox: 1000
            }
        },
        {
            id: 'p2',
            title: 'Premium Metalize Mendil',
            description: 'Lüks restoranlar ve oteller için şık görünüm.',
            basePrice: 0.120,
            imageUrl: 'https://images.unsplash.com/photo-1629196914375-f7e48f477b6d?auto=format&fit=crop&q=80&w=300&h=200',
            specs: {
                outerMaterial: 'Triplex (PET/ALU/PE)',
                outerDimensions: { width: 7, height: 12 },
                outerLayerCount: 3,
                printColors: 4,
                lamination: 'Mat',
                towelMaterial: 'Airlaid',
                towelGsm: 55,
                towelDimensionsOpen: { width: 16, height: 20 },
                essenceName: 'Dove / Özel Parfüm',
                essenceAmount: 3,
                alcoholFree: true,
                piecesPerBox: 500
            }
        },
        {
            id: 'p3',
            title: 'Antibakteriyel Hastane Mendili',
            description: 'Sağlık kuruluşları için sertifikalı üretim.',
            basePrice: 0.060,
            imageUrl: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&q=80&w=300&h=200',
            specs: {
                outerMaterial: 'Triplex',
                outerDimensions: { width: 6, height: 10 },
                outerLayerCount: 3,
                printColors: 2,
                lamination: 'Mat',
                towelMaterial: 'Nonwoven Spunlace',
                towelGsm: 50,
                towelDimensionsOpen: { width: 14, height: 18 },
                essenceName: 'Antibakteriyel Solüsyon',
                essenceAmount: 3,
                alcoholFree: false,
                piecesPerBox: 1000
            }
        }
    ];

  // --- STATE INITIALIZATION WITH PERSISTENCE (V4 KEYS TO FORCE RESET) ---
  // Using 'v4' suffix to force a fresh data generation for the user
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
        const saved = localStorage.getItem('onswipes_customers_v4');
        if (saved) return JSON.parse(saved);
        const { customers } = generateMockData();
        return customers;
    } catch {
        const { customers } = generateMockData();
        return customers;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
        const saved = localStorage.getItem('onswipes_orders_v4');
        if (saved) return JSON.parse(saved);
        const { orders } = generateMockData();
        return orders;
    } catch {
        const { orders } = generateMockData();
        return orders;
    }
  });

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => {
      try {
          const saved = localStorage.getItem('onswipes_catalog_v4');
          return saved ? JSON.parse(saved) : getMockCatalog();
      } catch {
          return getMockCatalog();
      }
  });


  // --- PERSISTENCE EFFECTS ---
  
  useEffect(() => {
      localStorage.setItem('onswipes_customers_v4', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
      localStorage.setItem('onswipes_orders_v4', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
      localStorage.setItem('onswipes_catalog_v4', JSON.stringify(catalogItems));
  }, [catalogItems]);


  // --- HANDLERS ---

  const handleSaveOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    setActiveTab('dashboard');
    setSelectedCatalogSpec(null); // Reset catalog selection
    setSearchQuery('');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleSelectOrder = (order: Order) => {
    // Handled in OrderList
  };

  const handleAddCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    setSearchQuery('');
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  };

  const handleCatalogSelect = (item: CatalogItem) => {
    setSelectedCatalogSpec(item.specs);
    setActiveTab('new-order');
    setSearchQuery('');
  };

  const handleUpdateCatalogItem = (updatedItem: CatalogItem) => {
    setCatalogItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleAddCatalogItem = (newItem: CatalogItem) => {
    setCatalogItems(prev => [...prev, newItem]);
    setSearchQuery('');
  };

  return (
    <Layout 
        activeTab={activeTab} 
        onNavigate={(tab) => {
            setActiveTab(tab);
            if(tab !== 'new-order') setSelectedCatalogSpec(null);
            setSearchQuery(''); // Clear search on tab change
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
    >
      {activeTab === 'dashboard' && (
        <OrderList 
            orders={orders} 
            searchQuery={searchQuery}
            onSelectOrder={handleSelectOrder} 
            onUpdateOrder={handleUpdateOrder}
        />
      )}
      
      {activeTab === 'customers' && (
        <CustomerList 
            customers={customers} 
            orders={orders}
            searchQuery={searchQuery}
            onAddCustomer={handleAddCustomer} 
            onEditCustomer={handleEditCustomer} 
        />
      )}

      {activeTab === 'catalog' && (
        <ProductCatalog 
            items={catalogItems} 
            searchQuery={searchQuery}
            onSelectProduct={handleCatalogSelect} 
            onUpdateProduct={handleUpdateCatalogItem}
            onAddProduct={handleAddCatalogItem}
            customMaterials={customMaterials}
            customTowelTypes={customTowelTypes}
            onAddCustomMaterial={(m) => setCustomMaterials([...customMaterials, m])}
            onAddCustomTowelType={(t) => setCustomTowelTypes([...customTowelTypes, t])}
        />
      )}

      {activeTab === 'new-order' && (
        <CreateOrder 
            onSave={handleSaveOrder} 
            onCancel={() => {
                setActiveTab('dashboard');
                setSelectedCatalogSpec(null);
            }} 
            customers={customers}
            catalogItems={catalogItems} // Pass catalog items for dropdown
            initialProductSpecs={selectedCatalogSpec}
            customMaterials={customMaterials}
            customTowelTypes={customTowelTypes}
            onAddCustomMaterial={(m) => setCustomMaterials([...customMaterials, m])}
            onAddCustomTowelType={(t) => setCustomTowelTypes([...customTowelTypes, t])}
        />
      )}

      {activeTab === 'reports' && (
        <Reports orders={orders} />
      )}
    </Layout>
  );
};

export default App;
