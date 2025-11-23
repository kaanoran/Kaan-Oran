
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Printer, FileBarChart, Truck, Factory, CreditCard, ChevronLeft } from 'lucide-react';

interface ReportsProps {
  orders: Order[];
}

type ReportType = 'PRODUCTION' | 'SHIPPING' | 'FINANCIAL';

const Reports: React.FC<ReportsProps> = ({ orders }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('PRODUCTION');

  const handlePrint = () => {
    window.print();
  };

  const renderContent = () => {
    const today = new Date().toLocaleDateString('tr-TR');

    if (activeReport === 'PRODUCTION') {
        const productionOrders = orders.filter(o => o.status === OrderStatus.IN_PRODUCTION || o.status === OrderStatus.PENDING);
        return (
            <div>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                     <div>
                        <h2 className="text-2xl font-bold">Üretim Bekleyenler Listesi</h2>
                        <p className="text-slate-500">Tarih: {today}</p>
                     </div>
                     <div className="text-right">
                        <div className="text-sm font-bold">Toplam Sipariş</div>
                        <div className="text-xl">{productionOrders.length}</div>
                     </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 uppercase">
                        <tr>
                            <th className="p-3">Sipariş No</th>
                            <th className="p-3">Müşteri</th>
                            <th className="p-3">Ürün Detayı</th>
                            <th className="p-3 text-right">Miktar</th>
                            <th className="p-3">Durum</th>
                            <th className="p-3">Teslim Tarihi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {productionOrders.map(order => (
                            order.items.map((item, idx) => (
                                <tr key={`${order.id}-${idx}`}>
                                    <td className="p-3 font-mono">{order.id}</td>
                                    <td className="p-3 font-medium">{order.client.companyName}</td>
                                    <td className="p-3">
                                        <div className="font-bold">{item.specs.essenceName}</div>
                                        <div className="text-xs text-slate-500">{item.specs.outerMaterial} - {item.specs.towelDimensionsOpen.width}x{item.specs.towelDimensionsOpen.height}cm</div>
                                    </td>
                                    <td className="p-3 text-right font-bold">{item.quantity.toLocaleString()}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">{new Date(order.estimatedDeliveryDate).toLocaleDateString()}</td>
                                </tr>
                            ))
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (activeReport === 'SHIPPING') {
        const shippingOrders = orders.filter(o => o.status === OrderStatus.IN_TRANSIT || o.status === OrderStatus.SHIPPED || o.status === OrderStatus.PARTIAL);
        return (
            <div>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                     <div>
                        <h2 className="text-2xl font-bold">Sevkiyat Raporu (Lojistik)</h2>
                        <p className="text-slate-500">Tarih: {today}</p>
                     </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 uppercase">
                        <tr>
                            <th className="p-3">Sipariş No</th>
                            <th className="p-3">Alıcı & Adres</th>
                            <th className="p-3">Ürün</th>
                            <th className="p-3">Lojistik Durumu</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {shippingOrders.map(order => (
                            <tr key={order.id}>
                                <td className="p-3 font-mono">{order.id}</td>
                                <td className="p-3">
                                    <div className="font-bold">{order.client.companyName}</div>
                                    <div className="text-xs text-slate-500">{order.client.addressCity}, {order.client.addressStreet}</div>
                                    <div className="text-xs text-slate-500">{order.client.contactPerson} - {order.client.phone}</div>
                                </td>
                                <td className="p-3">
                                    {order.items.map(i => (
                                        <div key={i.id} className="text-xs">
                                            {i.quantity.toLocaleString()} x {i.specs.essenceName}
                                        </div>
                                    ))}
                                </td>
                                <td className="p-3">
                                     <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                            {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (activeReport === 'FINANCIAL') {
        const totalReceivable = orders.reduce((acc, o) => {
            const paid = o.paymentHistory?.reduce((p, t) => p + t.amount, 0) || 0;
            const down = o.financials.downPayment;
            const total = o.financials.totalAmount;
            return acc + (total - (paid + down));
        }, 0);

        return (
            <div>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                     <div>
                        <h2 className="text-2xl font-bold">Finansal Durum Raporu</h2>
                        <p className="text-slate-500">Tarih: {today}</p>
                     </div>
                     <div className="bg-red-50 p-2 rounded border border-red-200 text-right">
                         <div className="text-xs text-red-600">Toplam Tahsil Edilecek</div>
                         <div className="text-xl font-bold text-red-800">~{totalReceivable.toLocaleString()} GBP</div>
                     </div>
                </div>
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 uppercase">
                        <tr>
                            <th className="p-3">Müşteri</th>
                            <th className="p-3 text-right">Toplam Tutar</th>
                            <th className="p-3 text-right">Ödenen</th>
                            <th className="p-3 text-right">Kalan Bakiye</th>
                            <th className="p-3">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {orders.map(order => {
                            const paid = (order.paymentHistory?.reduce((p, t) => p + t.amount, 0) || 0) + order.financials.downPayment;
                            const balance = order.financials.totalAmount - paid;
                            return (
                                <tr key={order.id}>
                                    <td className="p-3 font-medium">{order.client.companyName}</td>
                                    <td className="p-3 text-right">{order.financials.totalAmount.toLocaleString()} {order.financials.currency}</td>
                                    <td className="p-3 text-right text-green-600 font-bold">{paid.toLocaleString()}</td>
                                    <td className="p-3 text-right text-red-600 font-bold">{balance > 0 ? balance.toLocaleString() : '-'}</td>
                                    <td className="p-3 text-xs">
                                        {balance <= 0 ? (
                                            <span className="text-green-600 font-bold">Ödendi</span>
                                        ) : (
                                            <span className="text-orange-600">Bekliyor</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls - Hidden in Print */}
      <div className="flex justify-between items-center print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveReport('PRODUCTION')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <Factory size={16}/> Üretim
            </button>
            <button 
                 onClick={() => setActiveReport('SHIPPING')} 
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === 'SHIPPING' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <Truck size={16}/> Sevkiyat
            </button>
            <button 
                 onClick={() => setActiveReport('FINANCIAL')} 
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === 'FINANCIAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <CreditCard size={16}/> Finansal
            </button>
        </div>
        <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-lg"
        >
            <Printer size={18}/> Yazdır / PDF
        </button>
      </div>

      {/* Report Paper */}
      <div className="bg-white p-8 min-h-[297mm] shadow-2xl mx-auto max-w-[210mm] print:shadow-none print:w-full print:max-w-none">
        {/* Header Logo for Print */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-4">
             <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-lg font-bold text-xl print:text-black print:bg-transparent print:border-2 print:border-black">OW</div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">OnsWipes Pro</h1>
                    <p className="text-xs text-slate-500">Private Label Wet Wipes Manufacturing</p>
                </div>
             </div>
             <div className="text-right text-xs text-slate-500">
                <p>Rapor Tarihi: {new Date().toLocaleString('tr-TR')}</p>
                <p>Oluşturan: Sistem Yöneticisi</p>
             </div>
        </div>

        {renderContent()}

        <div className="mt-12 text-center text-xs text-slate-400 print:fixed print:bottom-4 print:left-0 print:w-full">
            Bu belge OnsWipesPro sistemi tarafından otomatik oluşturulmuştur.
        </div>
      </div>
    </div>
  );
};

export default Reports;
