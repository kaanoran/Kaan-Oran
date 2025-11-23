
import React from 'react';
import { Menu, PlusCircle, List, Users, BookOpen, Search, X, FileBarChart } from 'lucide-react';

export type TabType = 'dashboard' | 'new-order' | 'customers' | 'catalog' | 'reports';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, searchQuery, onSearchChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const NavButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => (
    <button
      onClick={() => onNavigate(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        activeTab === tab 
        ? 'bg-primary/10 text-primary' 
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Z-Index 60 to stay above modals for home navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60] shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo - Click to go Dashboard */}
          <div 
            className="flex items-center gap-2 cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity p-1 rounded" 
            onClick={() => onNavigate('dashboard')}
            title="Ana Sayfaya Dön"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              OW
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">OnsWipes<span className="text-primary">Pro</span></h1>
          </div>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-lg mx-4">
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-full leading-5 bg-slate-50 text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                  placeholder="Ara (Müşteri, Ürün, Sipariş No)..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
             </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-2 items-center flex-shrink-0">
            <NavButton tab="dashboard" icon={List} label="Siparişler" />
            <NavButton tab="customers" icon={Users} label="Müşteriler" />
            <NavButton tab="catalog" icon={BookOpen} label="Katalog" />
            <NavButton tab="reports" icon={FileBarChart} label="Raporlar" />
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button
              onClick={() => onNavigate('new-order')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'new-order' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <PlusCircle size={16} />
              Sipariş
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu />
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 shadow-lg space-y-1">
            <button onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-slate-600 font-medium">Sipariş Listesi</button>
            <button onClick={() => { onNavigate('customers'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-slate-600 font-medium">Müşteriler</button>
            <button onClick={() => { onNavigate('catalog'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-slate-600 font-medium">Ürün Kataloğu</button>
            <button onClick={() => { onNavigate('reports'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-slate-600 font-medium">Raporlar</button>
            <button onClick={() => { onNavigate('new-order'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-primary font-bold">Yeni Sipariş</button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:w-full print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;
