import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Hizmet, Uzmanlik } from '../types';

const ServicesContent = () => {
  const [services, setServices] = useState<Hizmet[]>([]);
  const [uzmanliklar, setUzmanliklar] = useState<Uzmanlik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uzmanlikFilter, setUzmanlikFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New service form states
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newService, setNewService] = useState({
    hizmet_adi: '',
    uzmanlik_id: '',
    fiyat: '',
    sure_dakika: '',
    aciklama: '',
    aktif: true
  });

  // Edit service states
  const [editingService, setEditingService] = useState<Hizmet | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchUzmanliklar();
  }, []);

  const fetchUzmanliklar = async () => {
    try {
      const { data, error } = await supabase
        .from('uzmanliklar')
        .select('id, ad')
        .order('ad', { ascending: true });

      if (error) throw error;
      setUzmanliklar(data || []);
    } catch (err) {
      console.error('Uzmanlıklar yüklenirken hata:', err);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('hizmetler')
        .select('id, hizmet_adi, fiyat, sure_dakika, aciklama, aktif, olusturulma_tarihi, uzmanlik_id, uzmanlik:uzmanliklar!uzmanlik_id (ad)')
        .order('olusturulma_tarihi', { ascending: false });

      if (error) throw error;

      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    if (!newService.hizmet_adi.trim()) {
      setError('Hizmet adı gereklidir');
      return;
    }

    try {
      setError(null);

      const serviceData = {
        hizmet_adi: newService.hizmet_adi.trim(),
        uzmanlik_id: newService.uzmanlik_id ? Number(newService.uzmanlik_id) : null,
        fiyat: newService.fiyat ? parseFloat(newService.fiyat) : null,
        sure_dakika: newService.sure_dakika ? parseInt(newService.sure_dakika) : null,
        aciklama: newService.aciklama.trim() || null,
        aktif: newService.aktif
      };

      const { data, error } = await supabase
        .from('hizmetler')
        .insert([serviceData])
        .select(`
          id, 
          hizmet_adi, 
          fiyat, 
          sure_dakika, 
          aciklama, 
          aktif, 
          olusturulma_tarihi, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .single();

      if (error) throw error;

      setServices(prev => [data, ...prev]);
      setNewService({
        hizmet_adi: '',
        uzmanlik_id: '',
        fiyat: '',
        sure_dakika: '',
        aciklama: '',
        aktif: true
      });
      setShowNewServiceForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hizmet oluşturulurken hata oluştu');
    }
  };

  const updateService = async () => {
    if (!editingService || !editingService.hizmet_adi.trim()) {
      setError('Hizmet adı gereklidir');
      return;
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('hizmetler')
        .update({
          hizmet_adi: editingService.hizmet_adi.trim(),
          uzmanlik_id: editingService.uzmanlik_id ? Number(editingService.uzmanlik_id) : null,
          fiyat: editingService.fiyat || null,
          sure_dakika: editingService.sure_dakika || null,
          aciklama: editingService.aciklama?.trim() || null,
          aktif: editingService.aktif
        })
        .eq('id', editingService.id)
        .select(`
          id, 
          hizmet_adi, 
          fiyat, 
          sure_dakika, 
          aciklama, 
          aktif, 
          olusturulma_tarihi, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .single();

      if (error) throw error;

      setServices(prev => prev.map(service => 
        service.id === editingService.id ? data : service
      ));

      setShowEditModal(false);
      setEditingService(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hizmet güncellenirken hata oluştu');
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Bu hizmeti pasif hale getirmek istediğinizden emin misiniz? (Hizmet silinmez, sadece pasif duruma geçer)')) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('hizmetler')
        .update({ aktif: false })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === id ? { ...service, aktif: false } : service
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hizmet pasif hale getirilirken hata oluştu');
    }
  };

  const handleEditService = (service: Hizmet) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const filteredServices = services.filter(service => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      service.hizmet_adi.toLowerCase().includes(searchLower) ||
      service.uzmanlik?.ad?.toLowerCase().includes(searchLower) ||
      service.aciklama?.toLowerCase().includes(searchLower)
    );
    
    const matchesUzmanlik = uzmanlikFilter === 'all' || 
      service.uzmanlik_id?.toString() === uzmanlikFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && service.aktif) ||
      (statusFilter === 'inactive' && !service.aktif);
    
    return matchesSearch && matchesUzmanlik && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Hizmetler yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hizmetler</h1>
          <p className="text-gray-600">Sunduğunuz hizmetleri yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchServices}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
          <button
            onClick={() => setShowNewServiceForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Hizmet</span>
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

      {/* New Service Form */}
      {showNewServiceForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Hizmet Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hizmet Adı *
              </label>
              <input
                type="text"
                value={newService.hizmet_adi}
                onChange={(e) => setNewService({...newService, hizmet_adi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Genel Muayene"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uzmanlık Alanı
              </label>
              <select
                value={newService.uzmanlik_id}
                onChange={(e) => setNewService({...newService, uzmanlik_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Uzmanlık seçin</option>
                {uzmanliklar.map(uzmanlik => (
                  <option key={uzmanlik.id.toString()} value={uzmanlik.id.toString()}>
                    {uzmanlik.ad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiyat (₺)
              </label>
              <input
                type="number"
                step="0.01"
                value={newService.fiyat}
                onChange={(e) => setNewService({...newService, fiyat: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Süre (Dakika)
              </label>
              <input
                type="number"
                value={newService.sure_dakika}
                onChange={(e) => setNewService({...newService, sure_dakika: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={newService.aciklama}
                onChange={(e) => setNewService({...newService, aciklama: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hizmet açıklaması..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newService.aktif}
                  onChange={(e) => setNewService({...newService, aktif: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Hizmet aktif</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowNewServiceForm(false);
                setNewService({
                  hizmet_adi: '',
                  uzmanlik_id: '',
                  fiyat: '',
                  sure_dakika: '',
                  aciklama: '',
                  aktif: true
                });
                setError(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={createService}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Hizmet Ekle
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Hizmet adı, kategori veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-48">
              <select
                value={uzmanlikFilter}
                onChange={(e) => setUzmanlikFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Uzmanlıklar</option>
                {uzmanliklar.map(uzmanlik => (
                  <option key={uzmanlik.id.toString()} value={uzmanlik.id.toString()}>
                    {uzmanlik.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hizmet bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || uzmanlikFilter !== 'all' || statusFilter !== 'all'
                ? 'Arama kriterlerinize uygun hizmet bulunamadı.' 
                : 'Henüz hiç hizmet kaydı bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hizmet Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uzmanlık
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fiyat & Süre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {service.hizmet_adi}
                          </div>
                          {service.aciklama && (
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {service.aciklama}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.uzmanlik?.ad ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <Tag className="w-4 h-4 mr-2 text-gray-400" />
                          {service.uzmanlik.ad}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Uzmanlık yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {service.fiyat && (
                          <div className="text-sm text-gray-900 flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                            {service.fiyat.toLocaleString('tr-TR', { 
                              style: 'currency', 
                              currency: 'TRY' 
                            })}
                          </div>
                        )}
                        {service.sure_dakika && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            {service.sure_dakika} dakika
                          </div>
                        )}
                        {!service.fiyat && !service.sure_dakika && (
                          <span className="text-sm text-gray-400">Bilgi yok</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {service.aktif ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Aktif</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Pasif</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteService(service.id)}
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

      {/* Summary */}
      {filteredServices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-blue-800 font-medium">
                Toplam: {filteredServices.length} hizmet
              </span>
              <span className="text-blue-600">
                Aktif: {filteredServices.filter(s => s.aktif).length}
              </span>
              <span className="text-blue-600">
                Pasif: {filteredServices.filter(s => !s.aktif).length}
              </span>
            </div>
            {(searchTerm || uzmanlikFilter !== 'all' || statusFilter !== 'all') && (
              <span className="text-blue-600">
                Filtrelenmiş sonuçlar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hizmet Düzenle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hizmet Adı *
                </label>
                <input
                  type="text"
                  value={editingService.hizmet_adi}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    hizmet_adi: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uzmanlık Alanı
                </label>
                <select
                  value={editingService.uzmanlik_id?.toString() || ''}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    uzmanlik_id: e.target.value ? BigInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Uzmanlık seçin</option>
                  {uzmanliklar.map(uzmanlik => (
                    <option key={uzmanlik.id.toString()} value={uzmanlik.id.toString()}>
                      {uzmanlik.ad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fiyat (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingService.fiyat || ''}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    fiyat: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Süre (Dakika)
                </label>
                <input
                  type="number"
                  value={editingService.sure_dakika || ''}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    sure_dakika: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={editingService.aciklama || ''}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    aciklama: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingService.aktif}
                    onChange={(e) => setEditingService({
                      ...editingService,
                      aktif: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Hizmet aktif</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingService(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={updateService}
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

export default ServicesContent;