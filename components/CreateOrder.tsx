
import React, { useState, useEffect } from 'react';
import { Order, ProductSpecs, ClientInfo, Financials, OrderStatus, Customer, OrderItem, CatalogItem } from '../types';
import { suggestSpecs, analyzeOrderProfitability } from '../services/geminiService';
import { Wand2, Save, Calculator, AlertCircle, CheckCircle2, Loader2, Users, Calendar, Plus, Trash2, Box, BookOpen, Image as ImageIcon } from 'lucide-react';

interface CreateOrderProps {
  onSave: (order: Order) => void;
  onCancel: () => void;
  customers: Customer[];
  catalogItems?: CatalogItem[]; // Added prop
  initialProductSpecs?: ProductSpecs | null; 
  customMaterials?: string[];
  customTowelTypes?: string[];
  onAddCustomMaterial?: (m: string) => void;
  onAddCustomTowelType?: (t: string) => void;
}

const defaultSpecs: ProductSpecs = {
  outerMaterial: 'Triplex (PET/ALU/PE)',
  outerDimensions: { width: 6, height: 8 },
  outerLayerCount: 3,
  printColors: 4,
  lamination: 'Parlak',
  towelMaterial: 'Nonwoven Spunlace',
  towelGsm: 40,
  towelDimensionsOpen: { width: 14, height: 18 },
  essenceName: 'Limon',
  essenceAmount: 2.5,
  alcoholFree: true,
  piecesPerBox: 1000
};

