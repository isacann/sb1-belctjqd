export interface MenuItemType {
  id: string;
  title: string;
  icon: string;
  active?: boolean;
}

export interface RandevuKisi {
  id: string;
  isim: string;
  soyisim: string;
  telefon: string;
}

export interface Doktor {
  id: string;
  ad: string;
  soyad: string;
  unvan?: string;
  uzmanlik_id?: bigint;
  telefon?: string;
  email?: string;
  aktif: boolean;
  klinik_lokasyon?: string;
  uzmanlik?: Uzmanlik;
}

export interface DoktorTakvim {
  id: string;
  doktor_id?: string;
  tarih: string;
  baslangic_saat: string;
  bitis_saat: string;
  musait?: boolean;
  not_bilgi?: string;
}

export interface Hizmet {
  id: string;
  fiyat?: number;
  sure_dakika?: number;
  aciklama?: string;
  aktif: boolean;
  uzmanlik_id?: bigint;
  uzmanlik?: Uzmanlik;
}

export interface Randevu {
  id: string;
  randevu_kisi_id?: string;
  doktor_id?: string;
  hizmet_id?: string;
  randevu_tarihi: string;
  randevu_tipi?: 'online' | 'klinik';
  online_link?: string;
  randevu_notu?: string;
  durum: 'beklemede' | 'onaylandi' | 'reddedildi' | 'tamamlandi' | 'iptal' | 'gelmedi' | 'gecmis';
  olusturulma_tarihi?: string;
  red_nedeni?: string;
  guncellenme_tarihi?: string;
  sms?: 'Gönderilmedi' | 'Gönderildi';
  randevu_kisi?: RandevuKisi;
  doktor?: Doktor;
  hizmetler?: Hizmet;
}

export interface Uzmanlik {
  id: bigint;
  ad: string;
}
export interface DashboardStats {
  totalCalls: number;
  completedAppointments: number;
  pendingForms: number;
  activeDoctors: number;
}

export interface Form {
  id: string;
  isim?: string;
  soyisim?: string;
  eposta?: string;
  telefon?: string;
  mesaj?: string;
  arama_tetiklendi?: boolean;
}

export interface Liste {
  id: string;
  liste_ismi: string;
  aranma_durumu?: boolean;
  toplam_kisi?: number;
  tamamlanan?: number;
  olusturulma_tarihi?: string;
  asistan_mesaji?: string;
}

export interface ListeKisi {
  id: string;
  liste_id?: string;
  isim?: string;
  soyisim?: string;
  telefon?: string;
  arama_durumu?: 'bekliyor' | 'gorusmede' | 'arandi' | 'mesgul';
  kayit?: string;
}

export interface DoktorGiris {
  id: string;
  doktor_id: string;
  kullanici_adi: string;
  sifre: string;
  doktor?: Doktor;
}

// View types for call records
export interface VGelenAramalar {
  id: string;
  numara?: string;
  cagri_tarihi?: string;
  cagri_suresi?: number;
  ozet?: string;
  durum?: string;
  not_oncelik?: string;
  kayit_url?: string;
  transkript?: string;
  randevu_id?: string;
  randevu_var?: boolean;
  randevu_tarihi?: string;
  doktor_adi?: string;
}

export interface VFormAramalari {
  id: string;
  numara?: string;
  isim?: string;
  soyisim?: string;
  eposta?: string;
  mesaj?: string;
  cagri_tarihi?: string;
  cagri_suresi?: number;
  ozet?: string;
  durum?: string;
  not_oncelik?: string;
  kayit_url?: string;
  transkript?: string;
  randevu_id?: string;
  randevu_var?: boolean;
  randevu_tarihi?: string;
  doktor_adi?: string;
}

export interface VListeAramalari {
  id: string;
  numara?: string;
  isim?: string;
  soyisim?: string;
  liste_ismi?: string;
  cagri_tarihi?: string;
  cagri_suresi?: number;
  ozet?: string;
  durum?: string;
  not_oncelik?: string;
  kayit_url?: string;
  transkript?: string;
}