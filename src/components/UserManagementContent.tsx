import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  User,
  Shield,
  Stethoscope,
  CheckCircle,
  XCircle,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Doktor, Uzmanlik } from '../types';

interface AdminUser {
  id: string;
  kullanici_adi: string;
  sifre: string;
  olusturulma_tarihi?: string;
}

interface DoktorGiris {
  id: string;
  doktor_id: string;
  kullanici_adi: string;
  sifre: string;
  olusturulma_tarihi?: string;
  doktor?: Doktor;
}

const UserManagementContent = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [doktorUsers, setDoktorUsers] = useState<DoktorGiris[]>([]);
  const [doctors, setDoctors] = useState<Doktor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'admin' | 'doctor'>('admin');

  // New user form states
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    kullanici_adi: '',
    sifre: '',
    doktor_id: ''
  });

  // Edit user states
  const [editingUser, setEditingUser] = useState<AdminUser | DoktorGiris | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doktor')
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          aktif,
          uzmanlik:uzmanliklar!uzmanlik_id (
            ad
          )
        `)
        .eq('aktif', true)
        .order('ad', { ascending: true });

      if (error) throw error;
      setDoctors(data || []);
    } catch (err) {
      console.error('Doktorlar yüklenirken hata:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin users
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id, kullanici_adi, sifre')
        .order('kullanici_adi', { ascending: true });

      if (adminError) throw adminError;

      // Fetch doctor users
      const { data: doktorData, error: doktorError } = await supabase
        .from('doktor_giris')
        .select(`
          id, 
          doktor_id, 
          kullanici_adi, 
          sifre, 
          doktor:doktor_id (
            id,
            ad,
            soyad,
            unvan,
            uzmanlik:uzmanliklar!uzmanlik_id (
              ad
            )
          )
        `)
        .order('kullanici_adi', { ascending: true });

      if (doktorError) throw doktorError;

      setAdminUsers(adminData || []);
      setDoktorUsers(doktorData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.kullanici_adi.trim() || !newUser.sifre.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    if (activeTab === 'doctor' && !newUser.doktor_id) {
      setError('Doktor seçimi gereklidir');
      return;
    }

    try {
      setError(null);

      if (activeTab === 'admin') {
        const { data, error } = await supabase
          .from('admin')
          .insert([{
            kullanici_adi: newUser.kullanici_adi.trim(),
            sifre: newUser.sifre.trim()
          }])
          .select()
          .single();

        if (error) throw error;
        setAdminUsers(prev => [data, ...prev]);
      } else {
        // Check if doctor already has a login
        const { data: existingLogin, error: checkError } = await supabase
          .from('doktor_giris')
          .select('id')
          .eq('doktor_id', newUser.doktor_id)
          .limit(1);

        if (checkError) {
          throw checkError;
        }

        if (existingLogin && existingLogin.length > 0) {
          setError('Bu doktor için zaten bir giriş hesabı mevcut');
          return;
        }

        const { data, error } = await supabase
          .from('doktor_giris')
          .insert([{
            doktor_id: newUser.doktor_id,
            kullanici_adi: newUser.kullanici_adi.trim(),
            sifre: newUser.sifre.trim()
          }])
          .select(`
            id, 
            doktor_id, 
            kullanici_adi, 
            sifre, 
            doktor:doktor_id (
              id,
              ad,
              soyad,
              unvan,
              uzmanlik:uzmanliklar!uzmanlik_id (
                ad
              )
            )
          `)
          .single();

        if (error) throw error;
        setDoktorUsers(prev => [data, ...prev]);
      }

      setNewUser({
        kullanici_adi: '',
        sifre: '',
        doktor_id: ''
      });
      setShowNewUserForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı oluşturulurken hata oluştu');
    }
  };

  const updateUser = async () => {
    if (!editingUser || !editingUser.kullanici_adi.trim() || !editingUser.sifre.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    try {
      setError(null);

      if ('doktor_id' in editingUser) {
        // Doctor user
        const { data, error } = await supabase
          .from('doktor_giris')
          .update({
            kullanici_adi: editingUser.kullanici_adi.trim(),
            sifre: editingUser.sifre.trim()
          })
          .eq('id', editingUser.id)
          .select(`
            id, 
            doktor_id, 
            kullanici_adi, 
            sifre, 
            doktor:doktor_id (
              id,
              ad,
              soyad,
              unvan,
              uzmanlik:uzmanliklar!uzmanlik_id (
                ad
              )
            )
          `)
          .single();

        if (error) throw error;
        setDoktorUsers(prev => prev.map(user => 
          user.id === editingUser.id ? data : user
        ));
      } else {
        // Admin user
        const { data, error } = await supabase
          .from('admin')
          .update({
            kullanici_adi: editingUser.kullanici_adi.trim(),
            sifre: editingUser.sifre.trim()
          })
          .eq('id', editingUser.id)
          .select()
          .single();

        if (error) throw error;
        setAdminUsers(prev => prev.map(user => 
          user.id === editingUser.id ? data : user
        ));
      }

      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı güncellenirken hata oluştu');
    }
  };

  const deleteUser = async (user: AdminUser | DoktorGiris) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      setError(null);

      if ('doktor_id' in user) {
        // Doctor user
        const { error } = await supabase
          .from('doktor_giris')
          .delete()
          .eq('id', user.id);

        if (error) throw error;
        setDoktorUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        // Admin user
        const { error } = await supabase
          .from('admin')
          .delete()
          .eq('id', user.id);

        if (error) throw error;
        setAdminUsers(prev => prev.filter(u => u.id !== user.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı silinirken hata oluştu');
    }
  };

  const handleEditUser = (user: AdminUser | DoktorGiris) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const getFilteredUsers = () => {
    const users = activeTab === 'admin' ? adminUsers : doktorUsers;
    if (!searchTerm) return users;

    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => {
      const matchesUsername = user.kullanici_adi.toLowerCase().includes(searchLower);
      if ('doktor' in user && user.doktor) {
        const matchesDoctor = 
          user.doktor.ad.toLowerCase().includes(searchLower) ||
          user.doktor.soyad.toLowerCase().includes(searchLower);
        return matchesUsername || matchesDoctor;
      }
      return matchesUsername;
    });
  };

  const getAvailableDoctors = () => {
    const usedDoctorIds = doktorUsers.map(user => user.doktor_id);
    return doctors.filter(doctor => !usedDoctorIds.includes(doctor.id));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Kullanıcılar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
          <button
            onClick={() => setShowNewUserForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kullanıcı</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* New User Form */}
      {showNewUserForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Kullanıcı Ekle</h3>
          
          {/* User Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Türü
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="admin"
                  checked={activeTab === 'admin'}
                  onChange={(e) => setActiveTab(e.target.value as 'admin' | 'doctor')}
                  className="mr-2"
                />
                <Shield className="w-4 h-4 mr-1" />
                Admin
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="doctor"
                  checked={activeTab === 'doctor'}
                  onChange={(e) => setActiveTab(e.target.value as 'admin' | 'doctor')}
                  className="mr-2"
                />
                <Stethoscope className="w-4 h-4 mr-1" />
                Doktor
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                value={newUser.kullanici_adi}
                onChange={(e) => setNewUser({...newUser, kullanici_adi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="kullaniciadi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre *
              </label>
              <input
                type="password"
                value={newUser.sifre}
                onChange={(e) => setNewUser({...newUser, sifre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {activeTab === 'doctor' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doktor Seçimi *
                </label>
                <select
                  value={newUser.doktor_id}
                  onChange={(e) => setNewUser({...newUser, doktor_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Doktor seçin</option>
                  {getAvailableDoctors().map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.unvan} {doctor.ad} {doctor.soyad} 
                      {doctor.uzmanlik?.ad && ` - ${doctor.uzmanlik.ad}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowNewUserForm(false);
                setNewUser({
                  kullanici_adi: '',
                  sifre: '',
                  doktor_id: ''
                });
                setError(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={createUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kullanıcı Ekle
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'admin'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Kullanıcıları ({adminUsers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'doctor'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doktor Kullanıcıları ({doktorUsers.length})</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Kullanıcı adı veya doktor adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {getFilteredUsers().length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Arama kriterlerinize uygun kullanıcı bulunamadı.' 
                : `Henüz hiç ${activeTab === 'admin' ? 'admin' : 'doktor'} kullanıcısı bulunmuyor.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı Bilgileri
                  </th>
                  {activeTab === 'doctor' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doktor Bilgileri
                    </th>
                  )}
                  {activeTab === 'doctor' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturulma Tarihi
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredUsers().map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {activeTab === 'admin' ? (
                            <Shield className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.kullanici_adi}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activeTab === 'admin' ? 'Admin Kullanıcı' : 'Doktor Kullanıcı'}
                          </div>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'doctor' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {('doktor' in user && user.doktor) ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.doktor.unvan} {user.doktor.ad} {user.doktor.soyad}
                            </div>
                            {user.doktor.uzmanlik?.ad && (
                              <div className="text-sm text-gray-500">
                                {user.doktor.uzmanlik.ad}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Doktor bilgisi yok</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı Düzenle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  value={editingUser.kullanici_adi}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    kullanici_adi: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={editingUser.sifre}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    sifre: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={updateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementContent;