import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  AlertCircle,
  Search,
  RefreshCw,
  Video,
  Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Randevu } from '../types';

interface AppointmentsContentProps {
  highlightedId?: string;
  userRole?: 'admin' | 'doctor' | null;
  doktorId?: string | null;
}

const AppointmentsContent: React.FC<AppointmentsContentProps> = ({ highlightedId, userRole, doktorId }) => {
  const [appointments, setAppointments] = useState<Randevu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingAppointment, setEditingAppointment] = useState<Randevu | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (highlightedId && appointments.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`appointment-${highlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-row');
          setTimeout(() => {
            element.classList.remove('highlight-row');
          }, 3000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('randevu')
        .select(`
          id,
          randevu_kisi_id,
          doktor_id,
          hizmet_id,
          randevu_tarihi,
          randevu_tipi,
          online_link,
          randevu_notu,
          durum,
          olusturulma_tarihi,
          red_nedeni,
          guncellenme_tarihi,
          sms,
          randevu_kisi (
            id,
            isim,
            soyisim,
            telefon
          ),
          doktor (
            id,
            ad,
            soyad,
            unvan,
            uzmanlik_id,
            klinik_lokasyon,
            uzmanlik:uzmanliklar!uzmanlik_id (
              ad
            )
          ),
          hizmetler (
            id,
            hizmet_adi,
            fiyat,
            sure_dakika
          )
        `)
        
      // Filter by doctor if user is a doctor
      if (userRole === 'doctor' && doktorId) {
        query = query.eq('doktor_id', doktorId);
      }
      
      const { data, error } = await query.order('guncellenme_tarihi', { ascending: false });

      if (error) throw error;

      setAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string, redNedeni?: string) => {
    try {
      // Find the appointment before updating to send to webhook
      const appointmentToUpdate = appointments.find(apt => apt.id === id);

      const { error } = await supabase
        .from('randevu')
        .update({ 
          durum: status,
          red_nedeni: redNedeni || null,
          guncellenme_tarihi: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Send data to n8n webhook if appointment was found and status is approved
      if (appointmentToUpdate && status === 'onaylandi') {
        try {
          const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
          
          if (n8nWebhookUrl) {
            const webhookData = {
              action: 'appointment_approved',
              timestamp: new Date().toISOString(),
              appointment: {
                id: appointmentToUpdate.id,
               randevu_id: appointmentToUpdate.id,
                patient: {
                  name: `${appointmentToUpdate.randevu_kisi?.isim} ${appointmentToUpdate.randevu_kisi?.soyisim}`,
                  phone: appointmentToUpdate.randevu_kisi?.telefon
                },
                doctor: {
                 id: appointmentToUpdate.doktor_id,
                 doktor_id: appointmentToUpdate.doktor_id,
                  name: `${appointmentToUpdate.doktor?.unvan || ''} ${appointmentToUpdate.doktor?.ad} ${appointmentToUpdate.doktor?.soyad}`.trim(),
                  specialty: appointmentToUpdate.doktor?.uzmanlik?.ad,
                  location: appointmentToUpdate.doktor?.klinik_lokasyon
                },
                appointment_details: {
                  date: appointmentToUpdate.randevu_tarihi,
                  type: appointmentToUpdate.randevu_tipi,
                  online_link: appointmentToUpdate.online_link,
                  service: appointmentToUpdate.hizmetler?.hizmet_adi,
                  notes: appointmentToUpdate.randevu_notu
                },
                status: {
                  old_status: appointmentToUpdate.durum,
                  new_status: status,
                  rejection_reason: redNedeni
                }
              }
            };

            const response = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookData)
            });

            if (!response.ok) {
              console.error('N8N webhook failed:', response.status, response.statusText);
            } else {
              console.log('Appointment data sent to n8n webhook successfully');
            }
          } else {
            console.warn('N8N webhook URL not configured in environment variables');
          }
        } catch (webhookError) {
          console.error('Error sending data to n8n webhook:', webhookError);
          // Don't throw error here to avoid breaking the main flow
        }
      }

      // Send data to rejection webhook if appointment was rejected
      if (appointmentToUpdate && status === 'reddedildi') {
        try {
          const rejectionWebhookUrl = 'https://n8n.srv857453.hstgr.cloud/webhook/a92f934a-4a3b-4e46-a2f6-eb9bfddefc94';
          
          const webhookData = {
            action: 'appointment_rejected',
            timestamp: new Date().toISOString(),
            appointment: {
             id: appointmentToUpdate.id,
             randevu_id: appointmentToUpdate.id,
              patient: {
                name: `${appointmentToUpdate.randevu_kisi?.isim || ''} ${appointmentToUpdate.randevu_kisi?.soyisim || ''}`.trim(),
                phone: appointmentToUpdate.randevu_kisi?.telefon
              },
              doctor: {
               id: appointmentToUpdate.doktor_id,
               doktor_id: appointmentToUpdate.doktor_id,
                name: `${appointmentToUpdate.doktor?.unvan || ''} ${appointmentToUpdate.doktor?.ad || ''} ${appointmentToUpdate.doktor?.soyad || ''}`.trim(),
                specialty: appointmentToUpdate.doktor?.uzmanlik?.ad,
                location: appointmentToUpdate.doktor?.klinik_lokasyon
              },
              appointment_details: {
                date: appointmentToUpdate.randevu_tarihi,
                type: appointmentToUpdate.randevu_tipi,
                online_link: appointmentToUpdate.online_link,
                service: appointmentToUpdate.hizmetler?.hizmet_adi,
                notes: appointmentToUpdate.randevu_notu,
                rejection_reason: redNedeni
              }
            }
          };

          const response = await fetch(rejectionWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });

          if (!response.ok) {
            console.error('Rejection webhook failed:', response.status, response.statusText);
          } else {
            console.log('Rejection data sent to webhook successfully');
          }
        } catch (webhookError) {
          console.error('Error sending rejection data to webhook:', webhookError);
          // Don't throw error here to avoid breaking the main flow
        }
      }

      // Update local state instead of re-fetching to avoid page reload
      setAppointments(prev => prev.map(apt => 
        apt.id === id 
          ? { ...apt, durum: status as any, red_nedeni: redNedeni || null, guncellenme_tarihi: new Date().toISOString() }
          : apt
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu');
    }
  };

  const updateSmsStatus = async (id: string, smsStatus: 'Gönderildi') => {
    try {
      const { error } = await supabase
        .from('randevu')
        .update({ 
          sms: smsStatus,
          guncellenme_tarihi: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state instead of re-fetching
      setAppointments(prev => prev.map(apt => 
        apt.id === id 
          ? { ...apt, sms: smsStatus, guncellenme_tarihi: new Date().toISOString() }
          : apt
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS durumu güncellenirken hata oluştu');
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) return;

    try {
      // First, update any related call records to remove the reference
      const { error: updateError } = await supabase
        .from('arama_kayit')
        .update({ randevu_id: null })
        .eq('randevu_id', id);

      if (updateError) throw updateError;

      // Now delete the appointment
      const { error } = await supabase
        .from('randevu')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.filter(apt => apt.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Randevu silinirken hata oluştu');
    }
  };

  const handleEditAppointment = (appointment: Randevu) => {
    setEditingAppointment(appointment);
    setShowEditModal(true);
  };

  const saveEditedAppointment = async () => {
    if (!editingAppointment) return;

    try {
      // Ensure randevu_tipi is valid for database constraint
      const validRandevuTipi = editingAppointment.randevu_tipi === 'Online' || editingAppointment.randevu_tipi === 'Klinik' 
        ? editingAppointment.randevu_tipi 
        : 'Klinik';

      const { error } = await supabase
        .from('randevu')
        .update({
          randevu_tarihi: editingAppointment.randevu_tarihi,
          randevu_tipi: validRandevuTipi,
          online_link: editingAppointment.online_link,
          randevu_notu: editingAppointment.randevu_notu,
          guncellenme_tarihi: new Date().toISOString()
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      // Re-fetch all appointments to get the latest data with correct sorting
      await fetchAppointments();

      setShowEditModal(false);
      setEditingAppointment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Randevu güncellenirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'beklemede': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'onaylandi': return 'bg-green-100 text-green-800 border-green-200';
      case 'reddedildi': return 'bg-red-100 text-red-800 border-red-200';
      case 'tamamlandi': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'iptal': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gelmedi': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'beklemede': return 'Beklemede';
      case 'onaylandi': return 'Onaylandı';
      case 'reddedildi': return 'Reddedildi';
      case 'tamamlandi': return 'Tamamlandı';
      case 'iptal': return 'İptal';
      case 'gelmedi': return 'Gelmedi';
      case 'gecmis': return 'Geçmiş';
      default: return status;
    }
  };

  const getSmsStatusColor = (smsStatus?: string) => {
    switch (smsStatus) {
      case 'Gönderildi': return 'bg-green-100 text-green-800 border-green-200';
      case 'Gönderilmedi': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSmsStatusText = (smsStatus?: string) => {
    switch (smsStatus) {
      case 'Gönderildi': return 'Gönderildi';
      case 'Gönderilmedi': return 'Gönderilmedi';
      default: return 'Gönderilmedi';
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.randevu_kisi?.isim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.randevu_kisi?.soyisim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doktor?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doktor?.soyad?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || apt.durum === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Randevular yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={fetchAppointments}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {userRole === 'doctor' ? 'Randevularım' : 'Randevu Kayıtları'}
          </h1>
          <p className="text-gray-600">
            {userRole === 'doctor' 
              ? 'Kişisel randevu kayıtlarınızı görüntüleyin ve yönetin'
              : 'Sesli otomasyon sistemi tarafından oluşturulan randevuları yönetin'
            }
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Kişi veya uzman adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="reddedildi">Reddedildi</option>
              <option value="tamamlandi">Tamamlandı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Randevu bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Arama kriterlerinize uygun randevu bulunamadı.' 
                : 'Henüz hiç randevu kaydı bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kişi Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uzman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Randevu Detayları
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum / SMS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} id={`appointment-${appointment.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.randevu_kisi?.isim} {appointment.randevu_kisi?.soyisim}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            {appointment.randevu_kisi?.telefon}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.doktor?.unvan} {appointment.doktor?.ad} {appointment.doktor?.soyad}
                      </div>
                      {appointment.doktor?.uzmanlik?.ad && (
                        <div className="text-sm text-gray-500">{appointment.doktor.uzmanlik.ad}</div>
                      )}
                      {appointment.doktor?.klinik_lokasyon && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {appointment.doktor.klinik_lokasyon}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center mb-1">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {appointment.randevu_tarihi.split(' ')[0]}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mb-2">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {appointment.randevu_tarihi.split(' ')[1]}
                      </div>
                      <div className="flex items-center">
                        {appointment.randevu_tipi?.toLowerCase() === 'online' ? (
                          <>
                            <div className="flex items-center text-sm text-blue-600 mb-1">
                              <Video className="w-4 h-4 mr-1" />
                              Online
                            </div>
                            {appointment.online_link && (
                              <div className="text-xs">
                                <a
                                  href={appointment.online_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  Toplantı Linki
                                </a>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="w-4 h-4 mr-1" />
                            Klinik
                          </div>
                        )}
                      </div>
                      {appointment.hizmetler && (
                        <div className="text-xs text-gray-500 mt-1">
                          {appointment.hizmetler.hizmet_adi}
                        </div>
                      )}
                      {appointment.randevu_notu && (
                        <div className="text-xs text-gray-600 mt-1 italic">
                          Not: {appointment.randevu_notu}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(appointment.durum)}`}>
                          {getStatusText(appointment.durum)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSmsStatusColor(appointment.sms)}`}>
                          SMS: {getSmsStatusText(appointment.sms)}
                        </span>
                      </div>
                      {appointment.red_nedeni && (
                        <div className="text-xs text-red-600 mt-1">
                          {appointment.red_nedeni}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {appointment.durum === 'beklemede' && (
                          <>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'onaylandi')}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Onayla"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Red nedeni (opsiyonel):');
                                updateAppointmentStatus(appointment.id, 'reddedildi', reason || undefined);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Reddet"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEditAppointment(appointment)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
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
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Randevu Düzenle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Randevu Tarihi ve Saati
                </label>
                <input
                  type="datetime-local"
                  value={editingAppointment.randevu_tarihi.slice(0, 16)}
                  onChange={(e) => setEditingAppointment({
                    ...editingAppointment,
                    randevu_tarihi: e.target.value + ':00.000Z'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Randevu Tipi
                </label>
                <select
                  value={editingAppointment.randevu_tipi || 'klinik'}
                  onChange={(e) => setEditingAppointment({
                    ...editingAppointment,
                    randevu_tipi: e.target.value as 'Online' | 'Klinik'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Klinik">Klinik</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {editingAppointment.randevu_tipi === 'Online' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Online Link
                  </label>
                  <input
                    type="url"
                    value={editingAppointment.online_link || ''}
                    onChange={(e) => setEditingAppointment({
                      ...editingAppointment,
                      online_link: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Randevu Notu
                </label>
                <textarea
                  value={editingAppointment.randevu_notu || ''}
                  onChange={(e) => setEditingAppointment({
                    ...editingAppointment,
                    randevu_notu: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Randevu ile ilgili notlar..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAppointment(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={saveEditedAppointment}
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

export default AppointmentsContent;