const CreateOrder: React.FC<CreateOrderProps> = ({ 
  onSave, 
  onCancel, 
  customers, 
  catalogItems = [],
  initialProductSpecs,
  customMaterials = [],
  customTowelTypes = []
}) => {
  const [step, setStep] = useState<number>(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  // Order Data
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [client, setClient] = useState<ClientInfo>({
    companyName: '', contactPerson: '', phone: '', email: '', 
    addressStreet: '', addressDoorNo: '', addressPostCode: '', addressCity: '',
    taxId: ''
  });
  
  // Item Management
  const [items, setItems] = useState<OrderItem[]>([]);
  // Current Item Form State
  const [currentSpecs, setCurrentSpecs] = useState<ProductSpecs>(initialProductSpecs || defaultSpecs);
  const [currentItemPrice, setCurrentItemPrice] = useState<number>(0.045);
  const [currentItemQty, setCurrentItemQty] = useState<number>(10000);
  const [currentItemImage, setCurrentItemImage] = useState<string | undefined>(undefined);

  // Financials
  const [currency, setCurrency] = useState<'GBP'|'TRY'|'USD'|'EUR'>('GBP');
  const [vatRate, setVatRate] = useState(20);
  const [applyVat, setApplyVat] = useState(true);
  const [downPayment, setDownPayment] = useState(0);

  // Dates
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // Handle customer selection
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (custId) {
        const cust = customers.find(c => c.id === custId);
        if (cust) {
            setClient(cust.info);
        }
    } else {
        setClient({ 
            companyName: '', contactPerson: '', phone: '', email: '', 
            addressStreet: '', addressDoorNo: '', addressPostCode: '', addressCity: '',
            taxId: '' 
        });
    }
  };

  const handleCatalogSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const catalogId = e.target.value;
      if (!catalogId) return;
      const item = catalogItems.find(i => i.id === catalogId);
      if (item) {
          setCurrentSpecs(item.specs);
          if (item.basePrice) setCurrentItemPrice(item.basePrice);
          if (item.imageUrl) setCurrentItemImage(item.imageUrl);
          alert(`"${item.title}" şablonu yüklendi.`);
      }
  };

  const handleAddItem = () => {
    const newItem: OrderItem = {
        id: Date.now().toString(),
        specs: { ...currentSpecs },
        quantity: currentItemQty,
        unitPrice: currentItemPrice,
        totalPrice: currentItemQty * currentItemPrice,
        deliveries: [],
        imageUrl: currentItemImage
    };
    setItems([...items, newItem]);
    // Reset form slightly for next item
    setCurrentItemQty(10000);
    // Don't reset specs completely to allow easy variant creation, but maybe reset image?
    // setCurrentItemImage(undefined); 
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleAISuggestion = async () => {
    if (!aiSuggestion.trim()) return;
    setLoadingAI(true);
    try {
      const result = await suggestSpecs(aiSuggestion);
      if (result) {
        setCurrentSpecs(prev => ({
          ...prev,
          outerMaterial: result.outerMaterial || prev.outerMaterial,
          outerDimensions: { 
            width: result.outerWidth || prev.outerDimensions.width, 
            height: result.outerHeight || prev.outerDimensions.height 
          },
          towelGsm: result.towelGsm || prev.towelGsm,
          essenceName: result.essenceName || prev.essenceName,
        }));
        alert(`Öneri Uygulandı: ${result.suggestionReason}`);
      }
    } catch (e) {
      alert("AI önerisi alınamadı.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAnalyzeOrder = async () => {
    setLoadingAI(true);
    const subTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalVat = applyVat ? vatRate : 0;
    const totalAmount = subTotal * (1 + finalVat / 100);

    const mockOrder: Order = {
        id: 'temp',
        client, items, financials: { currency, subTotal, vatRate: finalVat, totalAmount, downPayment },
        orderDate: new Date().toISOString(), estimatedDeliveryDate: deliveryDate, notes, status: OrderStatus.DRAFT
    };
    const analysis = await analyzeOrderProfitability(mockOrder);
    setAiAnalysis(analysis);
    setLoadingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
        alert("Lütfen en az bir ürün ekleyiniz.");
        return;
    }
    const subTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalVat = applyVat ? vatRate : 0;
    const totalAmount = subTotal * (1 + finalVat / 100);

    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: selectedCustomerId || undefined,
      client,
      items,
      financials: {
          currency,
          subTotal,
          vatRate: finalVat,
          totalAmount,
          downPayment
      },
      orderDate: new Date().toISOString(),
      estimatedDeliveryDate: deliveryDate,
      notes,
      status: OrderStatus.PENDING
    };
    onSave(newOrder);
  };

  const inputClass = "w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-2 border bg-white text-slate-900 placeholder-slate-400";

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-12">
      
      {/* Stepper */}
      <div className="flex items-center justify-center mb-8 space-x-4">
        {[1, 2, 3].map(i => (
          <button
            type="button"
            key={i}
            onClick={() => setStep(i)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
              step === i ? 'bg-primary text-white ring-4 ring-primary/20' : 
              step > i ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {step > i ? <CheckCircle2 size={20} /> : i}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Step 1: Client Info */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Müşteri Seçimi</h2>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
                    <Users size={16} /> Kayıtlı Müşteriden Seç
                </label>
                <select 
                    className={`${inputClass} border-indigo-200 focus:ring-indigo-500`}
                    value={selectedCustomerId}
                    onChange={handleCustomerSelect}
                >
                    <option value="">-- Yeni Müşteri Girişi --</option>
                    {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.info.companyName} - {c.info.contactPerson}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Firma Adı</label>
                <input required type="text" className={inputClass} value={client.companyName} onChange={e => setClient({...client, companyName: e.target.value})} disabled={!!selectedCustomerId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yetkili Kişi</label>
                <input required type="text" className={inputClass} value={client.contactPerson} onChange={e => setClient({...client, contactPerson: e.target.value})} disabled={!!selectedCustomerId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                <input required type="tel" placeholder="+44 7911 123456" className={inputClass} value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} disabled={!!selectedCustomerId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" className={inputClass} value={client.email || ''} onChange={e => setClient({...client, email: e.target.value})} disabled={!!selectedCustomerId} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-3 border-b pb-1">Teslimat Adresi</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Cadde / Sokak</label>
                         <input type="text" className={inputClass} placeholder="Örn: Oxford Street" value={client.addressStreet || ''} onChange={e => setClient({...client, addressStreet: e.target.value})} disabled={!!selectedCustomerId} />
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-slate-500 mb-1">Kapı No / Bina</label>
                         <input type="text" className={inputClass} placeholder="No: 12, Apt: 4" value={client.addressDoorNo || ''} onChange={e => setClient({...client, addressDoorNo: e.target.value})} disabled={!!selectedCustomerId} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Posta Kodu</label>
                            <input type="text" className={inputClass} placeholder="W1D 1BS" value={client.addressPostCode || ''} onChange={e => setClient({...client, addressPostCode: e.target.value})} disabled={!!selectedCustomerId} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Şehir (UK)</label>
                            <input type="text" className={inputClass} placeholder="London" value={client.addressCity || ''} onChange={e => setClient({...client, addressCity: e.target.value})} disabled={!!selectedCustomerId} />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Step 2: Add Products (Multiple) */}
        {step === 2 && (
          <div className="p-6 space-y-8">
            <div className="flex justify-between items-center border-b pb-4 gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Ürün Ekle</h2>
                <p className="text-slate-500 text-sm">Sipariş için kalem oluşturun</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Catalog Select */}
                <div className="flex gap-2 items-center bg-green-50 p-2 rounded-lg border border-green-100">
                    <BookOpen className="text-green-600" size={16} />
                    <select 
                        onChange={handleCatalogSelect}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-0 w-48"
                        defaultValue=""
                    >
                        <option value="" disabled>Katalogdan Seç...</option>
                        {catalogItems.map(item => (
                            <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                    </select>
                </div>

                {/* AI Input */}
                <div className="flex gap-2 items-center bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    <Wand2 className="text-indigo-600" size={16} />
                    <input 
                    type="text" 
                    placeholder="AI Örn: Lüks siyah paket..."
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-0 w-48"
                    value={aiSuggestion}
                    onChange={(e) => setAiSuggestion(e.target.value)}
                    />
                    <button type="button" onClick={handleAISuggestion} disabled={loadingAI} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-md">
                    {loadingAI ? '...' : 'Doldur'}
                    </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form to add item */}
                <div className="md:col-span-2 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 bg-slate-50 p-3 rounded border">
                            <h4 className="font-bold text-slate-700 text-sm">Dış Ambalaj</h4>
                            <select className={inputClass} value={currentSpecs.outerMaterial} onChange={e => setCurrentSpecs({...currentSpecs, outerMaterial: e.target.value})}>
                                <option>Triplex (PET/ALU/PE)</option>
                                <option>Kuşe Kağıt + PE</option>
                                <option>PET + PE (Metalize)</option>
                                {customMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input type="number" placeholder="En" className={inputClass} value={currentSpecs.outerDimensions.width} onChange={e => setCurrentSpecs({...currentSpecs, outerDimensions: {...currentSpecs.outerDimensions, width: Number(e.target.value)}})} />
                                <input type="number" placeholder="Boy" className={inputClass} value={currentSpecs.outerDimensions.height} onChange={e => setCurrentSpecs({...currentSpecs, outerDimensions: {...currentSpecs.outerDimensions, height: Number(e.target.value)}})} />
                            </div>
                        </div>

                        <div className="space-y-3 bg-slate-50 p-3 rounded border">
                             <h4 className="font-bold text-slate-700 text-sm">Mendil & Solüsyon</h4>
                             <select className={inputClass} value={currentSpecs.towelMaterial} onChange={e => setCurrentSpecs({...currentSpecs, towelMaterial: e.target.value as any})}>
                                <option>Nonwoven Spunlace</option>
                                <option>Thermal Bond</option>
                                <option>Airlaid</option>
                                {customTowelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input type="text" placeholder="Esans (Örn: Limon)" className={inputClass} value={currentSpecs.essenceName} onChange={e => setCurrentSpecs({...currentSpecs, essenceName: e.target.value})} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500">Ürün Görsel URL (Opsiyonel)</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="https://..." className={inputClass} value={currentItemImage || ''} onChange={e => setCurrentItemImage(e.target.value)} />
                                {currentItemImage && (
                                    <img src={currentItemImage} alt="Preview" className="w-10 h-10 object-cover rounded border bg-white" />
                                )}
                            </div>
                         </div>
                     </div>
                     
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-blue-800 mb-1">Miktar (Adet)</label>
                            <input type="number" className={inputClass} value={currentItemQty} onChange={e => setCurrentItemQty(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-blue-800 mb-1">Birim Fiyat ({currency})</label>
                            <input type="number" step="0.001" className={inputClass} value={currentItemPrice} onChange={e => setCurrentItemPrice(Number(e.target.value))} />
                        </div>
                        <div className="flex items-end">
                            <button type="button" onClick={handleAddItem} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Plus size={18} /> Listeye Ekle
                            </button>
                        </div>
                     </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-full flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Box size={18}/> Eklenen Ürünler ({items.length})
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                        {items.length === 0 && <p className="text-slate-400 text-sm italic">Henüz ürün eklenmedi.</p>}
                        {items.map((item, idx) => (
                            <div key={item.id} className="bg-white p-3 rounded border shadow-sm relative group flex gap-3">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" className="w-12 h-12 rounded object-cover border" />
                                ) : (
                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-300">
                                        <ImageIcon size={20} />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-800">{item.specs.essenceName} Islak Mendil</div>
                                    <div className="text-xs text-slate-500">{item.specs.outerMaterial}</div>
                                    <div className="flex justify-between mt-2 text-xs font-medium">
                                        <span>{item.quantity.toLocaleString()} adet</span>
                                        <span>{(item.quantity * item.unitPrice).toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 text-right mt-1">{item.unitPrice.toFixed(3)} {currency} / adet</div>
                                </div>
                                <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Financials */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <div className="border-b pb-4 mb-4 flex justify-between items-center">
              <div>
                 <h2 className="text-xl font-bold text-slate-800">Özet ve Finansal</h2>
                 <p className="text-slate-500 text-sm">Teslimat tarihi ve ödeme planı</p>
              </div>
              <button type="button" onClick={handleAnalyzeOrder} disabled={loadingAI} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm">
                {loadingAI ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Risk Analizi
              </button>
            </div>

            {aiAnalysis && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 text-sm text-yellow-800 whitespace-pre-line">
                    <div className="font-bold flex gap-2 mb-1"><AlertCircle size={16}/> AI Raporu</div>
                    {aiAnalysis}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded border">
                        <h4 className="font-bold text-slate-700 mb-3">Genel Ayarlar</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Para Birimi</label>
                                <select className={inputClass} value={currency} onChange={e => setCurrency(e.target.value as any)}>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="TRY">TRY (₺)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Peşinat</label>
                                <input type="number" className={inputClass} value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} />
                            </div>
                        </div>
                         <div className="mt-3 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={applyVat} onChange={(e) => setApplyVat(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                KDV / VAT Uygula (%{vatRate})
                            </label>
                            {applyVat && (
                                <input type="number" className="w-16 p-1 border rounded text-xs text-center" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 flex items-center gap-2 mb-1">
                            <Calendar size={16} /> Teslim Tarihi
                        </label>
                        <input type="date" className={inputClass} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sipariş Notu</label>
                        <textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} rows={3}></textarea>
                    </div>
                </div>

                {/* Totals Display */}
                <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col justify-center space-y-4 shadow-xl">
                    <h3 className="font-bold text-lg border-b border-slate-700 pb-2">Toplam Hesap</h3>
                    
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm text-slate-400">
                            <span>{item.specs.essenceName} x {item.quantity.toLocaleString()}</span>
                            <span>{(item.totalPrice).toLocaleString()} {currency}</span>
                        </div>
                    ))}
                    
                    <div className="h-px bg-slate-700 my-2"></div>
                    
                    <div className="flex justify-between">
                        <span className="text-slate-400">Ara Toplam:</span>
                        <span className="font-mono text-lg">{items.reduce((a,b)=>a+b.totalPrice,0).toLocaleString()} {currency}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-400">VAT:</span>
                        <span className="font-mono text-lg">
                            {(items.reduce((a,b)=>a+b.totalPrice,0) * (applyVat ? vatRate/100 : 0)).toLocaleString()} {currency}
                        </span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-primary-400 mt-2 pt-2 border-t border-slate-700">
                        <span>Genel Toplam:</span>
                        <span>
                            {(items.reduce((a,b)=>a+b.totalPrice,0) * (1 + (applyVat ? vatRate/100 : 0))).toLocaleString()} {currency}
                        </span>
                    </div>
                     <div className="flex justify-between text-green-400 text-sm">
                        <span>Peşinat:</span>
                        <span>- {downPayment.toLocaleString()} {currency}</span>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between">
          {step > 1 ? (
             <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-white transition-colors bg-white">
                Geri
              </button>
          ) : (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-500 hover:text-slate-700">İptal</button>
          )}

          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
              İleri <Calculator size={16} />
            </button>
          ) : (
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-lg shadow-primary/30">
              <Save size={18} /> Siparişi Onayla
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default CreateOrder;
