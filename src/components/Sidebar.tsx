import React from 'react';
import { 
  Home, 
  Calendar, 
  FileText, 
  Phone, 
  UserPlus, 
  Users, 
  Stethoscope,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeMenuItem: string;
  onMenuItemClick: (menuId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  callNotificationCount?: number;
  userRole?: 'admin' | 'doctor' | null;
  onLogout?: () => void;
  doctorInfo?: {ad: string, soyad: string, email?: string} | null;
}

const menuItems = [
  { id: 'dashboard', title: 'Ana Sayfa', icon: Home, roles: ['admin'] },
  { id: 'appointments', title: 'Randevu Kayıtları', icon: Calendar, roles: ['admin', 'doctor'] },
  { id: 'forms', title: 'Form Kayıtları', icon: FileText, roles: ['admin'] },
  { id: 'calls', title: 'Çağrı Kayıtları', icon: Phone, roles: ['admin'] },
  { id: 'create-person', title: 'Arama Listesi - Kişi Oluştur', icon: UserPlus, roles: ['admin'] },
  { id: 'doctors', title: 'Doktor/Takvim', icon: Stethoscope, roles: ['admin', 'doctor'] },
  { id: 'services', title: 'Hizmetler', icon: Users, roles: ['admin'] },
  { id: 'specialties', title: 'Uzmanlık Alanları', icon: GraduationCap, roles: ['admin'] },
  { id: 'user-management', title: 'Kullanıcı Yönetimi', icon: Settings, roles: ['admin'] },
];

const Sidebar = React.memo(({ 
  activeMenuItem, 
  onMenuItemClick, 
  isCollapsed, 
  onToggleCollapse,
  callNotificationCount = 0,
  userRole,
  onLogout,
  doctorInfo
}: SidebarProps) => {

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  const getFilteredMenuItems = () => {
    if (!userRole) return [];
    const filteredItems = menuItems.filter(item => item.roles.includes(userRole));
    
    // Doktor rolü için menü başlıklarını kişiselleştir
    if (userRole === 'doctor') {
      return filteredItems.map(item => {
        if (item.id === 'appointments') {
          return { ...item, title: 'Randevularım' };
        }
        if (item.id === 'doctors') {
          return { ...item, title: 'Takvimim' };
        }
        return item;
      });
    }
    
    return filteredItems;
  };

  const getNotificationCount = (menuId: string) => {
    switch (menuId) {
      case 'calls': return callNotificationCount;
      default: return 0;
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">CallCenter</h1>
              <p className="text-xs text-gray-500">Otomasyon Sistemi</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {getFilteredMenuItems().map((item) => {
          const IconComponent = item.icon;
          const isActive = activeMenuItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onMenuItemClick(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 relative ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.title : undefined}
            >
              <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm truncate">{item.title}</span>
                  {getNotificationCount(item.id) > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ml-2">
                      {getNotificationCount(item.id)}
                    </span>
                  )}
                </div>
              )}
              {isCollapsed && getNotificationCount(item.id) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {getNotificationCount(item.id) > 99 ? '99+' : getNotificationCount(item.id)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {userRole === 'admin' ? 'Admin Kullanıcı' : 
                 (doctorInfo && doctorInfo.ad && doctorInfo.soyad ? `${doctorInfo.ad} ${doctorInfo.soyad}` : 'Doktor Kullanıcı')}
              </p>
              <p className="text-xs text-gray-500">
                {userRole === 'admin' ? 'admin@sistem.com' : 
                 (doctorInfo?.email || 'doktor@sistem.com')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Collapsed Footer */}
      {isCollapsed && (
        <div className="p-2 border-t border-gray-200">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;