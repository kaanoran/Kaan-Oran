
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, PaymentTransaction, Delivery, OrderItem } from '../types';
import { Calendar, Package, CreditCard, X, Edit2, Trash2, RotateCcw, ImageIcon, Filter, CheckCircle2, TrendingUp, BarChart3, FilterX, AlertCircle } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  searchQuery: string;
  onSelectOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
}

type FilterTab = 'ALL' | 'PENDING' | 'IN_PRODUCTION' | 'IN_TRANSIT' | 'SHIPPED' | 'DELIVERED';

const OrderList: React.FC<OrderListProps> = ({ orders, searchQuery, onSelectOrder, onUpdateOrder }) => {
  // Source of truth: selectedOrderId
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId) || null
  , [orders, selectedOrderId]);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  
  // Date Filter State
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });

  // Interactive Chart State
  const [filterEssence, setFilterEssence] = useState<string | null>(null);
  const [hoveredTrendData, setHoveredTrendData] = useState<{x: number, y: number, value: number, label: string} | null>(null);

  // Modal States
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  
  // Delivery Modal State
  const [deliveryItem, setDeliveryItem] = useState<string>('');
  const [deliveryQty, setDeliveryQty] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Image Error Handling State
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  // --- Helpers ---
  const calculateOrderTotal = (order: Order) => order.financials.totalAmount;
  const calculateTotalPaid = (order: Order) => {
    const historyTotal = order.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return order.financials.downPayment + historyTotal;
  };
  const calculateBalance = (order: Order) => calculateOrderTotal(order) - calculateTotalPaid(order);

  const getItemDeliveredQty = (item: OrderItem) => item.deliveries.reduce((acc, d) => acc + d.quantity, 0);
  const getOrderTotalQty = (order: Order) => order.items.reduce((acc, i) => acc + i.quantity, 0);
  const getOrderDeliveredQty = (order: Order) => order.items.reduce((acc, i) => acc + getItemDeliveredQty(i), 0);

  // --- Filtering & Sorting ---
  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
        // 1. Text Search
        const matchesSearch = 
            order.client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.includes(searchQuery);
        if (!matchesSearch) return false;
        
        // 2. Essence Filter (Chart Click)
        if (filterEssence) {
            const hasEssence = order.items.some(i => i.specs.essenceName === filterEssence);
            if (!hasEssence) return false;
        }

        // 3. Status Filter (Tabs)
        if (activeFilter !== 'ALL') {
            if (activeFilter === 'PENDING' && order.status !== OrderStatus.PENDING) return false;
            if (activeFilter === 'IN_PRODUCTION' && order.status !== OrderStatus.IN_PRODUCTION) return false;
            if (activeFilter === 'IN_TRANSIT' && order.status !== OrderStatus.IN_TRANSIT) return false;
            if (activeFilter === 'SHIPPED' && order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.PARTIAL) return false;
            if (activeFilter === 'DELIVERED' && order.status !== OrderStatus.DELIVERED) return false;
        }

        // 4. Date Filter
        if (dateRange.start) {
            const orderDate = new Date(order.orderDate).getTime();
            const startDate = new Date(dateRange.start).getTime();
            if (orderDate < startDate) return false;
        }
        if (dateRange.end) {
            const orderDate = new Date(order.orderDate).getTime();
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            if (orderDate > endDate.getTime()) return false;
        }

        return true;
    });

    // 5. SORTING: Newest Date First (Descending)
    result = result.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return result;
  }, [orders, searchQuery, filterEssence, activeFilter, dateRange]);

  // --- Dashboard Stats Logic ---
  const stats = useMemo(() => orders.reduce((acc, order) => {
    const totalQty = getOrderTotalQty(order);
    const deliveredQty = getOrderDeliveredQty(order);
    const remainingQty = totalQty - deliveredQty;

    acc.totalOrders++;
    acc.totalItems += totalQty;
    acc.deliveredItems += deliveredQty;
    acc.remainingItems += remainingQty;

    if (order.status === OrderStatus.IN_PRODUCTION) acc.inProduction += remainingQty;
    if (order.status === OrderStatus.PENDING) acc.pending += remainingQty;
    if (order.status === OrderStatus.IN_TRANSIT) acc.inTransit += remainingQty;
    
    return acc;
  }, { totalOrders: 0, totalItems: 0, deliveredItems: 0, remainingItems: 0, inProduction: 0, pending: 0, inTransit: 0 }), [orders]);

  // --- 3D Visualization Logic ---
  const { sortedEssences, maxEssence } = useMemo(() => {
    const essenceStats: Record<string, number> = orders.reduce((acc, order) => {
        order.items.forEach(item => {
            const name = item.specs.essenceName || 'Belirsiz';
            acc[name] = (acc[name] || 0) + item.quantity;
        });
        return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(essenceStats)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5);
    
    const max = Math.max(...(Object.values(essenceStats) as number[]), 100);
    return { sortedEssences: sorted, maxEssence: max };
  }, [orders]);


  // --- Dynamic Trend Line Logic ---
  const trendData = useMemo(() => {
    const months: { monthIndex: number; year: number; label: string; value: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            label: d.toLocaleString('tr-TR', { month: 'short' }),
            value: 0
        });
    }

    orders.forEach(order => {
        if (!order.orderDate) return;
        const d = new Date(order.orderDate);
        if (isNaN(d.getTime())) return;

        const mIndex = d.getMonth();
        const year = d.getFullYear();
        const found = months.find(m => m.monthIndex === mIndex && m.year === year);
        if (found) {
            found.value += order.financials.totalAmount;
        }
    });

    return months;
  }, [orders]);

  const trendPath = useMemo(() => {
    if (trendData.length < 2) return null;
    
    const maxVal = Math.max(...trendData.map(d => d.value), 100);
    const width = 100;
    const height = 50;
    const stepX = width / (trendData.length - 1);
    
    const points = trendData.map((d, i) => {
        const x = i * stepX;
        const normalizedVal = d.value / maxVal;
        const y = height - (normalizedVal * (height * 0.8)); 
        return { x, y, value: d.value, label: d.label };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    
    return { path: d, area: `${d} L ${width} ${height + 20} L 0 ${height + 20} Z`, points };
  }, [trendData]);


  // --- Handlers ---
  
  const handleSavePayment = () => {
    if (!selectedOrder || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    
    // 0 veya geçersiz değer girilmesini engelle, ancak NEGATİF değere izin ver (İade/Düzeltme için)
    if (isNaN(amount) || amount === 0) {
        alert("Lütfen geçerli bir tutar giriniz. (0 hariç, eksi değer girilebilir)");
        return;
    }

    // Sadece POZİTİF ödeme yapılırken bakiye kontrolü yap.
    // Negatif değer giriliyorsa (iade/düzeltme), bakiye artacağı için sınırlamaya gerek yok.
    if (amount > 0) {
        const currentBalance = calculateBalance(selectedOrder);
        let allowableAmount = currentBalance;
        
        if (editingPaymentId) {
            const originalPayment = selectedOrder.paymentHistory?.find(p => p.id === editingPaymentId);
            if (originalPayment) {
                allowableAmount += originalPayment.amount;
            }
        }

        // Small tolerance for floating point issues
        if (amount > allowableAmount + 0.1) {
            alert(`Hata: Ödeme tutarı kalan bakiyeyi (${allowableAmount.toLocaleString('tr-TR')} ${selectedOrder.financials.currency}) aşamaz. Fazla ödeme giriyorsunuz.`);
            return;
        }
    }

    // Create a NEW copy of the order to ensure immutability
    let updatedOrder = { ...selectedOrder };

    if (editingPaymentId) {
        const updatedHistory = (selectedOrder.paymentHistory || []).map(p => 
            p.id === editingPaymentId 
            ? { ...p, amount: amount, date: paymentDate, note: paymentNote || p.note } 
            : p
        );
        updatedOrder.paymentHistory = updatedHistory;
    } else {
        const newPayment: PaymentTransaction = {
            id: (Date.now() + Math.random()).toString(), // Stronger ID generation
            date: paymentDate,
            amount: amount,
            note: paymentNote || 'Tahsilat'
        };
        updatedOrder.paymentHistory = [...(selectedOrder.paymentHistory || []), newPayment];
    }

    onUpdateOrder(updatedOrder);
    setPaymentAmount('');
    setPaymentNote('');
    setEditingPaymentId(null);
  };

  const handleEditPayment = (payment: PaymentTransaction) => {
      setEditingPaymentId(payment.id);
      setPaymentAmount(payment.amount.toString());
      setPaymentNote(payment.note || '');
      
      let dateVal = payment.date;
      if (dateVal) {
        if (dateVal.includes('T')) {
           dateVal = dateVal.split('T')[0];
        } else if (dateVal.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const parts = dateVal.split('.');
            dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      setPaymentDate(dateVal || new Date().toISOString().split('T')[0]);
  };

  // Wrapper function to strictly handle deletion event
  const handleDeletePaymentClick = (e: React.MouseEvent, paymentId: string) => {
      e.preventDefault();
      e.stopPropagation(); // Stop event bubbling immediately

      if (!selectedOrder) return;

      if (window.confirm("Bu tahsilat kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
          const currentHistory = selectedOrder.paymentHistory || [];
          const updatedHistory = currentHistory.filter(p => p.id !== paymentId);

          const updatedOrder = { 
              ...selectedOrder, 
              paymentHistory: updatedHistory 
          };

          onUpdateOrder(updatedOrder);
          
          if (editingPaymentId === paymentId) {
              setEditingPaymentId(null);
              setPaymentAmount('');
              setPaymentNote('');
          }
      }
  };

  const cancelEdit = () => {
      setEditingPaymentId(null);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddDelivery = (itemId: string) => {
    if (!selectedOrder || !deliveryQty) return;
    const qty = parseInt(deliveryQty);
    if (isNaN(qty) || qty <= 0) return;

    const updatedItems = selectedOrder.items.map(item => {
        if (item.id === itemId) {
            const newDelivery: Delivery = {
                id: Date.now().toString(),
                date: deliveryDate,
                quantity: qty
            };
            return { ...item, deliveries: [...item.deliveries, newDelivery] };
        }
        return item;
    });

    let newStatus = selectedOrder.status;
    if(newStatus === OrderStatus.PENDING || newStatus === OrderStatus.IN_PRODUCTION || newStatus === OrderStatus.IN_TRANSIT) {
        newStatus = OrderStatus.PARTIAL;
    }

    const updatedOrder = { ...selectedOrder, items: updatedItems, status: newStatus };
    onUpdateOrder(updatedOrder);
    setDeliveryQty('');
    setDeliveryItem('');
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    const updatedOrder = { ...selectedOrder, status: newStatus };
    onUpdateOrder(updatedOrder);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.APPROVED: return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.IN_PRODUCTION: return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.IN_TRANSIT: return 'bg-purple-100 text-purple-800 border-purple-200';
      case OrderStatus.SHIPPED: return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case OrderStatus.PARTIAL: return 'bg-orange-100 text-orange-800 border-orange-200';
      case OrderStatus.DELIVERED: return 'bg-slate-800 text-white border-slate-900';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const inputClass = "w-full border-slate-300 rounded focus:ring-primary focus:border-primary p-2 text-sm border bg-white text-slate-900";

  return (
    <div className="space-y-6">
      
      {/* 1. Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div 
            onClick={() => setActiveFilter('PENDING')}
            className={`p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${activeFilter === 'PENDING' ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-slate-200'}`}
        >
            <div className="absolute right-0 top-0 h-full w-1 bg-yellow-500"></div>
            <div className="text-yellow-600 text-xs font-bold uppercase tracking-wider mb-1">Onay Bekleyen</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.pending.toLocaleString('tr-TR')}</div>
             <div className="text-xs text-yellow-600 mt-1">Sipariş Adeti</div>
        </div>
        <div 
             onClick={() => setActiveFilter('IN_PRODUCTION')}
             className={`p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${activeFilter === 'IN_PRODUCTION' ? 'ring-2 ring-blue-400 border-blue-400' : 'border-slate-200'}`}
        >
             <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Üretimde Olan</div>
            <div className="text-2xl font-bold text-blue-900">{stats.inProduction.toLocaleString('tr-TR')}</div>
             <div className="text-xs text-blue-400 mt-1">Hatta Bekleyen</div>
        </div>
        <div 
             onClick={() => setActiveFilter('IN_TRANSIT')}
             className={`p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${activeFilter === 'IN_TRANSIT' ? 'ring-2 ring-purple-400 border-purple-400' : 'border-slate-200'}`}
        >
            <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
            <div className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-1">Yolda (TR->UK)</div>
            <div className="text-2xl font-bold text-purple-900">{stats.inTransit.toLocaleString('tr-TR')}</div>
             <div className="text-xs text-purple-400 mt-1">Sevkiyat Halinde</div>
        </div>
        <div 
             onClick={() => setActiveFilter('ALL')}
             className={`p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${activeFilter === 'ALL' ? 'ring-2 ring-orange-400 border-orange-400' : 'border-slate-200'}`}
        >
            <div className="absolute right-0 top-0 h-full w-1 bg-orange-500"></div>
            <div className="text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">Teslimat Bekleyen</div>
            <div className="text-2xl font-bold text-orange-900">{stats.remainingItems.toLocaleString('tr-TR')}</div>
             <div className="text-xs text-orange-400 mt-1">Kalan Bakiye</div>
        </div>
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart */}
        <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
             <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <BarChart3 size={20} className="text-indigo-600"/> En Çok Satan Esanslar
                </h3>
                {filterEssence ? (
                    <button 
                        onClick={() => setFilterEssence(null)}
                        className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-red-100"
                    >
                        <FilterX size={10}/> Filtreyi Temizle ({filterEssence})
                    </button>
                ) : (
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">TOP 5</span>
                )}
             </div>
             
             <div className="space-y-3 relative z-10">
                {sortedEssences.map(([name, qty], idx) => {
                    const percent = (qty / maxEssence) * 100;
                    const isSelected = filterEssence === name;
                    const isMuted = filterEssence && !isSelected;
                    const gradients = [
                        'bg-gradient-to-r from-blue-400 to-indigo-500',
                        'bg-gradient-to-r from-purple-400 to-pink-500',
                        'bg-gradient-to-r from-emerald-400 to-teal-500',
                        'bg-gradient-to-r from-orange-400 to-amber-500',
                        'bg-gradient-to-r from-cyan-400 to-blue-500',
                    ];
                    return (
                        <div 
                            key={name} 
                            onClick={() => setFilterEssence(isSelected ? null : name)}
                            className={`flex items-center gap-3 cursor-pointer group transition-all duration-300 ${isMuted ? 'opacity-30 grayscale' : 'opacity-100'}`}
                        >
                            <span className={`w-24 text-xs font-medium truncate text-right transition-colors ${isSelected ? 'text-indigo-600 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>{name}</span>
                            <div className={`flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative transition-transform ${isSelected ? 'scale-y-125' : 'group-hover:scale-y-110'}`}>
                                <div 
                                    className={`h-full rounded-full shadow-lg ${gradients[idx % gradients.length]} opacity-90`} 
                                    style={{width: `${percent}%`, transition: 'width 1s ease-out'}}
                                ></div>
                            </div>
                            <span className={`w-12 text-xs font-bold text-right ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>{(qty/1000).toFixed(1)}k</span>
                        </div>
                    )
                })}
             </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/30 transition-all duration-1000"></div>
             
             <div className="flex justify-between items-start mb-6 relative z-20">
                <div>
                     <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                        <TrendingUp size={20} className="text-primary-400"/> Aylık Ciro Trendi
                    </h3>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-white tracking-tight">
                        {trendData[trendData.length-1].value.toLocaleString('tr-TR')}
                        <span className="text-sm text-slate-500 font-normal ml-1">GBP</span>
                    </span>
                </div>
             </div>

             <div className="h-40 w-full relative z-30" onMouseLeave={() => setHoveredTrendData(null)}>
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                    {trendPath ? (
                        <>
                            <defs>
                                <linearGradient id="gradientAreaNew" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={trendPath.area} fill="url(#gradientAreaNew)" />
                            <path d={trendPath.path} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {trendPath.points.map((p, i) => (
                                <g key={i}>
                                    <rect 
                                        x={p.x - 5} y="0" width="10" height="50" 
                                        fill="transparent" 
                                        className="cursor-crosshair"
                                        onMouseEnter={() => setHoveredTrendData(p)}
                                    />
                                    {hoveredTrendData && hoveredTrendData.label === p.label && (
                                        <circle cx={p.x} cy={p.y} r="4" fill="#38bdf8" stroke="white" strokeWidth="2" />
                                    )}
                                </g>
                            ))}
                        </>
                    ) : null}
                </svg>

                {hoveredTrendData && (
                    <div 
                        className="absolute bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                        style={{ left: `${hoveredTrendData.x}%`, top: `${hoveredTrendData.y - 10}%` }}
                    >
                        <div className="font-bold">{hoveredTrendData.value.toLocaleString('tr-TR')} GBP</div>
                        <div className="text-slate-400 text-[8px] text-center">{hoveredTrendData.label}</div>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Date Range (Dark Theme) */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-200 pb-2">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
            {[
                { id: 'ALL', label: 'Tümü' },
                { id: 'PENDING', label: 'Onay Bekleyen' },
                { id: 'IN_PRODUCTION', label: 'Üretimde' },
                { id: 'IN_TRANSIT', label: 'Yolda' },
                { id: 'SHIPPED', label: 'Kargoya Verildi' },
                { id: 'DELIVERED', label: 'Tamamlandı' },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as FilterTab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeFilter === tab.id 
                        ? 'border-primary text-primary bg-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        
        {/* Dark Themed Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-800 p-2 rounded-lg shadow-md border border-slate-700 w-full md:w-auto">
            <div className="flex items-center gap-2 px-2 text-slate-300">
                <Filter size={14}/>
                <span className="text-xs font-bold uppercase tracking-wider">Tarih Aralığı</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-auto">
                    <input 
                        type="date" 
                        className="w-full sm:w-32 bg-slate-700 text-white text-xs border border-slate-600 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 outline-none transition-colors hover:bg-slate-600"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                </div>
                <span className="text-slate-500 hidden sm:inline">-</span>
                <div className="relative w-full sm:w-auto">
                    <input 
                        type="date" 
                        className="w-full sm:w-32 bg-slate-700 text-white text-xs border border-slate-600 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 outline-none transition-colors hover:bg-slate-600"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                </div>
            </div>

            {(dateRange.start || dateRange.end) && (
                <button 
                    onClick={() => setDateRange({start: '', end: ''})} 
                    className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors self-end sm:self-center"
                    title="Tarihleri Temizle"
                >
                    <X size={14}/>
                </button>
            )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">Bu kriterlere uygun sipariş bulunamadı.</p>
                {(filterEssence || dateRange.start || dateRange.end) && (
                    <div className="flex justify-center gap-2 mt-2">
                        {filterEssence && (
                            <button onClick={() => setFilterEssence(null)} className="text-primary text-sm hover:underline">
                                Esans Filtresini Kaldır
                            </button>
                        )}
                        {(dateRange.start || dateRange.end) && (
                             <button onClick={() => setDateRange({start:'', end:''})} className="text-primary text-sm hover:underline">
                                Tarih Filtresini Kaldır
                            </button>
                        )}
                    </div>
                )}
            </div>
        ) : (
            filteredOrders.map((order) => {
                const totalAmt = calculateOrderTotal(order);
                const balance = calculateBalance(order);
                const totalQty = getOrderTotalQty(order);
                const deliveredQty = getOrderDeliveredQty(order);
                const progress = totalQty > 0 ? Math.min(100, (deliveredQty / totalQty) * 100) : 0;
                
                return (
                <div 
                    key={order.id}
                    onClick={() => { setSelectedOrderId(order.id); onSelectOrder(order); }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full">
                        <div className="h-full bg-green-500 transition-all" style={{width: `${progress}%`}}></div>
                    </div>

                    <div className="p-5 flex flex-col md:flex-row gap-6 items-stretch">
                        <div className="flex-[2] flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                        {order.client.companyName}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border md:hidden ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col gap-2 mb-3">
                                    {order.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex items-center text-sm text-slate-600 gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                            <span className="font-medium text-slate-800">{item.specs.essenceName}</span>
                                            <span className="text-xs bg-slate-100 px-1.5 rounded text-slate-500">
                                                {item.specs.outerDimensions.width}x{item.specs.outerDimensions.height}cm
                                            </span>
                                            <span className="text-xs text-slate-400">({Number(item.quantity).toLocaleString('tr-TR')} ad)</span>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && <span className="text-xs text-slate-400 ml-3">+{order.items.length - 3} diğer</span>}
                                </div>
                            </div>

                            <div className="text-sm text-slate-500 flex gap-4 mt-2">
                                <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(order.orderDate).toLocaleDateString('tr-TR')}</span>
                                <span className="flex items-center gap-1 text-orange-600 font-medium">
                                    <Package size={14}/> {deliveredQty.toLocaleString('tr-TR')} / {totalQty.toLocaleString('tr-TR')} Teslim
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 border-l border-r border-slate-50 px-4 hidden md:flex flex-col justify-center items-center bg-slate-50/50 min-w-[120px]">
                            <div className="flex -space-x-3 overflow-hidden p-2">
                                {order.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="relative w-12 h-12 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-white z-0 hover:z-10 transition-all hover:scale-110">
                                        {item.imageUrl && !imgErrors[item.id] ? (
                                            <img 
                                                src={item.imageUrl} 
                                                alt={item.specs.essenceName} 
                                                className="w-full h-full object-cover" 
                                                onError={() => handleImageError(item.id)}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span className={`mt-2 px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-end text-right min-w-[140px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 pl-0 md:pl-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Toplam Tutar</div>
                                <div className="font-bold text-lg text-slate-900">{totalAmt.toLocaleString('tr-TR')} {order.financials.currency}</div>
                            </div>
                            
                            <div className="mt-3">
                                {balance > 0 ? (
                                    <>
                                        <div className="text-xs text-red-500 mb-0.5">Kalan Bakiye</div>
                                        <div className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 inline-block">
                                            {balance.toLocaleString('tr-TR')} {order.financials.currency}
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-green-600 text-sm font-bold flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-100">
                                        <CheckCircle2 size={16}/> Ödendi
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )})
        )}
      </div>

      {/* 5. Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedOrder.client.companyName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">#{selectedOrder.id}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-sm text-slate-500">{new Date(selectedOrder.orderDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            className="bg-white border border-slate-300 rounded px-3 py-1 text-sm font-medium text-slate-700"
                            value={selectedOrder.status}
                            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                        >
                            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => { setSelectedOrderId(null); setEditingPaymentId(null); setPaymentAmount(''); setPaymentNote(''); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Items & Delivery */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Items List */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Package size={20} /> Ürünler & Teslimat Durumu
                            </h3>
                            <div className="space-y-4">
                                {selectedOrder.items.map((item) => {
                                    const delivered = getItemDeliveredQty(item);
                                    const remaining = item.quantity - delivered;
                                    const percent = item.quantity > 0 ? Math.min(100, (delivered / item.quantity) * 100) : 0;

                                    return (
                                        <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                            {/* Header Item Info */}
                                            <div className="flex gap-4 items-start mb-3">
                                                {item.imageUrl && !imgErrors[item.id] ? (
                                                    <img 
                                                        src={item.imageUrl} 
                                                        alt="" 
                                                        className="w-16 h-16 rounded-md object-cover border border-slate-200 bg-white" 
                                                        onError={() => handleImageError(item.id)}
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-md bg-slate-200 flex items-center justify-center text-slate-400">
                                                        <ImageIcon size={24}/>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-lg">{item.specs.essenceName} Mendil</div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {item.specs.outerMaterial}, {item.specs.towelMaterial} ({item.specs.towelGsm}gsm)
                                                            </div>
                                                            <div className="text-xs text-slate-600 mt-0.5 font-semibold bg-white border border-slate-200 inline-block px-1 rounded">
                                                                Ebat: {item.specs.outerDimensions.width}x{item.specs.outerDimensions.height} cm
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-slate-900">{Number(item.quantity).toLocaleString('tr-TR')} Adet</div>
                                                            <div className="text-xs text-slate-500">x {item.unitPrice.toFixed(3)} {selectedOrder.financials.currency}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delivery Progress */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs font-semibold mb-1">
                                                    <span className="text-green-700">Teslim Edilen: {delivered.toLocaleString('tr-TR')}</span>
                                                    <span className="text-orange-600">Kalan: {remaining.toLocaleString('tr-TR')}</span>
                                                </div>
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 transition-all" style={{width: `${percent}%`}}></div>
                                                </div>
                                            </div>

                                            {/* Delivery History & Add Action */}
                                            <div className="bg-white border border-slate-200 rounded p-3">
                                                {item.deliveries.length > 0 && (
                                                    <ul className="mb-3 space-y-1">
                                                        {item.deliveries.map(d => (
                                                            <li key={d.id} className="text-xs flex justify-between text-slate-600 border-b border-slate-50 pb-1 last:border-0">
                                                                <span>{new Date(d.date).toLocaleDateString('tr-TR')}</span>
                                                                <span className="font-bold text-green-600">+{d.quantity.toLocaleString('tr-TR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                                    <span className="text-xs font-bold text-slate-400">Teslimat Gir:</span>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Miktar" 
                                                        className="w-24 border border-slate-300 rounded text-xs p-1 bg-white"
                                                        value={deliveryItem === item.id ? deliveryQty : ''}
                                                        onChange={e => { setDeliveryItem(item.id); setDeliveryQty(e.target.value); }}
                                                    />
                                                    <input 
                                                        type="date" 
                                                        className="border border-slate-300 rounded text-xs p-1 bg-white cursor-pointer"
                                                        value={deliveryDate}
                                                        onClick={(e) => e.currentTarget.showPicker()}
                                                        onChange={e => setDeliveryDate(e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => handleAddDelivery(item.id)}
                                                        disabled={deliveryItem !== item.id || !deliveryQty}
                                                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        Ekle
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Specs Summary */}
                         <div className="border-t pt-4">
                             <h4 className="font-bold text-slate-700 mb-2">Sipariş Notları</h4>
                             <p className="bg-amber-50 border border-amber-100 p-3 rounded text-sm text-amber-900">{selectedOrder.notes || 'Not yok.'}</p>
                         </div>
                    </div>

                    {/* Right Column: Financials */}
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 sticky top-24">
                             <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                <CreditCard size={18}/> Finansal Özet
                             </h3>
                             
                             <div className="space-y-3 mb-6 text-sm">
                                <div className="flex justify-between">
                                    <span>Ara Toplam:</span>
                                    <span className="font-medium">{selectedOrder.financials.subTotal.toLocaleString('tr-TR')} {selectedOrder.financials.currency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>KDV (%{selectedOrder.financials.vatRate}):</span>
                                    <span className="font-medium">{(selectedOrder.financials.subTotal * selectedOrder.financials.vatRate / 100).toLocaleString('tr-TR')} {selectedOrder.financials.currency}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-indigo-900 pt-2 border-t border-indigo-200">
                                    <span>Genel Toplam:</span>
                                    <span>{calculateOrderTotal(selectedOrder).toLocaleString('tr-TR')} {selectedOrder.financials.currency}</span>
                                </div>
                                
                                <div className="bg-white p-3 rounded border border-indigo-100 mt-4">
                                     <div className="flex justify-between text-green-600 mb-1">
                                        <span>Ödenen:</span>
                                        <span className="font-bold">{calculateTotalPaid(selectedOrder).toLocaleString('tr-TR')} {selectedOrder.financials.currency}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600 text-lg font-bold">
                                        <span>Kalan:</span>
                                        <span>{calculateBalance(selectedOrder).toLocaleString('tr-TR')} {selectedOrder.financials.currency}</span>
                                    </div>
                                </div>
                             </div>

                             {/* Payment Form */}
                             <div className={`bg-white p-4 rounded-lg border shadow-sm ${editingPaymentId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-indigo-100'}`}>
                                <label className="block text-xs font-bold text-slate-500 mb-2 flex justify-between">
                                    {editingPaymentId ? 'Ödemeyi Düzenle' : 'Yeni Tahsilat'}
                                    {editingPaymentId && <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><RotateCcw size={12}/> İptal</button>}
                                </label>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Açıklama (Örn: Peşinat)" 
                                        className={inputClass}
                                        value={paymentNote}
                                        onChange={e => setPaymentNote(e.target.value)}
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Tutar (İade için -)" 
                                        className={inputClass}
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                    />
                                    <input 
                                        type="date" 
                                        className={`${inputClass} cursor-pointer`}
                                        value={paymentDate}
                                        onClick={(e) => e.currentTarget.showPicker()}
                                        onChange={e => setPaymentDate(e.target.value)}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleSavePayment}
                                        className={`w-full py-2 rounded text-sm font-medium text-white transition-colors ${editingPaymentId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                    >
                                        {editingPaymentId ? 'Güncelle' : 'Tahsilat Ekle'}
                                    </button>
                                </div>
                             </div>

                             {/* History */}
                             <div className="mt-4">
                                <h4 className="font-bold text-slate-700 text-xs mb-2 uppercase">Ödeme Geçmişi</h4>
                                <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                                    <div className="flex justify-between p-2 bg-white rounded border border-slate-100 items-center">
                                        <div className="flex flex-col">
                                            <span>{new Date(selectedOrder.orderDate).toLocaleDateString('tr-TR')}</span>
                                            <span className="text-[10px] text-slate-400">Peşinat</span>
                                        </div>
                                        <span className="font-bold text-green-600">+{selectedOrder.financials.downPayment.toLocaleString('tr-TR')}</span>
                                    </div>
                                    {selectedOrder.paymentHistory?.map(p => (
                                        <div key={p.id} className={`flex justify-between p-2 bg-white rounded border border-slate-100 items-center group hover:bg-slate-50 transition-colors ${editingPaymentId === p.id ? 'border-amber-400 bg-amber-50' : ''}`}>
                                            <div className="flex flex-col">
                                                <span>{new Date(p.date).toLocaleDateString('tr-TR')}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{p.note}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold ${p.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {p.amount > 0 ? '+' : ''}{p.amount.toLocaleString('tr-TR')}
                                                </span>
                                                <div className="flex gap-1 relative z-50">
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditPayment(p); }}
                                                        className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-md shadow-sm border border-slate-200 cursor-pointer" 
                                                        title="Düzenle"
                                                    >
                                                        <Edit2 size={14} className="pointer-events-none"/>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => handleDeletePaymentClick(e, p.id)}
                                                        className="p-1.5 bg-white hover:bg-red-50 text-red-500 hover:text-red-700 rounded-md shadow-sm border border-slate-200 hover:border-red-300 cursor-pointer transition-all z-50" 
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={14} className="pointer-events-none"/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
