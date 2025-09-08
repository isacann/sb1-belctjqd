import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  User,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Doktor, DoktorTakvim, Uzmanlik } from '../types';

interface DoctorPersonalScheduleProps {
  doktorId: string;
}

const DoctorPersonalSchedule = ({ doktorId }: DoctorPersonalScheduleProps) => {
  const [doctor, setDoctor] = useState<Doktor | null>(null);
  const [schedule, setSchedule] = useState<DoktorTakvim[]>([]);
  const [uzmanliklar, setUzmanliklar] = useState<Uzmanlik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile editing states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doktor | null>(null);

  // Schedule management states
  const [newSchedule, setNewSchedule] = useState({
    tarih: '',
    baslangic_saat: '',
    bitis_saat: '',
    musait: true,
    not_bilgi: ''
  });
  const [editingSchedule, setEditingSchedule] = useState<DoktorTakvim | null>(null);

  useEffect(() => {
    fetchDoctorData();
    fetchUzmanliklar();
  }, [doktorId]);

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

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch doctor info
      const { data: doctorData, error: doctorError } = await supabase
        .from('doktor')
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          telefon, 
          email, 
          aktif, 
          klinik_lokasyon, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .eq('id', doktorId)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      // Fetch doctor schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('doktor_takvim')
        .select('id, doktor_id, tarih, baslangic_saat, bitis_saat, musait, not_bilgi')
        .eq('doktor_id', doktorId)
        .order('tarih', { ascending: true });

      if (scheduleError) throw scheduleError;
      setSchedule(scheduleData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDatabase = (dateInput: string): string => {
    if (dateInput.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateInput;
    }
    
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}-${month}-${year}`;
    }
    
    const date = new Date(dateInput);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const updateProfile = async () => {
    if (!editingDoctor || !editingDoctor.ad.trim() || !editingDoctor.soyad.trim()) {
      setError('Ad ve soyad gereklidir');
      return;
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('doktor')
        .update({
          ad: editingDoctor.ad.trim(),
          soyad: editingDoctor.soyad.trim(),
          unvan: editingDoctor.unvan?.trim() || null,
          uzmanlik_id: editingDoctor.uzmanlik_id ? Number(editingDoctor.uzmanlik_id) : null,
          telefon: editingDoctor.telefon?.trim() || null,
          email: editingDoctor.email?.trim() || null,
          klinik_lokasyon: editingDoctor.klinik_lokasyon?.trim() || null
        })
        .eq('id', doktorId)
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          telefon, 
          email, 
          aktif, 
          klinik_lokasyon, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .single();

      if (error) throw error;

      setDoctor(data);
      setShowEditProfileModal(false);
      setEditingDoctor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil güncellenirken hata oluştu');
    }
  };

  const addScheduleEntry = async () => {
    if (!newSchedule.tarih || !newSchedule.baslangic_saat || !newSchedule.bitis_saat) {
      setError('Tarih, başlangıç ve bitiş saati gereklidir');
      return;
    }

    try {
      setError(null);

      const scheduleData = {
        doktor_id: doktorId,
        tarih: formatDateForDatabase(newSchedule.tarih),
        baslangic_saat: newSchedule.baslangic_saat,
        bitis_saat: newSchedule.bitis_saat,
        musait: newSchedule.musait,
        not_bilgi: newSchedule.not_bilgi.trim() || null
      };

      const { data, error } = await supabase
        .from('doktor_takvim')
        .insert([scheduleData])
        .select()
        .single();

      if (error) throw error;

      setSchedule(prev => [...prev, data]);
      setNewSchedule({
        tarih: '',
        baslangic_saat: '',
        bitis_saat: '',
        musait: true,
        not_bilgi: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takvim kaydı eklenirken hata oluştu');
    }
  };

  const updateScheduleEntry = async () => {
    if (!editingSchedule || !editingSchedule.tarih || !editingSchedule.baslangic_saat || !editingSchedule.bitis_saat) {
      setError('Tarih, başlangıç ve bitiş saati gereklidir');
      return;
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('doktor_takvim')
        .update({
          tarih: formatDateForDatabase(editingSchedule.tarih),
          baslangic_saat: editingSchedule.baslangic_saat,
          bitis_saat: editingSchedule.bitis_saat,
          musait: editingSchedule.musait,
          not_bilgi: editingSchedule.not_bilgi?.trim() || null
        })
        .eq('id', editingSchedule.id)
        .select()
        .single();

      if (error) throw error;

      setSchedule(prev => prev.map(s => 
        s.id === editingSchedule.id ? data : s
      ));

      setEditingSchedule(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takvim kaydı güncellenirken hata oluştu');
    }
  };

  const deleteScheduleEntry = async (id: string) => {
    if (!confirm('Bu takvim kaydını silmek istediğinizden emin misiniz?')) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('doktor_takvim')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedule(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takvim kaydı silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Profil ve takvim yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">Doktor bilgileri bulunamadı</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profilim ve Takvimim</h1>
          <p className="text-gray-600">Kişisel bilgilerinizi ve müsaitlik takviminizi yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDoctorData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
          <button
            onClick={() => {
              setEditingDoctor(doctor);
              setShowEditProfileModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Profili Düzenle</span>
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

      {/* Doctor Profile Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {doctor.unvan} {doctor.ad} {doctor.soyad}
            </h2>
            {doctor.uzmanlik?.ad && (
              <p className="text-gray-600">{doctor.uzmanlik.ad}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctor.telefon && (
            <div className="flex items-center text-gray-700">
              <Phone className="w-4 h-4 mr-3 text-gray-400" />
              <span>{doctor.telefon}</span>
            </div>
          )}
          {doctor.email && (
            <div className="flex items-center text-gray-700">
              <Mail className="w-4 h-4 mr-3 text-gray-400" />
              <span>{doctor.email}</span>
            </div>
          )}
          {doctor.klinik_lokasyon && (
            <div className="flex items-center text-gray-700 md:col-span-2">
              <MapPin className="w-4 h-4 mr-3 text-gray-400" />
              <span>{doctor.klinik_lokasyon}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Schedule Entry */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Müsaitlik Ekle</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarih *
            </label>
            <input
              type="date"
              value={newSchedule.tarih}
              onChange={(e) => setNewSchedule({...newSchedule, tarih: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Saati *
            </label>
            <input
              type="time"
              value={newSchedule.baslangic_saat}
              onChange={(e) => setNewSchedule({...newSchedule, baslangic_saat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Saati *
            </label>
            <input
              type="time"
              value={newSchedule.bitis_saat}
              onChange={(e) => setNewSchedule({...newSchedule, bitis_saat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addScheduleEntry}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ekle</span>
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Not
            </label>
            <input
              type="text"
              value={newSchedule.not_bilgi}
              onChange={(e) => setNewSchedule({...newSchedule, not_bilgi: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Opsiyonel not..."
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newSchedule.musait}
                onChange={(e) => setNewSchedule({...newSchedule, musait: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Müsait</span>
            </label>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Takvim Kayıtlarım</h3>
        </div>
        {schedule.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Takvim kaydı yok</h4>
            <p className="text-gray-500">Henüz müsaitlik kaydınız bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saat Aralığı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Not
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((scheduleItem) => (
                  <tr key={scheduleItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingSchedule?.id === scheduleItem.id ? (
                        <input
                          type="date"
                          value={editingSchedule.tarih}
                          onChange={(e) => setEditingSchedule({
                            ...editingSchedule,
                            tarih: e.target.value
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">{scheduleItem.tarih}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingSchedule?.id === scheduleItem.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={editingSchedule.baslangic_saat}
                            onChange={(e) => setEditingSchedule({
                              ...editingSchedule,
                              baslangic_saat: e.target.value
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={editingSchedule.bitis_saat}
                            onChange={(e) => setEditingSchedule({
                              ...editingSchedule,
                              bitis_saat: e.target.value
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {scheduleItem.baslangic_saat} - {scheduleItem.bitis_saat}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingSchedule?.id === scheduleItem.id ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editingSchedule.musait}
                            onChange={(e) => setEditingSchedule({
                              ...editingSchedule,
                              musait: e.target.checked
                            })}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Müsait</span>
                        </label>
                      ) : (
                        <div className="flex items-center">
                          {scheduleItem.musait ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">Müsait</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <XCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">Dolu</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingSchedule?.id === scheduleItem.id ? (
                        <input
                          type="text"
                          value={editingSchedule.not_bilgi || ''}
                          onChange={(e) => setEditingSchedule({
                            ...editingSchedule,
                            not_bilgi: e.target.value
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Not..."
                        />
                      ) : (
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {scheduleItem.not_bilgi || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {editingSchedule?.id === scheduleItem.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={updateScheduleEntry}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Kaydet"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSchedule(null)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                            title="İptal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingSchedule(scheduleItem)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteScheduleEntry(scheduleItem.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && editingDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profili Düzenle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad *
                </label>
                <input
                  type="text"
                  value={editingDoctor.ad}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    ad: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyad *
                </label>
                <input
                  type="text"
                  value={editingDoctor.soyad}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    soyad: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unvan
                </label>
                <input
                  type="text"
                  value={editingDoctor.unvan || ''}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    unvan: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uzmanlık Alanı
                </label>
                <select
                  value={editingDoctor.uzmanlik_id?.toString() || ''}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
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
                  Telefon
                </label>
                <input
                  type="tel"
                  value={editingDoctor.telefon || ''}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    telefon: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={editingDoctor.email || ''}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    email: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Klinik Lokasyonu
                </label>
                <input
                  type="text"
                  value={editingDoctor.klinik_lokasyon || ''}
                  onChange={(e) => setEditingDoctor({
                    ...editingDoctor,
                    klinik_lokasyon: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditProfileModal(false);
                  setEditingDoctor(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={updateProfile}
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

export default DoctorPersonalSchedule;