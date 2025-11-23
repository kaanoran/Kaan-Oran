
import React, { useState } from 'react';
import { CatalogItem, ProductSpecs } from '../types';
import { Layers, Box, Droplets, ArrowRight, Edit, Plus, Save, X, Trash, Image as ImageIcon, ChevronLeft, Home } from 'lucide-react';

interface ProductCatalogProps {
  items: CatalogItem[];
  searchQuery: string;
  onSelectProduct: (item: CatalogItem) => void;
  onUpdateProduct: (item: CatalogItem) => void;
  onAddProduct: (item: CatalogItem) => void;
  customMaterials: string[];
  customTowelTypes: string[];
  onAddCustomMaterial: (material: string) => void;
  onAddCustomTowelType: (type: string) => void;
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

const ProductCatalog: React.FC<ProductCatalogProps> = ({ 
    items, 
    searchQuery,
    onSelectProduct, 
    onUpdateProduct, 
    onAddProduct,
    customMaterials,
    customTowelTypes,
    onAddCustomMaterial,
    onAddCustomTowelType
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CatalogItem | null>(null);
  const [showNewMaterialInput, setShowNewMaterialInput] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [showNewTowelInput, setShowNewTowelInput] = useState(false);
  const [newTowelName, setNewTowelName] = useState('');

  const startEditing = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormData(JSON.parse(JSON.stringify(item))); 
  };

  const startCreating = () => {
    const newItem: CatalogItem = {
        id: Date.now().toString(),
        title: 'Yeni Ürün Şablonu',
        description: 'Ürün açıklaması...',
        basePrice: 0.000,
        specs: defaultSpecs
    };
    setFormData(newItem);
    setEditingId('new');
  };

  const handleSave = () => {
    if (!formData) return;
    if (editingId === 'new') {
        onAddProduct(formData);
    } else {
        onUpdateProduct(formData);
    }
    setEditingId(null);
    setFormData(null);
  };

  const handleAddNewMaterial = () => {
    if(newMaterialName.trim()){
        onAddCustomMaterial(newMaterialName);
        if(formData) setFormData({...formData, specs: {...formData.specs, outerMaterial: newMaterialName}});
        setNewMaterialName('');
        setShowNewMaterialInput(false);
    }
  };

  const handleAddNewTowel = () => {
     if(newTowelName.trim()){
        onAddCustomTowelType(newTowelName);
        if(formData) setFormData({...formData, specs: {...formData.specs, towelMaterial: newTowelName as any}});
        setNewTowelName('');
        setShowNewTowelInput(false);
    }
  };

  // Filter Logic
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  });

  const inputClass = "w-full border-slate-300 rounded focus:ring-primary focus:border-primary p-2 text-sm border bg-white text-slate-900";

  // Modal or Inline Edit Form
  const EditForm = () => {
    if (!formData) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-900">{editingId === 'new' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}</h2>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-800"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Ürün Adı</label>
                            <input type="text" className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Baz Fiyat (Tahmini GBP)</label>
                            <input type="number" step="0.001" className={inputClass} value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama</label>
                            <input type="text" className={inputClass} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 mb-1">Görsel URL</label>
                             <div className="flex gap-2">
                                <input type="text" placeholder="https://..." className={inputClass} value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                                {formData.imageUrl && (
                                    <img src={formData.imageUrl} alt="Önizleme" className="w-10 h-10 object-cover rounded border" />
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Specs Section */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Outer */}
                        <div className="space-y-3 border p-3 rounded-lg bg-slate-50">
                            <h4 className="font-bold text-slate-700 text-sm">Dış Ambalaj</h4>
                            <div>
                                <label className="text-xs text-slate-500">Malzeme</label>
                                {!showNewMaterialInput ? (
                                    <div className="flex gap-2">
                                        <select className={inputClass} value={formData.specs.outerMaterial} onChange={e => setFormData({...formData, specs: {...formData.specs, outerMaterial: e.target.value}})}>
                                            <option>Kuşe Kağıt + PE</option>
                                            <option>Triplex (PET/ALU/PE)</option>
                                            <option>PET + PE (Metalize)</option>
                                            {customMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <button onClick={() => setShowNewMaterialInput(true)} className="p-2 bg-slate-200 rounded hover:bg-slate-300" title="Yeni Ekle"><Plus size={16}/></button>
                                    </div>
                                ) : (
                                     <div className="flex gap-2">
                                        <input autoFocus type="text" className={inputClass} placeholder="Yeni Malzeme..." value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} />
                                        <button onClick={handleAddNewMaterial} className="p-2 bg-green-500 text-white rounded"><Save size={16}/></button>
                                        <button onClick={() => setShowNewMaterialInput(false)} className="p-2 bg-slate-300 text-slate-700 rounded"><X size={16}/></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">En (cm)</label>
                                    <input type="number" className={inputClass} value={formData.specs.outerDimensions.width} onChange={e => setFormData({...formData, specs: {...formData.specs, outerDimensions: {...formData.specs.outerDimensions, width: Number(e.target.value)}}})} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">Boy (cm)</label>
                                    <input type="number" className={inputClass} value={formData.specs.outerDimensions.height} onChange={e => setFormData({...formData, specs: {...formData.specs, outerDimensions: {...formData.specs.outerDimensions, height: Number(e.target.value)}}})} />
                                </div>
                            </div>
                        </div>

                         {/* Towel */}
                        <div className="space-y-3 border p-3 rounded-lg bg-slate-50">
                            <h4 className="font-bold text-slate-700 text-sm">İç Havlu</h4>
                            <div>
                                <label className="text-xs text-slate-500">Tip</label>
                                {!showNewTowelInput ? (
                                    <div className="flex gap-2">
                                        <select className={inputClass} value={formData.specs.towelMaterial} onChange={e => setFormData({...formData, specs: {...formData.specs, towelMaterial: e.target.value as any}})}>
                                            <option>Nonwoven Spunlace</option>
                                            <option>Thermal Bond</option>
                                            <option>Airlaid</option>
                                            {customTowelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <button onClick={() => setShowNewTowelInput(true)} className="p-2 bg-slate-200 rounded hover:bg-slate-300" title="Yeni Ekle"><Plus size={16}/></button>
                                    </div>
                                ) : (
                                     <div className="flex gap-2">
                                        <input autoFocus type="text" className={inputClass} placeholder="Yeni Havlu Tipi..." value={newTowelName} onChange={e => setNewTowelName(e.target.value)} />
                                        <button onClick={handleAddNewTowel} className="p-2 bg-green-500 text-white rounded"><Save size={16}/></button>
                                        <button onClick={() => setShowNewTowelInput(false)} className="p-2 bg-slate-300 text-slate-700 rounded"><X size={16}/></button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Gramaj (gsm)</label>
                                <input type="number" className={inputClass} value={formData.specs.towelGsm} onChange={e => setFormData({...formData, specs: {...formData.specs, towelGsm: Number(e.target.value)}})} />
                            </div>
                        </div>

                        {/* Solution */}
                         <div className="space-y-3 border p-3 rounded-lg bg-slate-50">
                            <h4 className="font-bold text-slate-700 text-sm">Solüsyon</h4>
                            <div>
                                <label className="text-xs text-slate-500">Koku</label>
                                <input type="text" className={inputClass} value={formData.specs.essenceName} onChange={e => setFormData({...formData, specs: {...formData.specs, essenceName: e.target.value}})} />
                            </div>
                             <div>
                                <label className="text-xs text-slate-500">Miktar (gr)</label>
                                <input type="number" className={inputClass} value={formData.specs.essenceAmount} onChange={e => setFormData({...formData, specs: {...formData.specs, essenceAmount: Number(e.target.value)}})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">İptal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 flex items-center gap-2">
                        <Save size={16} /> Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      {editingId && <EditForm />}

      {/* Explicit Home Button */}
      <div className="flex items-center gap-2 mb-2 text-slate-500 hover:text-primary cursor-pointer w-fit" onClick={() => window.location.reload()}> 
        <Home size={16} /> <span className="text-sm font-medium">Ana Sayfa</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Ürün Kataloğu</h2>
            <p className="text-slate-500">Private Label üretimi için standart ürün şablonları</p>
        </div>
        <button onClick={startCreating} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus size={20} /> Yeni Ürün Ekle
        </button>
      </div>
      
      {filteredItems.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
              Ürün bulunamadı.
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group">
            
            <button 
                onClick={() => startEditing(item)}
                className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 bg-white/80 p-1.5 rounded-full backdrop-blur-sm border border-transparent hover:border-blue-200 transition-all z-10"
                title="Ürünü Düzenle"
            >
                <Edit size={18} />
            </button>

            {/* Image Section */}
            <div className="h-48 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <ImageIcon className="text-slate-300" size={48} />
                )}
            </div>

            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-2 pr-8">
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                {item.basePrice && (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                        ~{item.basePrice.toFixed(3)} £/adet
                    </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mb-6">{item.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                        <Layers size={16} /> Dış Ambalaj
                    </div>
                    <ul className="space-y-1 text-slate-600 text-xs">
                        <li>Malzeme: {item.specs.outerMaterial}</li>
                        <li>Katman: {item.specs.outerLayerCount} Kat</li>
                        <li>Ölçü: {item.specs.outerDimensions.width}x{item.specs.outerDimensions.height} cm</li>
                    </ul>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                        <Box size={16} /> İç Havlu
                    </div>
                    <ul className="space-y-1 text-slate-600 text-xs">
                        <li>Tip: {item.specs.towelMaterial}</li>
                        <li>Gramaj: {item.specs.towelGsm} gsm</li>
                        <li>Açık Ölçü: {item.specs.towelDimensionsOpen.width}x{item.specs.towelDimensionsOpen.height} cm</li>
                    </ul>
                </div>
                
                <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <div className="flex items-center gap-2 font-semibold text-blue-800 mb-1">
                        <Droplets size={16} /> Solüsyon
                    </div>
                    <p className="text-blue-700 text-xs">
                        {item.specs.essenceAmount} gr - {item.specs.essenceName} ({item.specs.alcoholFree ? 'Alkolsüz' : 'Alkollü'})
                    </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200">
              <button 
                onClick={() => onSelectProduct(item)}
                className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                Sipariş Taslağına Ekle <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCatalog;
