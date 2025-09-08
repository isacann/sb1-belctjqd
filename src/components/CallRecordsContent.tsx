import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Search,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  User,
  FileText,
  MessageSquare,
  ExternalLink,
  PhoneCall,
  PhoneIncoming,
  Users,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VGelenAramalar, VFormAramalari, VListeAramalari } from '../types';

type CallType = 'gelen' | 'form' | 'liste';

interface CallRecordsContentProps {
  onMenuItemClick: (menuId: string, highlightId?: string) => void;
  highlightedId?: string;
  gelenCallNotificationCount: number;
  formCallNotificationCount: number;
  listeCallNotificationCount: number;
  onClearCallNotifications: (callType: 'gelen' | 'form' | 'liste') => void;
}

const CallRecordsContent = ({ 
  onMenuItemClick,
  highlightedId,
  gelenCallNotificationCount,
  formCallNotificationCount,
  listeCallNotificationCount,
  onClearCallNotifications
}: CallRecordsContentProps) => {
  const [activeCallType, setActiveCallType] = useState<CallType>('gelen');
  const [gelenAramalar, setGelenAramalar] = useState<VGelenAramalar[]>([]);
  const [formAramalari, setFormAramalari] = useState<VFormAramalari[]>([]);
  const [listeAramalari, setListeAramalari] = useState<VListeAramalari[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchCallRecords();
  }, [activeCallType]);

  useEffect(() => {
    if (highlightedId) {
      // Determine which call type contains this record
      const checkRecordInType = async (callType: CallType) => {
        try {
          const { data, error } = await supabase
            .from('arama_kayit')
            .select('id')
            .eq('arama_tipi', callType)
            .eq('id', highlightedId)
            .limit(1);

          if (!error && data && data.length > 0) {
            setActiveCallType(callType);
            // Wait for the data to load and then highlight
            setTimeout(() => {
              const element = document.getElementById(`call-record-${highlightedId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-row');
                setTimeout(() => {
                  element.classList.remove('highlight-row');
                }, 3000);
              }
            }, 500);
          }
        } catch (err) {
          console.error(`Error checking record in ${callType}:`, err);
        }
      };

      // Check in all call types to find the record
      checkRecordInType('liste');
      checkRecordInType('form');
      checkRecordInType('gelen');
    }
  }, [highlightedId]);

  const fetchCallRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseSelect = `
        id,
        numara,
        cagri_tarihi,
        cagri_suresi,
        ozet,
        kayit_url,
        transkript,
        randevu_id,
        form_id,
        liste_kisi_id,
        maliyet
      `;

      let data, error;

      switch (activeCallType) {
        case 'gelen':
          ({ data, error } = await supabase
            .from('arama_kayit')
            .select(`
              ${baseSelect},
              randevu:randevu_id (
                id,
                randevu_tarihi,
                doktor:doktor_id (
                  ad,
                  soyad
                )
              )
            `)
            .eq('arama_tipi', 'gelen')
            .order('cagri_tarihi', { ascending: false }));
          if (!error) setGelenAramalar(data || []);
          break;
        case 'form':
          ({ data, error } = await supabase
            .from('arama_kayit')
            .select(`
              ${baseSelect},
              form:form_id (
                id,
                isim,
                soyisim,
                eposta,
                mesaj
              ),
              randevu:randevu_id (
                id,
                randevu_tarihi,
                doktor:doktor_id (
                  ad,
                  soyad
                )
              )
            `)
            .eq('arama_tipi', 'form')
            .order('cagri_tarihi', { ascending: false }));
          if (!error) setFormAramalari(data || []);
          break;
        case 'liste':
          ({ data, error } = await supabase
            .from('arama_kayit')
            .select(`
              ${baseSelect},
              liste_kisi:liste_kisi_id (
                id,
                isim,
                soyisim,
                liste:liste_id (
                  liste_ismi
                )
              )
            `)
            .eq('arama_tipi', 'liste')
            .order('cagri_tarihi', { ascending: false }));
          if (!error) setListeAramalari(data || []);
          break;
      }

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    switch (activeCallType) {
      case 'gelen': return gelenAramalar;
      case 'form': return formAramalari;
      case 'liste': return listeAramalari;
      default: return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    return data.filter(record => {
      const searchLower = searchTerm.toLowerCase();
      
      let matchesSearch = false;
      if (activeCallType === 'gelen') {
        const gelenRecord = record as any;
        matchesSearch = (
          gelenRecord.numara?.toLowerCase().includes(searchLower) ||
          gelenRecord.ozet?.toLowerCase().includes(searchLower) ||
          gelenRecord.notlar?.toLowerCase().includes(searchLower) ||
          gelenRecord.randevu?.doktor?.ad?.toLowerCase().includes(searchLower) ||
          gelenRecord.randevu?.doktor?.soyad?.toLowerCase().includes(searchLower)
        );
      } else if (activeCallType === 'form') {
        const formRecord = record as any;
        matchesSearch = (
          formRecord.numara?.toLowerCase().includes(searchLower) ||
          formRecord.form?.isim?.toLowerCase().includes(searchLower) ||
          formRecord.form?.soyisim?.toLowerCase().includes(searchLower) ||
          formRecord.form?.eposta?.toLowerCase().includes(searchLower) ||
          formRecord.form?.mesaj?.toLowerCase().includes(searchLower) ||
          formRecord.ozet?.toLowerCase().includes(searchLower) ||
          formRecord.notlar?.toLowerCase().includes(searchLower) ||
          formRecord.randevu?.doktor?.ad?.toLowerCase().includes(searchLower) ||
          formRecord.randevu?.doktor?.soyad?.toLowerCase().includes(searchLower)
        );
      } else if (activeCallType === 'liste') {
        const listeRecord = record as any;
        matchesSearch = (
          listeRecord.numara?.toLowerCase().includes(searchLower) ||
          listeRecord.liste_kisi?.isim?.toLowerCase().includes(searchLower) ||
          listeRecord.liste_kisi?.soyisim?.toLowerCase().includes(searchLower) ||
          listeRecord.liste_kisi?.liste?.liste_ismi?.toLowerCase().includes(searchLower) ||
          listeRecord.ozet?.toLowerCase().includes(searchLower) ||
          listeRecord.notlar?.toLowerCase().includes(searchLower)
        );
      }
      
      const matchesStatus = statusFilter === 'all'; // Durum kolonu yok
      
      return !searchTerm || matchesSearch;
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'basarili': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cevapsiz': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'mesgul': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'basarisiz': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'basarili': return 'Başarılı';
      case 'cevapsiz': return 'Cevapsız';
      case 'mesgul': return 'Meşgul';
      case 'basarisiz': return 'Başarısız';
      default: return status || 'Bilinmiyor';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'basarili': return CheckCircle;
      case 'cevapsiz': return Minus;
      case 'mesgul': return XCircle;
      case 'basarisiz': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'yuksek': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'orta': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'dusuk': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'yuksek': return 'Yüksek';
      case 'orta': return 'Orta';
      case 'dusuk': return 'Düşük';
      default: return priority || 'Belirtilmemiş';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Bilinmiyor';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownloadTranscript = (transcript: string, recordId: string) => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transkript-${recordId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const callTypeConfig = {
    gelen: {
      title: 'Gelen Aramalar',
      icon: PhoneIncoming,
      description: 'Dışarıdan gelen çağrı kayıtları',
      notificationCount: gelenCallNotificationCount
    },
    form: {
      title: 'Form Aramaları',
      icon: FileText,
      description: 'Web formundan tetiklenen çağrılar',
      notificationCount: formCallNotificationCount
    },
    liste: {
      title: 'Liste Aramaları',
      icon: Users,
      description: 'Arama listesinden yapılan çağrılar',
      notificationCount: listeCallNotificationCount
    }
  };

  const filteredData = getFilteredData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Çağrı kayıtları yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Çağrı Kayıtları</h1>
          <p className="text-gray-600">Sesli çağrı otomasyonu sistem kayıtlarını görüntüleyin</p>
        </div>
        <button
          onClick={fetchCallRecords}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>

      {/* Call Type Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200">
          {(Object.keys(callTypeConfig) as CallType[]).map((type) => {
            const config = callTypeConfig[type];
            const IconComponent = config.icon;
            const isActive = activeCallType === type;
            
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveCallType(type);
                  setSearchTerm('');
                  setStatusFilter('all');
                  onClearCallNotifications(type);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } relative`}
              >
                <IconComponent className="w-4 h-4" />
                <div className="flex items-center space-x-2">
                  <span>{config.title}</span>
                  {config.notificationCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {config.notificationCount > 99 ? '99+' : config.notificationCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {(() => {
              const CurrentCallTypeIcon = callTypeConfig[activeCallType].icon;
              return <CurrentCallTypeIcon className="w-5 h-5 text-blue-600" />;
            })()}
            <span className="text-sm text-blue-800">{callTypeConfig[activeCallType].description}</span>
          </div>
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`${callTypeConfig[activeCallType].title.toLowerCase()} içinde ara...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="basarili">Başarılı</option>
                <option value="cevapsiz">Cevapsız</option>
                <option value="mesgul">Meşgul</option>
                <option value="basarisiz">Başarısız</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Çağrı kaydı bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Arama kriterlerinize uygun çağrı kaydı bulunamadı.' 
                : `Henüz hiç ${callTypeConfig[activeCallType].title.toLowerCase()} kaydı bulunmuyor.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çağrı Bilgileri
                  </th>
                  {(activeCallType === 'form' || activeCallType === 'liste') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kişi Bilgileri
                    </th>
                  )}
                  {activeCallType === 'liste' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Liste
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Özet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maliyet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bağlantılar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((record) => {
                  const StatusIcon = getStatusIcon(record.durum);
                  
                  return (
                    <tr key={record.id} id={`call-record-${record.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm font-medium text-gray-900">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {record.numara || 'Numara yok'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {record.cagri_tarihi 
                              ? new Date(record.cagri_tarihi).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Tarih yok'
                            }
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDuration(record.cagri_suresi)}
                          </div>
                          {record.kayit_url && (
                            <div className="flex items-center">
                              <a
                                href={record.kayit_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Kayıt Dinle
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {(activeCallType === 'form' || activeCallType === 'liste') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {activeCallType === 'form' 
                                  ? ((record as any).form?.isim && (record as any).form?.soyisim 
                                      ? `${(record as any).form.isim} ${(record as any).form.soyisim}`
                                      : (record as any).form?.isim || (record as any).form?.soyisim || 'İsim yok')
                                  : ((record as any).liste_kisi?.isim && (record as any).liste_kisi?.soyisim 
                                      ? `${(record as any).liste_kisi.isim} ${(record as any).liste_kisi.soyisim}`
                                      : (record as any).liste_kisi?.isim || (record as any).liste_kisi?.soyisim || 'İsim yok')
                                }
                              </div>
                              {activeCallType === 'form' && (record as VFormAramalari).form?.mesaj && (
                                <div className="text-xs text-gray-600 mt-1 max-w-xs truncate">
                                  <MessageSquare className="w-3 h-3 inline mr-1" />
                                  {(record as VFormAramalari).form.mesaj}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {activeCallType === 'liste' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Tag className="w-4 h-4 mr-2 text-gray-400" />
                            {(record as any).liste_kisi?.liste?.liste_ismi || 'Liste yok'}
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-4">
                        <div className="max-w-md space-y-2">
                          {record.ozet && (
                            <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                              <strong>Özet:</strong> {record.ozet}
                            </div>
                          )}
                          {!record.ozet && (
                            <div className="text-sm text-gray-400">Özet yok</div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {record.maliyet ? (
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                              <span className="font-medium">
                                {record.maliyet.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 4
                                })}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <Minus className="w-4 h-4 mr-1" />
                              <span className="text-xs">Maliyet yok</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          {record.transkript && (
                            <button
                              onClick={() => handleDownloadTranscript(record.transkript!, record.id)}
                              className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Transkript İndir</span>
                            </button>
                          )}
                          {record.randevu_id && (
                            <button
                              onClick={() => onMenuItemClick('appointments', record.randevu_id)}
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>Randevuya Git</span>
                            </button>
                          )}
                          {record.form_id && (
                            <button
                              onClick={() => onMenuItemClick('forms', record.form_id)}
                              className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>Forma Git</span>
                            </button>
                          )}
                          {!record.transkript && !record.randevu_id && !record.form_id && (
                            <div className="flex items-center text-gray-400">
                              <Minus className="w-4 h-4 mr-2" />
                              <span className="text-xs">Bağlantı yok</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Toplam {filteredData.length} kayıt gösteriliyor
          </span>
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <span className="text-blue-600">
              Filtrelenmiş sonuçlar
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallRecordsContent;