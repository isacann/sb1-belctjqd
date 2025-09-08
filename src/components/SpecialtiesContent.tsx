import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  Save,
  X,
  BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Uzmanlik } from '../types';

const SpecialtiesContent = () => {
  const [specialties, setSpecialties] = useState<Uzmanlik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New specialty form states
  const [showNewSpecialtyForm, setShowNewSpecialtyForm] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState({
    ad: '',
    aciklama: ''
  });

  // Edit specialty states
  const [editingSpecialty, setEditingSpecialty] = useState<Uzmanlik | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('uzmanliklar')
        .select('id, ad, aciklama')
        .order('ad', { ascending: true });

      if (error) throw error;

      setSpecialties(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createSpecialty = async () => {
    if (!newSpecialty.ad.trim()) {
      setError('Uzmanlık alanı adı gereklidir');
      return;
    }

    try {
      setError(null);

      // Ensure first letter is capitalized to meet database constraint
      const formattedName = newSpecialty.ad.trim();
      const capitalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);

      const specialtyData = {
        ad: capitalizedName,
        aciklama: newSpecialty.aciklama.trim() || null
      };

      const { data, error } = await supabase
        .from('uzmanliklar')
        .insert([specialtyData])
        .select('id, ad, aciklama')
        .single();

      if (error) throw error;

      setSpecialties(prev => [...prev, data].sort((a, b) => a.ad.localeCompare(b.ad)));
      setNewSpecialty({
        ad: '',
        aciklama: ''
      });
      setShowNewSpecialtyForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uzmanlık alanı oluşturulurken hata oluştu');
    }
  };

  const updateSpecialty = async () => {
    if (!editingSpecialty || !editingSpecialty.ad.trim()) {
      setError('Uzmanlık alanı adı gereklidir');
      return;
    }

    try {
      setError(null);

      // Ensure first letter is capitalized to meet database constraint
      const formattedName = editingSpecialty.ad.trim();
      const capitalizedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);

      const { data, error } = await supabase
        .from('uzmanliklar')
        .update({
          ad: capitalizedName,
          aciklama: editingSpecialty.aciklama?.trim() || null
        })
        .eq('id', editingSpecialty.id)
        .select('id, ad, aciklama')
        .single();

      if (error) throw error;

      setSpecialties(prev => prev.map(specialty => 
        specialty.id === editingSpecialty.id ? data : specialty
      ).sort((a, b) => a.ad.localeCompare(b.ad)));

      setShowEditModal(false);
      setEditingSpecialty(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uzmanlık alanı güncellenirken hata oluştu');
    }
  };

  const deleteSpecialty = async (id: bigint) => {
    if (!confirm('Bu uzmanlık alanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('uzmanliklar')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSpecialties(prev => prev.filter(specialty => specialty.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uzmanlık alanı silinirken hata oluştu');
    }
  };

  const handleEditSpecialty = (specialty: Uzmanlik) => {
    setEditingSpecialty(specialty);
    setShowEditModal(true);
  };

  const filteredSpecialties = specialties.filter(specialty => {
    const searchLower = searchTerm.toLowerCase();
    return (
      specialty.ad.toLowerCase().includes(searchLower) ||
      specialty.aciklama?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Uzmanlık alanları yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Uzmanlık Alanları</h1>
          <p className="text-gray-600">Klinik uzmanlık alanlarını yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSpecialties}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
          <button
            onClick={() => setShowNewSpecialtyForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Uzmanlık Alanı</span>
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

      {/* New Specialty Form */}
      {showNewSpecialtyForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Uzmanlık Alanı Ekle</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uzmanlık Alanı Adı *
              </label>
              <input
                type="text"
                value={newSpecialty.ad}
                onChange={(e) => setNewSpecialty({...newSpecialty, ad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Ağız, Diş ve Çene Cerrahisi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={newSpecialty.aciklama}
                onChange={(e) => setNewSpecialty({...newSpecialty, aciklama: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Uzmanlık alanı açıklaması..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowNewSpecialtyForm(false);
                setNewSpecialty({
                  ad: '',
                  aciklama: ''
                });
                setError(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={createSpecialty}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Uzmanlık Alanı Ekle
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Uzmanlık alanı adı veya açıklama ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Specialties List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredSpecialties.length === 0 ? (
          <div className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Uzmanlık alanı bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Arama kriterlerinize uygun uzmanlık alanı bulunamadı.' 
                : 'Henüz hiç uzmanlık alanı kaydı bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uzmanlık Alanı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpecialties.map((specialty) => (
                  <tr key={specialty.id.toString()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {specialty.ad}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {specialty.aciklama ? (
                          <div className="flex items-start">
                            <BookOpen className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{specialty.aciklama}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Açıklama yok</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSpecialty(specialty)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSpecialty(specialty.id)}
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
      {filteredSpecialties.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-blue-800 font-medium">
                Toplam: {filteredSpecialties.length} uzmanlık alanı
              </span>
            </div>
            {searchTerm && (
              <span className="text-blue-600">
                "{searchTerm}" için {filteredSpecialties.length} sonuç
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSpecialty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uzmanlık Alanı Düzenle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uzmanlık Alanı Adı *
                </label>
                <input
                  type="text"
                  value={editingSpecialty.ad}
                  onChange={(e) => setEditingSpecialty({
                    ...editingSpecialty,
                    ad: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={editingSpecialty.aciklama || ''}
                  onChange={(e) => setEditingSpecialty({
                    ...editingSpecialty,
                    aciklama: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSpecialty(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={updateSpecialty}
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

export default SpecialtiesContent;