import React from 'react';
import { 
  TrendingUp, 
  FileText, 
  Phone,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  UserCheck,
  PhoneCall,
  Stethoscope,
  ListChecks
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const AdminDashboardContent = () => {
  const [metrics, setMetrics] = React.useState({
    incomingCalls: 0,
    pendingAppointments: 0,
    incomingFormCount: 0,
    activeDoctors: 0,
    pendingListPersons: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured - using mock data');
        setMetrics({
          incomingCalls: 0,
          pendingAppointments: 0,
          incomingFormCount: 0,
          activeDoctors: 0,
          pendingListPersons: 0
        });
        setLoading(false);
        return;
      }

      // Fetch all metrics in parallel
      const [
        incomingCallsResult,
        pendingAppointmentsResult,
        incomingFormCountResult,
        activeDoctorsResult,
        pendingListPersonsResult
      ] = await Promise.all([
        // Incoming calls only
        supabase
          .from('arama_kayit')
          .select('*', { count: 'exact', head: true })
          .eq('arama_tipi', 'gelen'),
        
        // Pending appointments
        supabase
          .from('randevu')
          .select('*', { count: 'exact', head: true })
          .eq('durum', 'beklemede'),
        
        // Incoming form count
        supabase
          .from('form')
          .select('*', { count: 'exact', head: true }),
        
        // Active doctors
        supabase
          .from('doktor')
          .select('*', { count: 'exact', head: true })
          .eq('aktif', true),
        
        // Pending list persons
        supabase
          .from('liste_kisi')
          .select('*', { count: 'exact', head: true })
          .eq('arama_durumu', 'bekliyor')
      ]);

      // Check for errors
      const results = [
        incomingCallsResult,
        pendingAppointmentsResult,
        incomingFormCountResult,
        activeDoctorsResult,
        pendingListPersonsResult
      ];

      const hasError = results.some(result => result.error);
      if (hasError) {
        console.warn('Some metrics failed to load, using available data');
      }

      setMetrics({
        incomingCalls: incomingCallsResult.count || 0,
        pendingAppointments: pendingAppointmentsResult.count || 0,
        incomingFormCount: incomingFormCountResult.count || 0,
        activeDoctors: activeDoctorsResult.count || 0,
        pendingListPersons: pendingListPersonsResult.count || 0
      });

    } catch (err) {
      console.warn('Could not fetch dashboard metrics - Supabase may not be configured:', err);
      setError('Metrikler yüklenirken hata oluştu');
      // Set default values on error
      setMetrics({
        incomingCalls: 0,
        pendingAppointments: 0,
        incomingFormCount: 0,
        activeDoctors: 0,
        pendingListPersons: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yönetici Paneli</h1>
          <p className="text-gray-600">Sesli çağrı otomasyonu sistem özeti</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yönetici Paneli</h1>
          <p className="text-gray-600">Sesli çağrı otomasyonu sistem özeti</p>
        </div>
        <button
          onClick={fetchDashboardMetrics}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Gelen Çağrı"
          value={metrics.incomingCalls.toLocaleString()}
          icon={Phone}
        />
        <StatCard
          title="Bekleyen Randevu"
          value={metrics.pendingAppointments.toLocaleString()}
          icon={Calendar}
        />
        <StatCard
          title="Gelen Form"
          value={metrics.incomingFormCount.toLocaleString()}
          icon={FileText}
        />
        <StatCard
          title="Aktif Doktor"
          value={metrics.activeDoctors.toLocaleString()}
          icon={Stethoscope}
        />
        <StatCard
          title="Bekleyen Kişi (Listeler)"
          value={metrics.pendingListPersons.toLocaleString()}
          icon={ListChecks}
        />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sistem Durumu</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Çağrı Sistemi</h3>
              <p className="text-sm text-green-600">Aktif</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Doktor Kapasitesi</h3>
              <p className="text-sm text-blue-600">{metrics.activeDoctors} Aktif Doktor</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">İş Yükü</h3>
              <p className="text-sm text-purple-600">
                {metrics.pendingAppointments + metrics.pendingListPersons} Bekleyen İşlem
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;