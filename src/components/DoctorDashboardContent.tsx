import React from 'react';
import { 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DoctorDashboardContentProps {
  doktorId?: string | null;
}

const StatCard = ({ title, value, icon: Icon, change, changeType }: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <div className={`flex items-center mt-2 text-xs ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            {change}
          </div>
        )}
      </div>
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
    </div>
  </div>
);

const DoctorDashboardContent = ({ doktorId }: DoctorDashboardContentProps) => {
  const [metrics, setMetrics] = React.useState({
    pendingAppointments: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    availableSlots: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (doktorId) {
      fetchDoctorMetrics();
    }
  }, [doktorId]);

  const fetchDoctorMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured - using mock data');
        setMetrics({
          pendingAppointments: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          availableSlots: 0
        });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Fetch all metrics in parallel
      const [
        pendingAppointmentsResult,
        todayAppointmentsResult,
        completedAppointmentsResult,
        availableSlotsResult
      ] = await Promise.all([
        // Pending appointments for this doctor
        supabase
          .from('randevu')
          .select('*', { count: 'exact', head: true })
          .eq('durum', 'beklemede')
          .eq('doktor_id', doktorId),
        
        // Today's appointments for this doctor
        supabase
          .from('randevu')
          .select('*', { count: 'exact', head: true })
          .eq('doktor_id', doktorId)
          .gte('randevu_tarihi', today)
          .lt('randevu_tarihi', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        
        // Completed appointments for this doctor
        supabase
          .from('randevu')
          .select('*', { count: 'exact', head: true })
          .eq('durum', 'tamamlandi')
          .eq('doktor_id', doktorId),
        
        // Available slots for this doctor (from calendar)
        supabase
          .from('doktor_takvim')
          .select('*', { count: 'exact', head: true })
          .eq('doktor_id', doktorId)
          .eq('musait', true)
          .gte('tarih', today)
      ]);

      // Check for errors
      const results = [
        pendingAppointmentsResult,
        todayAppointmentsResult,
        completedAppointmentsResult,
        availableSlotsResult
      ];

      const hasError = results.some(result => result.error);
      if (hasError) {
        console.warn('Some metrics failed to load, using available data');
      }

      setMetrics({
        pendingAppointments: pendingAppointmentsResult.count || 0,
        todayAppointments: todayAppointmentsResult.count || 0,
        completedAppointments: completedAppointmentsResult.count || 0,
        availableSlots: availableSlotsResult.count || 0
      });

    } catch (err) {
      console.warn('Could not fetch doctor metrics - Supabase may not be configured:', err);
      setError('Metrikler yüklenirken hata oluştu');
      setMetrics({
        pendingAppointments: 0,
        todayAppointments: 0,
        completedAppointments: 0,
        availableSlots: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Doktor Paneli</h1>
          <p className="text-gray-600">Kişisel randevu ve takvim yönetimi</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Metrikler yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Doktor Paneli</h1>
          <p className="text-gray-600">Kişisel randevu ve takvim yönetimi</p>
        </div>
        <button
          onClick={fetchDoctorMetrics}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Bekleyen Randevularım"
          value={metrics.pendingAppointments.toLocaleString()}
          icon={Calendar}
        />
        <StatCard
          title="Bugünkü Randevularım"
          value={metrics.todayAppointments.toLocaleString()}
          icon={Clock}
        />
        <StatCard
          title="Tamamlanan Randevularım"
          value={metrics.completedAppointments.toLocaleString()}
          icon={CheckCircle}
        />
        <StatCard
          title="Müsait Saatlerim"
          value={metrics.availableSlots.toLocaleString()}
          icon={UserCheck}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Hızlı İşlemler</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Randevularım</h3>
              <p className="text-sm text-blue-600">Randevu kayıtlarını görüntüle</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Profilim</h3>
              <p className="text-sm text-green-600">Profil ve takvim ayarları</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Müsaitlik</h3>
              <p className="text-sm text-purple-600">Takvim müsaitliklerini yönet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bugünkü Program</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bugün için randevu yok</h3>
            <p className="text-gray-500">Bugün için henüz randevu bulunmuyor.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboardContent;