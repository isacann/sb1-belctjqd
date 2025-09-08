import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Form } from '../types';

interface FormContentProps {
  highlightedId?: string;
}

const FormContent = ({ highlightedId }: FormContentProps) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (highlightedId && forms.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`form-${highlightedId}`);
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
  }, [highlightedId, forms]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('form')
        .select('id, isim, soyisim, eposta, telefon, mesaj, arama_tetiklendi, olusturulma_tarihi')
        .order('olusturulma_tarihi', { ascending: false });

      if (error) throw error;

      setForms(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredForms = forms.filter(form => {
    const searchLower = searchTerm.toLowerCase();
    return (
      form.isim?.toLowerCase().includes(searchLower) ||
      form.soyisim?.toLowerCase().includes(searchLower) ||
      form.eposta?.toLowerCase().includes(searchLower) ||
      form.telefon?.toLowerCase().includes(searchLower) ||
      form.mesaj?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Form kayıtları yükleniyor...</span>
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
            onClick={fetchForms}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Kayıtları</h1>
          <p className="text-gray-600">Web sitesi üzerinden gönderilen form kayıtlarını görüntüleyin</p>
        </div>
        <button
          onClick={fetchForms}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="İsim, soyisim, e-posta, telefon veya mesaj ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Forms List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredForms.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Form kaydı bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Arama kriterlerinize uygun form kaydı bulunamadı.' 
                : 'Henüz hiç form kaydı bulunmuyor.'}
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
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mesaj
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arama Durumu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma Tarihi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form.id} id={`form-${form.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {form.isim && form.soyisim 
                              ? `${form.isim} ${form.soyisim}`
                              : form.isim || form.soyisim || 'İsim belirtilmemiş'
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {form.telefon && (
                          <div className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-3 h-3 mr-2 text-gray-400" />
                            {form.telefon}
                          </div>
                        )}
                        {form.eposta && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-2 text-gray-400" />
                            {form.eposta}
                          </div>
                        )}
                        {!form.telefon && !form.eposta && (
                          <div className="text-sm text-gray-400">
                            İletişim bilgisi yok
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {form.mesaj ? (
                          <div className="text-sm text-gray-900 break-words">
                            <MessageSquare className="w-4 h-4 inline mr-2 text-gray-400" />
                            {form.mesaj.length > 100 
                              ? `${form.mesaj.substring(0, 100)}...`
                              : form.mesaj
                            }
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Mesaj yok
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {form.arama_tetiklendi ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Arandı</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-orange-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Aranmadı</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {form.olusturulma_tarihi 
                          ? new Date(form.olusturulma_tarihi).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Tarih yok'
                        }
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
      {filteredForms.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-blue-800 font-medium">
                Toplam: {filteredForms.length} form kaydı
              </span>
              <span className="text-blue-600">
                Aranan: {filteredForms.filter(f => f.arama_tetiklendi).length}
              </span>
              <span className="text-blue-600">
                Aranmayan: {filteredForms.filter(f => !f.arama_tetiklendi).length}
              </span>
            </div>
            {searchTerm && (
              <span className="text-blue-600">
                "{searchTerm}" için {filteredForms.length} sonuç
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormContent;