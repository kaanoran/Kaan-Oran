
import React, { useState } from 'react';
import { Customer, Order } from '../types';
import { User, Phone, MapPin, FileText, Send, Edit2, History, Plus, ChevronLeft, Home, Mail, X, CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink, ArrowUpRight, Printer } from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  orders: Order[];
  searchQuery: string;
  onAddCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, orders, searchQuery, onAddCustomer, onEditCustomer }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  
  // Statement Modal State
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  
  // Temporary form state
  const [formData, setFormData] = useState<Customer['info'] & { notes: string }>({
    companyName: '', contactPerson: '', phone: '', email: '', 
    addressStreet: '', addressDoorNo: '', addressPostCode: '', addressCity: '',
    taxId: '', notes: ''
  });

  const handleEditClick = (customer: Customer) => {
    setActiveCustomer(customer);
    setFormData({ ...customer.info, notes: customer.notes });
    setIsEditing(true);
  };

  const handleAddNewClick = () => {
    setActiveCustomer(null);
    setFormData({ 
        companyName: '', contactPerson: '', phone: '', email: '', 
        addressStreet: '', addressDoorNo: '', addressPostCode: '', addressCity: '',
        taxId: '', notes: '' 
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const infoData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        addressStreet: formData.addressStreet,
        addressDoorNo: formData.addressDoorNo,
        addressPostCode: formData.addressPostCode,
        addressCity: formData.addressCity,
        taxId: formData.taxId
    };

    if (activeCustomer) {
      // Update
      const updated: Customer = {
        ...activeCustomer,
        info: infoData,
        notes: formData.notes
      };
      onEditCustomer(updated);
    } else {
      // Create
      const newCustomer: Customer = {
        id: Date.now().toString(),
        tags: [],
        info: infoData,
        notes: formData.notes
      };
      onAddCustomer(newCustomer);
    }
    setIsEditing(false);
  };

  const handleBulkMessage = () => {
    const message = window.prompt("Tüm müşterilere gönderilecek mesajı giriniz (SMS/Email Simülasyonu):");
    if (message) {
      alert(`${customers.length} müşteriye başarıyla mesaj gönderildi!\n\nMesaj: "${message}"`);
    }
  };

  const getCustomerOrders = (customerId: string) => {
    return orders.filter(o => o.customerId === customerId);
  };

  const getCustomerFinancials = (customerId: string) => {
      const custOrders = getCustomerOrders(customerId);
      const totalDebt = custOrders.reduce((acc, o) => acc + o.financials.totalAmount, 0);
      
      let totalPaid = 0;
      custOrders.forEach(o => {
          totalPaid += o.financials.downPayment;
          if (o.paymentHistory) {
              totalPaid += o.paymentHistory.reduce((p, t) => p + t.amount, 0);
          }
      });

      return {
          totalDebt,
          totalPaid,
          balance: totalDebt - totalPaid,
          orders: custOrders
      };
  };

  // --- E-POSTA GENERATION LOGIC ---
  const getStatementText = (customer: Customer, financials: any) => {
    const date = new Date().toLocaleDateString('tr-TR');
    let text = `Sayın ${customer.info.contactPerson} (${customer.info.companyName}),\n\n`;
    text += `${date} tarihli güncel hesap ekstreniz ve sipariş detaylarınız aşağıdadır:\n\n`;

    if (financials.orders.length === 0) {
        text += "Kayıtlı sipariş bulunmamaktadır.\n";
    } else {
        financials.orders.forEach((order: Order) => {
            text += `------------------------------------------\n`;
            text += `SİPARİŞ NO: #${order.id} (${new Date(order.orderDate).toLocaleDateString('tr-TR')})\n`;
            order.items.forEach((item: any) => {
                text += `- ${item.specs.essenceName} (${item.quantity.toLocaleString()} ad): ${item.totalPrice.toLocaleString()} ${order.financials.currency}\n`;
            });
            const paid = (order.paymentHistory?.reduce((p:any, t:any) => p + t.amount, 0) || 0) + order.financials.downPayment;
            const balance = order.financials.totalAmount - paid;
            text += `Ara Toplam: ${order.financials.subTotal.toLocaleString()} | KDV: %${order.financials.vatRate}\n`;
            text += `Genel Toplam: ${order.financials.totalAmount.toLocaleString()} ${order.financials.currency}\n`;
            text += `Durum: Ödenen ${paid.toLocaleString()} | Kalan ${balance.toLocaleString()} ${order.financials.currency}\n`;
        });
    }

    text += `\n==========================================\n`;
    text += `GENEL TOPLAM BORÇ: ${financials.totalDebt.toLocaleString('tr-TR')} GBP\n`;
    text += `TOPLAM ÖDENEN: ${financials.totalPaid.toLocaleString('tr-TR')} GBP\n`;
    text += `GÜNCEL BAKİYE: ${financials.balance.toLocaleString('tr-TR')} GBP\n`;
    text += `==========================================\n\n`;
    text += `Saygılarımızla,\nOnsWipes Pro`;
    return text;
  };

  const handleSendGmail = () => {
    if (!statementCustomer) return;
    const email = statementCustomer.info.email;
    if (!email) return alert('Müşteriye ait e-posta adresi bulunamadı.');

    const financials = getCustomerFinancials(statementCustomer.id);
    const subject = `Hesap Ekstresi - ${statementCustomer.info.companyName}`;
    const body = getStatementText(statementCustomer, financials);

    // Gmail Compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleCopyText = async () => {
    if (!statementCustomer) return;
    const financials = getCustomerFinancials(statementCustomer.id);
    const body = getStatementText(statementCustomer, financials);
    
    try {
        await navigator.clipboard.writeText(body);
        alert('Hesap ekstresi metni kopyalandı! İstediğiniz yere (WhatsApp, Mail vb.) yapıştırabilirsiniz.');
    } catch (err) {
        alert('Kopyalama başarısız oldu.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatAddress = (info: any) => {
     const parts = [info.addressStreet, info.addressDoorNo, info.addressPostCode, info.addressCity].filter(Boolean);
     return parts.length > 0 ? parts.join(', ') : 'Adres girilmedi';
  };

  // Filter Logic
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
        c.info.companyName.toLowerCase().includes(query) ||
        c.info.contactPerson.toLowerCase().includes(query) ||
        c.info.phone.includes(query)
    );
  });

  const inputClass = "w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-2 border bg-white text-slate-900 placeholder-slate-400";

  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800">{activeCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle'}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Firma Adı</label>
              <input required type="text" className={inputClass} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yetkili Kişi</label>
              <input required type="text" className={inputClass} value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input required type="text" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                 Email <span className="text-slate-400 font-normal text-xs">(Fatura & Ekstre için)</span>
              </label>
              <div className="relative">
                  <Mail className="absolute left-2 top-2.5 text-slate-400" size={16} />
                  <input type="email" placeholder="ornek@sirket.com" className={`${inputClass} pl-8 border-indigo-200`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2 border-b pb-1">Adres Bilgileri</label>
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cadde / Sokak</label>
                      <input type="text" className={inputClass} value={formData.addressStreet} onChange={e => setFormData({...formData, addressStreet: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Kapı No</label>
                      <input type="text" className={inputClass} value={formData.addressDoorNo} onChange={e => setFormData({...formData, addressDoorNo: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Posta Kodu</label>
                        <input type="text" className={inputClass} value={formData.addressPostCode} onChange={e => setFormData({...formData, addressPostCode: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Şehir</label>
                        <input type="text" className={inputClass} value={formData.addressCity} onChange={e => setFormData({...formData, addressCity: e.target.value})} />
                    </div>
                  </div>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Özel Notlar</label>
            <textarea className={`${inputClass} h-24`} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Örn: Ödemelerde hassas..."></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600">Kaydet</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Explicit Home Button */}
      <div className="flex items-center gap-2 mb-2 text-slate-500 hover:text-primary cursor-pointer w-fit" onClick={() => window.location.reload()}> 
        <Home size={16} /> <span className="text-sm font-medium">Ana Sayfa</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Müşteri Portföyü</h2>
          <p className="text-slate-500">Müşterilerinizi yönetin ve iletişim kurun</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBulkMessage} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
            <Send size={18} /> Toplu Mesaj
          </button>
          <button onClick={handleAddNewClick} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 transition-colors">
            <Plus size={18} /> Yeni Müşteri
          </button>
        </div>
      </div>

      {filteredCustomers.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
              Kayıt bulunamadı.
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => {
          const history = getCustomerOrders(customer.id);
          const financials = getCustomerFinancials(customer.id);
          
          return (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{customer.info.companyName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <User size={14} /> {customer.info.contactPerson}
                  </div>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={() => setStatementCustomer(customer)} 
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Hesap Özeti Gönder"
                    >
                        <FileText size={18} />
                    </button>
                    <button 
                        onClick={() => handleEditClick(customer)} 
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded transition-colors"
                        title="Düzenle"
                    >
                        <Edit2 size={18} />
                    </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <Phone size={14} /> {customer.info.phone}
                </div>
                {customer.info.email && (
                    <div className="flex items-center gap-2">
                        <Mail size={14} /> {customer.info.email}
                    </div>
                )}
                <div className="flex items-start gap-2 truncate">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" /> 
                    <span className="whitespace-normal text-xs">{formatAddress(customer.info)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded mb-3 text-xs">
                  <span className="text-slate-500">Güncel Bakiye:</span>
                  <span className={`font-bold ${financials.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {financials.balance.toLocaleString('tr-TR')} GBP
                  </span>
              </div>

              {customer.notes && (
                <div className="bg-amber-50 border border-amber-100 p-2 rounded text-xs text-amber-800 mb-4 italic">
                  Not: {customer.notes}
                </div>
              )}

              <div className="border-t pt-3 mt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 flex items-center gap-1">
                    <History size={14} /> Sipariş Geçmişi
                  </span>
                  <span className="font-bold text-slate-900">{history.length} Adet</span>
                </div>
                {history.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                        Son Sipariş: {new Date(history[0].orderDate).toLocaleDateString('tr-TR')}
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Statement Modal */}
      {statementCustomer && (
        // KEY CHANGE: print:absolute, print:inset-0, print:block overrides fixed/flex centering to allow multipage printing
        <div id="printable-overlay" className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 print:absolute print:inset-0 print:bg-white print:block print:z-[9999] print:h-auto print:overflow-visible">
            {/* KEY CHANGE: print:max-h-none, print:h-auto, print:shadow-none removes height constraints */}
            <div id="printable-section" className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:rounded-none print:w-full print:block print:overflow-visible">
                
                {/* Screen-Only Header */}
                <div className="flex justify-between items-center p-4 border-b print:hidden">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Mail size={20} className="text-indigo-600"/> Hesap Ekstresi (Detaylı)
                    </h3>
                    <button onClick={() => setStatementCustomer(null)} className="p-1 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                {/* KEY CHANGE: print:overflow-visible prevents clipping content that overflows viewport */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible print:h-auto">
                    {/* Letterhead Design */}
                    <div className="bg-white shadow-lg mx-auto max-w-2xl p-10 rounded-sm text-sm border border-slate-200 print:shadow-none print:border-none print:max-w-none print:p-0 print:m-0">
                        
                        {/* Header */}
                        <div className="border-b-2 border-primary pb-4 mb-6 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 leading-tight">OnsWipes<span className="text-primary">Pro</span></h1>
                                <p className="text-slate-500 text-xs tracking-wider">Private Label Wet Wipes Manufacturing</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Belge Tarihi</div>
                                <div className="font-medium text-lg">{new Date().toLocaleDateString('tr-TR')}</div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="mb-10 bg-slate-50 p-6 rounded print:bg-transparent print:p-0 print:border print:border-slate-200 print:mb-8">
                            <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Müşteri Bilgileri</h4>
                            <div className="font-bold text-xl text-slate-800 mb-1">{statementCustomer.info.companyName}</div>
                            <div className="text-slate-600 font-medium">{statementCustomer.info.contactPerson}</div>
                            <div className="text-slate-500 text-xs mt-1">{statementCustomer.info.addressCity}, {statementCustomer.info.addressStreet}</div>
                            
                            <p className="mt-4 text-slate-600 leading-relaxed text-xs border-t border-slate-200 pt-3">
                                Sayın Yetkili, aşağıda cari hesabınıza ait sipariş detayları ve ödeme hareketleri yer almaktadır.
                            </p>
                        </div>

                        {/* Order Details List */}
                        <div className="mb-6 space-y-10">
                            {getCustomerFinancials(statementCustomer.id).orders.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 italic">Sipariş kaydı bulunmamaktadır.</div>
                            ) : (
                                getCustomerFinancials(statementCustomer.id).orders.map(order => {
                                    const subTotal = order.financials.subTotal;
                                    const vatAmount = order.financials.totalAmount - subTotal;
                                    const total = order.financials.totalAmount;
                                    const paid = (order.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0) + order.financials.downPayment;
                                    const balance = total - paid;
                                    
                                    // Combine and sort payments
                                    const allPayments = [
                                        ...(order.financials.downPayment > 0 ? [{ id: 'dp', date: order.orderDate, note: 'Peşinat', amount: order.financials.downPayment }] : []),
                                        ...(order.paymentHistory || [])
                                    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                    return (
                                        <div key={order.id} className="mb-8 break-inside-avoid">
                                            {/* Order Header */}
                                            <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
                                                <div className="font-bold text-slate-800 text-lg">Sipariş No: #{order.id}</div>
                                                <div className="text-xs text-slate-500">{new Date(order.orderDate).toLocaleDateString('tr-TR')}</div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Items Table */}
                                                <div>
                                                    <table className="w-full text-xs text-left mb-2">
                                                        <thead className="text-slate-500 border-b border-slate-200">
                                                            <tr>
                                                                <th className="py-2 font-semibold">Ürün / Hizmet</th>
                                                                <th className="py-2 text-right font-semibold">Birim Fiyat</th>
                                                                <th className="py-2 text-right font-semibold">Miktar</th>
                                                                <th className="py-2 text-right font-semibold">Tutar</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-slate-700">
                                                            {order.items.map(item => (
                                                                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                                                    <td className="py-2 pr-2">
                                                                        <div className="font-bold text-sm">{item.specs.essenceName} Islak Mendil</div>
                                                                        <div className="text-[10px] text-slate-500 mt-0.5">{item.specs.outerMaterial} - {item.specs.towelDimensionsOpen.width}x{item.specs.towelDimensionsOpen.height}cm</div>
                                                                    </td>
                                                                    <td className="py-2 text-right">{item.unitPrice.toFixed(3)} {order.financials.currency}</td>
                                                                    <td className="py-2 text-right">{item.quantity.toLocaleString()}</td>
                                                                    <td className="py-2 text-right font-medium">{item.totalPrice.toLocaleString()} {order.financials.currency}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Totals Section */}
                                                <div className="flex justify-end mt-2">
                                                    <div className="w-1/2 space-y-1 text-xs">
                                                         <div className="flex justify-between text-slate-500">
                                                            <span>Ara Toplam:</span>
                                                            <span>{subTotal.toLocaleString()} {order.financials.currency}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-500">
                                                            <span>KDV (%{order.financials.vatRate}):</span>
                                                            <span>{vatAmount.toLocaleString()} {order.financials.currency}</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-slate-200 pt-1 mt-1">
                                                            <span>GENEL TOPLAM:</span>
                                                            <span>{total.toLocaleString()} {order.financials.currency}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment History & Balance */}
                                                <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-4 print:bg-white print:border print:border-slate-300">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide border-b border-slate-200 pb-1">Ödeme Hareketleri</div>
                                                    {allPayments.length > 0 ? (
                                                        <div className="space-y-1 mb-3">
                                                            {allPayments.map((p, idx) => (
                                                                <div key={idx} className="flex justify-between text-xs text-slate-600">
                                                                    <span>{new Date(p.date).toLocaleDateString('tr-TR')} - {p.note}</span>
                                                                    <span className="font-mono text-green-700">-{p.amount.toLocaleString()} {order.financials.currency}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 italic mb-2">Henüz ödeme alınmadı.</div>
                                                    )}
                                                    
                                                    <div className="border-t border-slate-200 pt-2 flex justify-end gap-6 text-xs">
                                                         <div className="flex gap-2 items-center text-green-700">
                                                            <span>Toplam Ödenen:</span>
                                                            <span className="font-bold">{paid.toLocaleString()} {order.financials.currency}</span>
                                                        </div>
                                                        <div className="flex gap-2 items-center text-red-600 font-bold text-sm">
                                                            <span>Sipariş Bakiyesi:</span>
                                                            <span>{balance.toLocaleString()} {order.financials.currency}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Grand Total Footer */}
                        {(() => {
                            const fins = getCustomerFinancials(statementCustomer.id);
                            return (
                                <div className="mt-8 pt-6 border-t-2 border-slate-800 break-inside-avoid">
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex justify-between items-center w-full max-w-xs">
                                            <span className="text-sm font-bold text-slate-600">GENEL TOPLAM BORÇ</span>
                                            <span className="text-lg font-bold text-slate-800">{fins.totalDebt.toLocaleString('tr-TR')} GBP</span>
                                        </div>
                                        <div className="flex justify-between items-center w-full max-w-xs">
                                            <span className="text-sm font-bold text-green-600">TOPLAM ÖDENEN</span>
                                            <span className="text-lg font-bold text-green-600">-{fins.totalPaid.toLocaleString('tr-TR')} GBP</span>
                                        </div>
                                        <div className="w-full max-w-xs h-px bg-slate-300 my-1"></div>
                                        <div className="flex justify-between items-center w-full max-w-xs bg-slate-100 p-2 rounded print:bg-slate-50">
                                            <span className="text-base font-bold text-red-600">KALAN GENEL BAKİYE</span>
                                            <span className="text-2xl font-bold text-red-600">{fins.balance.toLocaleString('tr-TR')} GBP</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Footer Notes */}
                        <div className="text-xs text-slate-400 mt-12 pt-4 text-center print:fixed print:bottom-4 print:left-0 print:w-full">
                            <p>OnsWipes Pro - Private Label Wet Wipes Manufacturing</p>
                            <p className="mt-1">Bu belge sistemsel olarak oluşturulmuştur ve ıslak imza gerektirmez.</p>
                        </div>

                    </div>
                </div>

                {/* Footer Actions (Hidden on Print) */}
                <div className="p-4 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                    <div className="text-xs text-slate-500">
                        {statementCustomer.info.email ? (
                            <span className="text-green-600 font-medium">Alıcı: {statementCustomer.info.email}</span>
                        ) : (
                            <span className="text-red-500 font-bold">Uyarı: Müşterinin e-posta adresi kayıtlı değil!</span>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button 
                            onClick={handlePrint}
                            className="px-4 py-2 border border-slate-600 text-slate-800 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-sm font-medium"
                            title="PDF olarak kaydetmek için yazdır menüsünü kullanın"
                        >
                            <Printer size={16} /> Yazdır / PDF
                        </button>

                        <button 
                            onClick={handleCopyText} 
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium"
                            title="Metni Kopyala"
                        >
                            <Copy size={16} /> <span className="hidden sm:inline">Kopyala</span>
                        </button>

                        <button 
                            onClick={handleSendGmail}
                            disabled={!statementCustomer.info.email}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all font-bold text-sm disabled:opacity-50"
                            title="Tarayıcıda Gmail'i açar ve taslağı hazırlar"
                        >
                            <ArrowUpRight size={18} /> Gmail ile Gönder
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
