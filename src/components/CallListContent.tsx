import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Users, Phone, RefreshCw, ArrowLeft, Edit, Trash2, Save, X, MessageSquare, ArrowRight, FileText, ArrowUp, ArrowDown, Filter } from 'lucide-react';

interface Liste {
  id: string;
  liste_ismi: string;
  aranma_durumu: boolean;
  toplam_kisi: number;
  tamamlanan: number;
  olusturulma_tarihi: string;
  asistan_mesaji?: string;
  aranma_durumu: boolean; // Add this to the interface
}

interface ListeKisi {
  id: string;
  liste_id: string;
  isim: string;
  soyisim: string;
  telefon: string;
  arama_durumu: string;
}

interface CallListContentProps {
  onMenuItemClick?: (menuId: string, highlightId?: string) => void;
}

export default function CallListContent({ onMenuItemClick }: CallListContentProps) {
  const [listeler, setListeler] = useState<Liste[]>([]);
  const [selectedListe, setSelectedListe] = useState<Liste | null>(null);
  const [kisiler, setKisiler] = useState<ListeKisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewListeModal, setShowNewListeModal] = useState(false);
  const [showEditListeModal, setShowEditListeModal] = useState(false);
  const [currentListeForm, setCurrentListeForm] = useState<Partial<Liste>>({ liste_ismi: '', asistan_mesaji: '' });
  const [showNewKisiModal, setShowNewKisiModal] = useState(false);
  const [showEditKisiModal, setShowEditKisiModal] = useState(false);
  const [currentKisiForm, setCurrentKisiForm] = useState<Partial<ListeKisi>>({ isim: '', soyisim: '', telefon: '' });
  const [kisiStatusFilter, setKisiStatusFilter] = useState<string>('all');
  const [kisiSortOrder, setKisiSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchListeler();
  }, []);

  const fetchListeler = async () => {
    try {
      const { data, error } = await supabase
        .from('liste')
        .select('id, liste_ismi, aranma_durumu, toplam_kisi, tamamlanan, olusturulma_tarihi, asistan_mesaji')
        .order('olusturulma_tarihi', { ascending: false });

      if (error) throw error;
      setListeler(data || []);
    } catch (error) {
      console.error('Error fetching listeler:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKisiler = async (listeId: string) => {
    try {
      const { data, error } = await supabase
        .from('liste_kisi')
        .select('id, liste_id, isim, soyisim, telefon, arama_durumu, kayit')
        .eq('liste_id', listeId)
        .order('isim');

      if (error) throw error;
      setKisiler(data || []);

      // Başarılı aramaları say ve liste durumunu güncelle
      await updateListeCompletionStatus(listeId, data || []);
    } catch (error) {
      console.error('Error fetching kisiler:', error);
    }
  };

  const refreshSelectedListe = async () => {
    if (!selectedListe) return;
    
    try {
      const { data, error } = await supabase
        .from('liste') // Re-fetch the single list to get updated counts/status
        .select('*')
        .eq('id', selectedListe.id)
        .single();

      if (error) throw error;
      setSelectedListe(data);
      
      // Update the list in the main list array as well
      setListeler(prev => prev.map(liste => 
        liste.id === selectedListe.id ? data : liste
      ));

      // Kişileri de yenile ve tamamlanma durumunu kontrol et
      await fetchKisiler(selectedListe.id);
    } catch (error) {
      console.error('Error refreshing liste:', error);
      alert('Listeyi yenilerken hata oluştu.');
    }
  };

  const updateListeCompletionStatus = async (listeId: string, kisilerData: ListeKisi[]) => {
    try {
      // Başarılı aramaları say
      const basariliAramaSayisi = kisilerData.filter(kisi => kisi.arama_durumu === 'basarili').length;
      
      // Mevcut liste bilgilerini al
      const { data: currentListe, error: fetchError } = await supabase
        .from('liste')
        .select('id, toplam_kisi, tamamlanan, aranma_durumu')
        .eq('id', listeId)
        .single();

      if (fetchError) throw fetchError;

      // Eğer tamamlanan sayısı değiştiyse güncelle
      if (currentListe.tamamlanan !== basariliAramaSayisi) {
        const updateData: any = { tamamlanan: basariliAramaSayisi };
        
        // Eğer tüm kişiler başarılı arandıysa ve arama hala devam ediyorsa, aramayı durdur
        if (basariliAramaSayisi >= currentListe.toplam_kisi && 
            currentListe.toplam_kisi > 0 && 
            currentListe.aranma_durumu) {
          updateData.aranma_durumu = false;
        }

        const { error: updateError } = await supabase
          .from('liste')
          .update(updateData)
          .eq('id', listeId);

        if (updateError) throw updateError;

        // Local state'leri güncelle
        setListeler(prev => prev.map(liste => 
          liste.id === listeId 
            ? { ...liste, tamamlanan: basariliAramaSayisi, aranma_durumu: updateData.aranma_durumu ?? liste.aranma_durumu }
            : liste
        ));

        if (selectedListe?.id === listeId) {
          setSelectedListe(prev => prev 
            ? { ...prev, tamamlanan: basariliAramaSayisi, aranma_durumu: updateData.aranma_durumu ?? prev.aranma_durumu }
            : null
          );
        }
      }
    } catch (error) {
      console.error('Error updating liste completion status:', error);
    }
  };

  const createListe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liste')
        .insert([{
          liste_ismi: currentListeForm.liste_ismi,
          asistan_mesaji: currentListeForm.asistan_mesaji || '',
          aranma_durumu: false,
          toplam_kisi: 0, // Should be 0 initially
          tamamlanan: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setListeler(prev => [data as Liste, ...prev]);
      setCurrentListeForm({ liste_ismi: '', asistan_mesaji: '' });
      setShowNewListeModal(false);
      alert('Liste başarıyla oluşturuldu!');
    } catch (err) {
      console.error('Error creating liste:', err);
      alert('Liste oluşturulurken hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const addKisi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListe) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liste_kisi')
        .insert([{
          liste_id: selectedListe.id,
          isim: currentKisiForm.isim,
          soyisim: currentKisiForm.soyisim,
          telefon: currentKisiForm.telefon,
          arama_durumu: 'bekliyor'
        }])
        .select()
        .single();

      if (error) throw error;

      // Toplam kişi sayısını artır
      const { error: updateError } = await supabase
        .from('liste')
        .update({ toplam_kisi: selectedListe.toplam_kisi + 1 })
        .eq('id', selectedListe.id);

      if (updateError) throw updateError;

      setKisiler(prev => [...prev, data]);
      setSelectedListe(prev => prev ? { ...prev, toplam_kisi: (prev.toplam_kisi || 0) + 1 } : null);
      setCurrentKisiForm({ isim: '', soyisim: '', telefon: '' });
      setShowNewKisiModal(false);
      
      // Tamamlanma durumunu kontrol et
      await updateListeCompletionStatus(selectedListe.id, [...kisiler, data]);
      alert('Kişi başarıyla eklendi!');
    } catch (err) {
      console.error('Error adding kisi:', err);
      alert('Kişi eklenirken hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const startCalling = async (liste: Liste) => {
    try {
      // N8N webhook'a istek gönder
      const response = await fetch('https://n8n.srv857453.hstgr.cloud/webhook/a5742bdb-a4c9-4a21-ad23-8e4dd42869a1', {
        method: 'POST', // Changed to POST as per webhook example
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          liste_id: liste.id,
          asistan_mesaji: liste.asistan_mesaji
        })
      });

      // Log the response for debugging
      console.log('Webhook Response:', response);

      if (response.ok) {
        console.log('Webhook başarılı, aranma_durumu güncelleniyor');
        const { error } = await supabase
          .from('liste')
          .update({ aranma_durumu: true })
          .eq('id', liste.id);

        if (error) throw error;

        // Local state'i güncelle - hem ana liste hem de seçili liste
        setListeler(prev => prev.map(l =>
          l.id === liste.id ? { ...l, aranma_durumu: true } : l
        ));
        
        if (selectedListe?.id === liste.id) {
          setSelectedListe(prev => prev ? { ...prev, aranma_durumu: true } : null);
        }
        
        alert('Arama başlatıldı! Liste durumu güncellendi.');
      } else {
        console.error('Webhook failed:', response.status, response.statusText);
        alert('Arama başlatılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Error starting calls:', error);
      alert('Arama başlatılırken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  };

  const getKisiStatusClasses = (status: string) => {
    switch (status) {
      case 'bekliyor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'aramada': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mesgul': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'basarili': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getKisiStatusText = (status: string) => {
    switch (status) {
      case 'bekliyor': return 'Bekliyor';
      case 'aramada': return 'Aramada';
      case 'mesgul': return 'Meşgul';
      case 'basarili': return 'Başarılı';
      default: return status;
    }
  };

  const statusOrder = ['bekliyor', 'aramada', 'mesgul', 'basarili'];

  const getFilteredAndSortedKisiler = () => {
    // Filter by status
    const filteredKisiler = kisiStatusFilter === 'all' 
      ? kisiler 
      : kisiler.filter(kisi => kisi.arama_durumu === kisiStatusFilter);

    // Sort by status order
    const sortedKisiler = [...filteredKisiler].sort((a, b) => {
      const aIndex = statusOrder.indexOf(a.arama_durumu);
      const bIndex = statusOrder.indexOf(b.arama_durumu);
      
      if (kisiSortOrder === 'asc') {
        return aIndex - bIndex;
      } else {
        return bIndex - aIndex;
      }
    });

    return sortedKisiler;
  };

  const updateListe = async () => {
    if (!currentListeForm.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('liste')
        .update({
          liste_ismi: currentListeForm.liste_ismi,
          asistan_mesaji: currentListeForm.asistan_mesaji || ''
        })
        .eq('id', currentListeForm.id);

      if (error) throw error;

      // Update the list in the main list array as well
      setListeler(prev => prev.map(l => l.id === currentListeForm.id ? { ...l, ...currentListeForm as Liste } : l));
      if (selectedListe?.id === currentListeForm.id) setSelectedListe(prev => ({ ...prev!, ...currentListeForm as Liste }));

      setShowEditListeModal(false);
      alert('Liste başarıyla güncellendi!');
    } catch (err) {
      console.error('Error updating liste:', err);
      alert('Liste güncellenirken hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const deleteListe = async (listeId: string) => {
    if (!confirm('Bu listeyi silmek istediğinizden emin misiniz? Tüm kişiler de silinecek.')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('liste')
        .delete()
        .eq('id', listeId);

      if (error) throw error;
      setListeler(prev => prev.filter(liste => liste.id !== listeId));
      
      if (selectedListe?.id === listeId) {
        setSelectedListe(null);
        setKisiler([]); // Clear persons if the selected list is deleted
      }
      alert('Liste başarıyla silindi!');
    } catch (error) {
      console.error('Error deleting liste:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKisi = async () => {
    if (!currentKisiForm.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('liste_kisi')
        .update({
          isim: currentKisiForm.isim,
          soyisim: currentKisiForm.soyisim,
          telefon: currentKisiForm.telefon
        })
        .eq('id', currentKisiForm.id);

      if (error) throw error;
      setKisiler(prev => prev.map(kisi => 
        kisi.id === currentKisiForm.id ? { ...kisi, ...currentKisiForm as ListeKisi } : kisi
      ));

      setShowEditKisiModal(false);
      setCurrentKisiForm({ isim: '', soyisim: '', telefon: '' });
      
      // Tamamlanma durumunu kontrol et
      const updatedKisiler = kisiler.map(kisi => 
        kisi.id === currentKisiForm.id ? { ...kisi, ...currentKisiForm as ListeKisi } : kisi
      );
      await updateListeCompletionStatus(selectedListe!.id, updatedKisiler);
      alert('Kişi başarıyla güncellendi!');
    } catch (error) {
      console.error('Error updating kisi:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteKisi = async (kisiId: string) => {
    if (!confirm('Bu kişiyi silmek istediğinizden emin misiniz?')) return;
    if (!selectedListe) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('liste_kisi')
        .delete()
        .eq('id', kisiId);

      if (error) throw error;

      // Toplam kişi sayısını azalt
      const { error: updateError } = await supabase
        .from('liste')
        .update({ toplam_kisi: Math.max(0, selectedListe.toplam_kisi - 1) })
        .eq('id', selectedListe.id);

      if (updateError) throw updateError;
      setKisiler(prev => prev.filter(kisi => kisi.id !== kisiId));
      setSelectedListe(prev => prev ? { ...prev, toplam_kisi: Math.max(0, (prev.toplam_kisi || 0) - 1) } : null);
      
      // Ana liste array'ini de güncelle
      setListeler(prev => prev.map(liste => 
        liste.id === selectedListe.id
          ? { ...liste, toplam_kisi: Math.max(0, (liste.toplam_kisi || 0) - 1) }
          : liste
      ));
      
      // Tamamlanma durumunu kontrol et
      const updatedKisiler = kisiler.filter(kisi => kisi.id !== kisiId);
      await updateListeCompletionStatus(selectedListe.id, updatedKisiler);
    } catch (error) {
      console.error('Error deleting kisi:', error);
    } finally {
      setLoading(false);
    }
  };

  const getListeStatus = (liste: Liste) => {
    if (liste.toplam_kisi > 0 && liste.tamamlanan >= liste.toplam_kisi) {
      return { text: 'Liste Bitti', color: 'text-blue-600' };
    }
    if (liste.aranma_durumu) {
      return { text: 'Arama Devam Ediyor', color: 'text-orange-600' };
    }
    return { text: 'Beklemede', color: 'text-gray-600' };
  };

  const handleEditListeClick = (liste: Liste) => {
    setCurrentListeForm(liste);
    setShowEditListeModal(true);
  };

  const handleAddKisiClick = () => {
    setCurrentKisiForm({ isim: '', soyisim: '', telefon: '' });
    setShowNewKisiModal(true);
  };

  const handleEditKisiClick = (kisi: ListeKisi) => {
    setCurrentKisiForm(kisi);
    setShowEditKisiModal(true);
  };

  const handleCloseNewListeModal = () => {
    setShowNewListeModal(false);
    setCurrentListeForm({ liste_ismi: '', asistan_mesaji: '' });
  };

  const handleCloseEditListeModal = () => {
    setShowEditListeModal(false);
    setCurrentListeForm({ liste_ismi: '', asistan_mesaji: '' });
  };

  const handleCloseNewKisiModal = () => {
    setShowNewKisiModal(false);
    setCurrentKisiForm({ isim: '', soyisim: '', telefon: '' });
  };

  const handleCloseEditKisiModal = () => {
    setShowEditKisiModal(false);
    setCurrentKisiForm({ isim: '', soyisim: '', telefon: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedListe) {
    const status = getListeStatus(selectedListe);
    const isCompleted = selectedListe.tamamlanan >= selectedListe.toplam_kisi && selectedListe.toplam_kisi > 0;
    const isCallInProgress = selectedListe.aranma_durumu;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedListe(null)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Geri</span>
            </button>
            <button
              onClick={refreshSelectedListe} // Refresh button for the current list
              className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Yenile</span>
            </button>
          </div>
          <button
            onClick={handleAddKisiClick}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Kişi Ekle</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{selectedListe.liste_ismi}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} border border-gray-200`}>
              {status.text}
            </span>
          </div>
          
          {/* Asistan Mesajı */}
          {selectedListe.asistan_mesaji && ( // Display assistant message if available
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Asistan Mesajı:</h4>
                  <p className="text-sm text-blue-800">{selectedListe.asistan_mesaji}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedListe.toplam_kisi || 0}</div>
              <div className="text-sm text-gray-600">Toplam Kişi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedListe.tamamlanan || 0}</div>
              <div className="text-sm text-gray-600">Tamamlanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{(selectedListe.toplam_kisi || 0) - (selectedListe.tamamlanan || 0)}</div>
              <div className="text-sm text-gray-600">Kalan</div>
            </div>
          </div>

          <button
            onClick={() => startCalling(selectedListe)}
            disabled={isCompleted || isCallInProgress}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${ // Button for starting calls
              isCompleted || isCallInProgress
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCompleted ? 'Liste Bitti' : isCallInProgress ? 'Arama Devam Ediyor' : 'Tümünü Ara'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Kişiler</h3>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={kisiStatusFilter}
                    onChange={(e) => setKisiStatusFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="bekliyor">Bekliyor</option>
                    <option value="aramada">Aramada</option>
                    <option value="mesgul">Meşgul</option>
                    <option value="basarili">Başarılı</option>
                  </select>
                </div>
                <button
                  onClick={() => setKisiSortOrder(kisiSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title={`Sıralama: ${kisiSortOrder === 'asc' ? 'Artan' : 'Azalan'}`}
                >
                  {kisiSortOrder === 'asc' ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  <span>Sırala</span>
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y">
            {getFilteredAndSortedKisiler().map((kisi) => (
              <div key={kisi.id} className="p-4 hover:bg-gray-50">
                {showEditKisiModal && currentKisiForm.id === kisi.id ? ( // Use currentKisiForm for editing
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={currentKisiForm.isim || ''}
                        onChange={(e) => setCurrentKisiForm({...currentKisiForm, isim: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="İsim"
                      />
                      <input
                        type="text"
                        value={currentKisiForm.soyisim || ''}
                        onChange={(e) => setCurrentKisiForm({...currentKisiForm, soyisim: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Soyisim"
                      />
                    </div>
                    <input
                      type="tel"
                      value={currentKisiForm.telefon || ''}
                      onChange={(e) => setCurrentKisiForm({...currentKisiForm, telefon: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Telefon"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={updateKisi}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>Kaydet</span>
                      </button>
                      <button
                        onClick={handleCloseEditKisiModal}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>İptal</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">{kisi.isim} {kisi.soyisim}</div>
                      <div className="text-sm text-gray-600">{kisi.telefon}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        kisi.arama_durumu === 'basarili' ? 'bg-green-100 text-green-800' :
                        kisi.arama_durumu === 'basarisiz' ? 'bg-red-100 text-red-800' :
                        kisi.arama_durumu === 'aramada' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {kisi.arama_durumu === 'bekliyor' ? 'Bekliyor' :
                         kisi.arama_durumu === 'aramada' ? 'Aramada' :
                         kisi.arama_durumu === 'basarili' ? 'Başarılı' : // Corrected typo
                         kisi.arama_durumu === 'basarisiz' ? 'Başarısız' : kisi.arama_durumu}
                      </span>
                      {kisi.kayit && onMenuItemClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMenuItemClick('calls', kisi.kayit);
                          }}
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          title="Kayıt Detaylarına Git"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Kayıt Detayları</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditKisiClick(kisi)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteKisi(kisi.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {getFilteredAndSortedKisiler().length === 0 && kisiler.length > 0 && (
              <div className="p-8 text-center text-gray-500">
                <Filter className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div>Seçilen duruma uygun kişi bulunamadı</div>
                <button
                  onClick={() => setKisiStatusFilter('all')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Tüm kişileri göster
                </button>
              </div>
            )}
            {kisiler.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Henüz kişi eklenmemiş
              </div>
            )}
          </div>
        </div>

        {/* New Kisi Modal */}
        {showNewKisiModal && ( // Use showNewKisiModal
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Yeni Kişi Ekle</h3>
              <form onSubmit={addKisi} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
                  <input
                    type="text"
                    value={currentKisiForm.isim || ''}
                    onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, isim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyisim</label>
                  <input
                    type="text"
                    value={currentKisiForm.soyisim || ''}
                    onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, soyisim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={currentKisiForm.telefon || ''}
                    onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, telefon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ekle
                  </button>
                  <button
                    type="button" // Changed to type="button"
                    onClick={handleCloseNewKisiModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return ( // Main list view
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Arama Listeleri</h1>
        <button
          onClick={() => setShowNewListeModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Liste</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listeler.map((liste) => {
          const status = getListeStatus(liste);
          return (
            <div
              key={liste.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => { // Click on card to view details
                  setSelectedListe(liste);
                  fetchKisiler(liste.id);
                }}
              >
                <h3 className="text-lg font-medium text-gray-800">{liste.liste_ismi}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} bg-gray-100`}>
                    {status.text}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditListeClick(liste); // Use new handler
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteListe(liste.id);
                    }}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Asistan Mesajı Önizleme */}
              {liste.asistan_mesaji && ( // Assistant message preview
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer" // Added cursor-pointer
                  onClick={() => {
                    setSelectedListe(liste);
                    fetchKisiler(liste.id);
                  }}
                >
                  <div className="flex items-start space-x-2">
                    <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-blue-900 mb-1">Asistan Mesajı:</div>
                      <div className="text-xs text-blue-800 line-clamp-2"> {/* line-clamp for truncation */}
                        {liste.asistan_mesaji.length > 100 
                          ? `${liste.asistan_mesaji.substring(0, 100)}...`
                          : liste.asistan_mesaji
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2"
                onClick={() => {
                  setSelectedListe(liste);
                  fetchKisiler(liste.id);
                }} // Click on card body to view details
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Toplam Kişi:</span>
                  <span className="font-medium">{liste.toplam_kisi || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tamamlanan:</span>
                  <span className="font-medium">{liste.tamamlanan || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Kalan:</span>
                  <span className="font-medium">{liste.toplam_kisi - liste.tamamlanan}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedListe(liste);
                    fetchKisiler(liste.id);
                  }}
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700" // View button
                >
                  Görüntüle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {listeler.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Henüz liste yok</h3>
          <p className="text-gray-600 mb-4">İlk arama listenizi oluşturun</p>
          <button
            onClick={() => setShowNewListeModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Liste Oluştur
          </button>
        </div>
      )}
      
      {/* New Liste Modal */}
      {showNewListeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Yeni Liste Oluştur</h3>
            <form onSubmit={createListe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Liste İsmi</label>
                <input
                  type="text"
                  value={currentListeForm.liste_ismi || ''}
                  onChange={(e) => setCurrentListeForm(prev => ({ ...prev, liste_ismi: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Ocak Ayı Hastaları"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asistan Mesajı (Opsiyonel)</label>
                <textarea
                  rows={3}
                  value={currentListeForm.asistan_mesaji || ''}
                  onChange={(e) => setCurrentListeForm(prev => ({ ...prev, asistan_mesaji: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Asistanın arama sırasında söyleyeceği mesaj..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Oluştur
                </button>
                <button
                  type="button"
                  onClick={handleCloseNewListeModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Liste Modal */}
      {showEditListeModal && currentListeForm.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Liste Düzenle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Liste İsmi</label>
                <input
                  type="text"
                  value={currentListeForm.liste_ismi || ''}
                  onChange={(e) => setCurrentListeForm({...currentListeForm, liste_ismi: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asistan Mesajı (Opsiyonel)</label>
                <textarea
                  rows={3}
                  value={currentListeForm.asistan_mesaji || ''}
                  onChange={(e) => setCurrentListeForm({...currentListeForm, asistan_mesaji: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Asistanın arama sırasında söyleyeceği mesaj..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={updateListe}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kaydet
                </button>
                <button
                  onClick={handleCloseEditListeModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Kisi Modal */}
      {showEditKisiModal && currentKisiForm.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Kişi Düzenle</h3>
            <form onSubmit={(e) => { e.preventDefault(); updateKisi(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
                <input
                  type="text"
                  value={currentKisiForm.isim || ''}
                  onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, isim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soyisim</label>
                <input
                  type="text"
                  value={currentKisiForm.soyisim || ''}
                  onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, soyisim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={currentKisiForm.telefon || ''}
                  onChange={(e) => setCurrentKisiForm(prev => ({ ...prev, telefon: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditKisiModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}