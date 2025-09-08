import React, { useState, useEffect } from 'react';
import DoctorPersonalSchedule from './DoctorPersonalSchedule';
import { 
  Stethoscope, 
  Plus, 
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Doktor, Uzmanlik, DoktorTakvim } from '../types';

interface DoctorsContentProps {
  userRole?: 'admin' | 'doctor' | null;
  doktorId?: string | null;
}

const DoctorsContent = ({ userRole, doktorId }: DoctorsContentProps) => {
  // If user is a doctor, show personal schedule instead of doctor management
  if (userRole === 'doctor' && doktorId) {
    return <DoctorPersonalSchedule doktorId={doktorId} />;
  }

  const [doctors, setDoctors] = useState<Doktor[]>([]);
  const [uzmanliklar, setUzmanliklar] = useState<Uzmanlik[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doktor | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<DoktorTakvim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New doctor form states
  const [showNewDoctorForm, setShowNewDoctorForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    ad: '',
    soyad: '',
    unvan: '',
    uzmanlik_id: '',
    telefon: '',
    email: '',
    klinik_lokasyon: '',
    aktif: true
  });

  // Edit doctor states
  const [editingDoctor, setEditingDoctor] = useState<Doktor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Schedule management states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    tarih: '',
    baslangic_saat: '',
    bitis_saat: '',
    musait: true,
    not_bilgi: ''
  });
  const [editingSchedule, setEditingSchedule] = useState<DoktorTakvim | null>(null);

  useEffect(() => {
    fetchDoctors();
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

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('doktor')
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          telefon, 
          email, 
          aktif, 
          olusturulma_tarihi, 
          klinik_lokasyon, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        
      // Filter by current doctor if user is a doctor
      if (userRole === 'doctor' && doktorId) {
        query = query.eq('id', doktorId);
      }
      
      const { data, error } = await query.order('olusturulma_tarihi', { ascending: false });

      if (error) throw error;

      setDoctors(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorSchedule = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from('doktor_takvim')
        .select('id, doktor_id, tarih, baslangic_saat, bitis_saat, musait, not_bilgi')
        .eq('doktor_id', doctorId)
        .order('tarih', { ascending: true });

      if (error) throw error;
      setDoctorSchedule(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takvim yüklenirken hata oluştu');
    }
  };

  const formatDateForDatabase = (dateInput: string): string => {
    // If input is already in DD-MM-YYYY format, return as is
    if (dateInput.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateInput;
    }
    
    // If input is in YYYY-MM-DD format (from date input), convert to DD-MM-YYYY
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}-${month}-${year}`;
    }
    
    // If input is a Date object or other format, convert to DD-MM-YYYY
    const date = new Date(dateInput);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const createDoctor = async () => {
    if (!newDoctor.ad.trim() || !newDoctor.soyad.trim()) {
      setError('Ad ve soyad gereklidir');
      return;
    }

    try {
      setError(null);

      const doctorData = {
        ad: newDoctor.ad.trim(),
        soyad: newDoctor.soyad.trim(),
        unvan: newDoctor.unvan.trim() || null,
        uzmanlik_id: newDoctor.uzmanlik_id ? Number(newDoctor.uzmanlik_id) : null,
        telefon: newDoctor.telefon.trim() || null,
        email: newDoctor.email.trim() || null,
        klinik_lokasyon: newDoctor.klinik_lokasyon.trim() || null,
        aktif: newDoctor.aktif
      };

      const { data, error } = await supabase
        .from('doktor')
        .insert([doctorData])
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          telefon, 
          email, 
          aktif, 
          olusturulma_tarihi, 
          klinik_lokasyon, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .single();

      if (error) throw error;

      setDoctors(prev => [data, ...prev]);
      setNewDoctor({
        ad: '',
        soyad: '',
        unvan: '',
        uzmanlik_id: '',
        telefon: '',
        email: '',
        klinik_lokasyon: '',
        aktif: true
      });
      setShowNewDoctorForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doktor oluşturulurken hata oluştu');
    }
  };

  const updateDoctor = async () => {
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
          klinik_lokasyon: editingDoctor.klinik_lokasyon?.trim() || null,
          aktif: editingDoctor.aktif
        })
        .eq('id', editingDoctor.id)
        .select(`
          id, 
          ad, 
          soyad, 
          unvan, 
          telefon, 
          email, 
          aktif, 
          olusturulma_tarihi, 
          klinik_lokasyon, 
          uzmanlik_id,
          uzmanlik:uzmanliklar!uzmanlik_id (
            id,
            ad
          )
        `)
        .single();

      if (error) throw error;

      setDoctors(prev => prev.map(doctor => 
        doctor.id === editingDoctor.id ? data : doctor
      ));

      setShowEditModal(false);
      setEditingDoctor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doktor güncellenirken hata oluştu');
    }
  };

  const deleteDoctor = async (id: string) => {
    if (!confirm('Bu doktoru pasif hale getirmek istediğinizden emin misiniz?')) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('doktor')
        .update({ aktif: false })
        .eq('id', id);

      if (error) throw error;

      setDoctors(prev => prev.map(doctor => 
        doctor.id === id ? { ...doctor, aktif: false } : doctor
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doktor pasif hale getirilirken hata oluştu');
    }
  };

  const handleEditDoctor = (doctor: Doktor) => {
    setEditingDoctor(doctor);
    setShowEditModal(true);
  };

  const handleManageSchedule = (doctor: Doktor) => {
    setSelectedDoctor(doctor);
    setShowScheduleModal(true);
    fetchDoctorSchedule(doctor.id);
  };

  const addScheduleEntry = async () => {
    if (!selectedDoctor || !newSchedule.tarih || !newSchedule.baslangic_saat || !newSchedule.bitis_saat) {
      setError('Tarih, başlangıç ve bitiş saati gereklidir');
      return;
    }

    try {
      setError(null);

      const scheduleData = {
        doktor_id: selectedDoctor.id,
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

      setDoctorSchedule(prev => [...prev, data]);
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

      setDoctorSchedule(prev => prev.map(schedule => 
        schedule.id === editingSchedule.id ? data : schedule
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

      setDoctorSchedule(prev => prev.filter(schedule => schedule.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takvim kaydı silinirken hata oluştu');
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      doctor.ad.toLowerCase().includes(searchLower) ||
      doctor.soyad.toLowerCase().includes(searchLower) ||
      doctor.unvan?.toLowerCase().includes(searchLower) ||
      doctor.uzmanlik?.ad?.toLowerCase().includes(searchLower) ||
      doctor.email?.toLowerCase().includes(searchLower) ||
      doctor.telefon?.toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && doctor.aktif) ||
      (statusFilter === 'inactive' && !doctor.aktif);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Uzmanlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Doktorlar</h1>
          <p className="text-gray-600">
            {userRole === 'doctor' 
              ? 'Profilinizi ve takvim müsaitliklerinizi yönetin' 
              : 'Klinik doktorlarını ve müsaitliklerini yönetin'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDoctors}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
          {userRole === 'admin' && <button
            onClick={() => setShowNewDoctorForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Doktor</span>
          </button>}
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

      {/* New Doctor Form */}
      {showNewDoctorForm && userRole === 'admin' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Doktor Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad *
              </label>
              <input
                type="text"
                value={newDoctor.ad}
                onChange={(e) => setNewDoctor({...newDoctor, ad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doktor adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad *
              </label>
              <input
                type="text"
                value={newDoctor.soyad}
                onChange={(e) => setNewDoctor({...newDoctor, soyad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doktor soyadı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unvan
              </label>
              <input
                type="text"
                value={newDoctor.unvan}
                onChange={(e) => setNewDoctor({...newDoctor, unvan: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dr., Prof. Dr., vb."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uzmanlık Alanı
              </label>
              <select
                value={newDoctor.uzmanlik_id}
                onChange={(e) => setNewDoctor({...newDoctor, uzmanlik_id: e.target.value})}
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
                value={newDoctor.telefon}
                onChange={(e) => setNewDoctor({...newDoctor, telefon: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0555 123 45 67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="uzman@klinik.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klinik Lokasyonu
              </label>
              <input
                type="text"
                value={newDoctor.klinik_lokasyon}
                onChange={(e) => setNewDoctor({...newDoctor, klinik_lokasyon: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Klinik adresi veya lokasyon bilgisi"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newDoctor.aktif}
                  onChange={(e) => setNewDoctor({...newDoctor, aktif: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Doktor aktif</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowNewDoctorForm(false);
                setNewDoctor({
                  ad: '',
                  soyad: '',
                  unvan: '',
                  uzmanlik_id: '',
                  telefon: '',
                  email: '',
                  klinik_lokasyon: '',
                  aktif: true
                });
                setError(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={createDoctor}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Doktor Ekle
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
                placeholder="Doktor adı, uzmanlık veya iletişim bilgisi ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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

      {/* Doctors List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredDoctors.length === 0 ? (
          <div className="p-8 text-center">
            <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Doktor bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Arama kriterlerinize uygun doktor bulunamadı.' 
                : 'Henüz hiç doktor kaydı bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doktor Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uzmanlık
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
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
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {doctor.unvan} {doctor.ad} {doctor.soyad}
                          </div>
                          {doctor.klinik_lokasyon && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {doctor.klinik_lokasyon}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doctor.uzmanlik?.ad ? (
                        <div className="text-sm text-gray-900">{doctor.uzmanlik.ad}</div>
                      ) : (
                        <span className="text-sm text-gray-400">Uzmanlık yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {doctor.telefon && (
                          <div className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-3 h-3 mr-2 text-gray-400" />
                            {doctor.telefon}
                          </div>
                        )}
                        {doctor.email && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-2 text-gray-400" />
                            {doctor.email}
                          </div>
                        )}
                        {!doctor.telefon && !doctor.email && (
                          <div className="text-sm text-gray-400">
                            İletişim bilgisi yok
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {doctor.aktif ? (
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
                          onClick={() => handleManageSchedule(doctor)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                          title="Takvim Yönet"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        {userRole === 'admin' && <button
                          onClick={() => handleEditDoctor(doctor)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>}
                        {userRole === 'admin' && <button
                          onClick={() => deleteDoctor(doctor.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Pasif Yap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>}
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
      {filteredDoctors.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-blue-800 font-medium">
                Toplam: {filteredDoctors.length} doktor
              </span>
              <span className="text-blue-600">
                Aktif: {filteredDoctors.filter(d => d.aktif).length}
              </span>
              <span className="text-blue-600">
                Pasif: {filteredDoctors.filter(d => !d.aktif).length}
              </span>
            </div>
            {(searchTerm || statusFilter !== 'all') && (
              <span className="text-blue-600">
                Filtrelenmiş sonuçlar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditModal && editingDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Doktor Düzenle</h3>
            
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
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingDoctor.aktif}
                    onChange={(e) => setEditingDoctor({
                      ...editingDoctor,
                      aktif: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Doktor aktif</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDoctor(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={updateDoctor}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Management Modal */}
      {showScheduleModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDoctor.unvan} {selectedDoctor.ad} {selectedDoctor.soyad} - Takvim Yönetimi
              </h3>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedDoctor(null);
                  setDoctorSchedule([]);
                  setNewSchedule({
                    tarih: '',
                    baslangic_saat: '',
                    bitis_saat: '',
                    musait: true,
                    not_bilgi: ''
                  });
                  setEditingSchedule(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Schedule Entry */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Yeni Müsaitlik Ekle</h4>
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
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {doctorSchedule.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Takvim kaydı yok</h4>
                  <p className="text-gray-500">Bu doktor için henüz müsaitlik kaydı bulunmuyor.</p>
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
                      {doctorSchedule.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingSchedule?.id === schedule.id ? (
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
                              <div className="text-sm text-gray-900">{schedule.tarih}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingSchedule?.id === schedule.id ? (
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
                                {schedule.baslangic_saat} - {schedule.bitis_saat}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingSchedule?.id === schedule.id ? (
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
                                {schedule.musait ? (
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
                            {editingSchedule?.id === schedule.id ? (
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
                                {schedule.not_bilgi || '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {editingSchedule?.id === schedule.id ? (
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
                                  onClick={() => setEditingSchedule(schedule)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                  title="Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteScheduleEntry(schedule.id)}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsContent;