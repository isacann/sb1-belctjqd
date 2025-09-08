import React, { useState } from 'react';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import LoginPage from './components/LoginPage';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState('appointments');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [gelenCallNotificationCount, setGelenCallNotificationCount] = useState(0);
  const [formCallNotificationCount, setFormCallNotificationCount] = useState(0);
  const [listeCallNotificationCount, setListeCallNotificationCount] = useState(0);
  const [lastSeenGelenCallsTimestamp, setLastSeenGelenCallsTimestamp] = useState<string>('');
  const [lastSeenFormCallsTimestamp, setLastSeenFormCallsTimestamp] = useState<string>('');
  const [lastSeenListeCallsTimestamp, setLastSeenListeCallsTimestamp] = useState<string>('');

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null);
  const [doktorId, setDoktorId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState<{ad: string, soyad: string, email?: string} | null>(null);

  // Authentication and session management
  useEffect(() => {
    const checkSession = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const userId = session.user.id;
        let role: 'admin' | 'doctor' | null = null;
        let dId: string | null = null;

        // Check admin table first
        const { data: adminData } = await supabase
          .from('admin')
          .select('id')
          .eq('id', userId)
          .single();

        if (adminData) {
          role = 'admin';
        } else {
          // If not admin, check doktor_giris table
          const { data: doktorGirisData } = await supabase
            .from('doktor_giris')
            .select('id, doktor_id')
            .eq('id', userId)
            .single();

          if (doktorGirisData) {
            role = 'doctor';
            dId = doktorGirisData.doktor_id;
            
            // Fetch doctor information
            const { data: doctorData } = await supabase
              .from('doktor')
              .select('ad, soyad, email')
              .eq('id', doktorGirisData.doktor_id)
              .single();
            
            if (doctorData) {
              setDoctorInfo(doctorData);
            }
          }
        }

        if (role) {
          setIsLoggedIn(true);
          setUserRole(role);
          setDoktorId(dId);
          // Set default page based on role
          if (role === 'doctor') {
            setActiveMenuItem('appointments');
          } else if (role === 'admin') {
            setActiveMenuItem('dashboard');
          }
        } else {
          // If user exists in auth.users but not in admin/doktor_giris, sign out
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setUserRole(null);
          setDoktorId(null);
          setDoctorInfo(null);
        }
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setDoktorId(null);
        setDoctorInfo(null);
      }
      setAuthLoading(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkSession();
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setDoktorId(null);
        setAuthLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setGelenCallNotificationCount(0);
      setFormCallNotificationCount(0);
      setListeCallNotificationCount(0);
      return;
    }

    // Load last seen timestamps from localStorage
    const savedGelenCallsTimestamp = localStorage.getItem('lastSeenGelenCallsTimestamp');
    const savedFormCallsTimestamp = localStorage.getItem('lastSeenFormCallsTimestamp');
    const savedListeCallsTimestamp = localStorage.getItem('lastSeenListeCallsTimestamp');
    
    const gelenCallsTimestamp = savedGelenCallsTimestamp || new Date(0).toISOString();
    const formCallsTimestamp = savedFormCallsTimestamp || new Date(0).toISOString();
    const listeCallsTimestamp = savedListeCallsTimestamp || new Date(0).toISOString();
    
    setLastSeenGelenCallsTimestamp(gelenCallsTimestamp);
    setLastSeenFormCallsTimestamp(formCallsTimestamp);
    setLastSeenListeCallsTimestamp(listeCallsTimestamp);
    
    // Fetch initial notification counts
    fetchNotificationCounts(gelenCallsTimestamp, formCallsTimestamp, listeCallsTimestamp);
    
    // Set up interval to check for new records every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationCounts(
        localStorage.getItem('lastSeenGelenCallsTimestamp') || new Date(0).toISOString(),
        localStorage.getItem('lastSeenFormCallsTimestamp') || new Date(0).toISOString(),
        localStorage.getItem('lastSeenListeCallsTimestamp') || new Date(0).toISOString()
      );
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const fetchNotificationCounts = async (gelenCallsTimestamp: string, formCallsTimestamp: string, listeCallsTimestamp: string) => {
    try {
      // Check if Supabase is properly configured by checking environment variables
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured - environment variables missing');
        setGelenCallNotificationCount(0);
        setFormCallNotificationCount(0);
        setListeCallNotificationCount(0);
        return;
      }

      // Count new gelen calls
      const { count: gelenCallCount, error: gelenCallError } = await supabase
        .from('arama_kayit')
        .select('*', { count: 'exact', head: true })
        .eq('arama_tipi', 'gelen')
        .gt('kayit_tarihi', gelenCallsTimestamp);

      if (gelenCallError) {
        console.warn('Error fetching gelen calls:', gelenCallError);
        setGelenCallNotificationCount(0);
        setFormCallNotificationCount(0);
        setListeCallNotificationCount(0);
        return;
      }

      // Count new form calls
      const { count: formCallCount, error: formCallError } = await supabase
        .from('arama_kayit')
        .select('*', { count: 'exact', head: true })
        .eq('arama_tipi', 'form')
        .gt('kayit_tarihi', formCallsTimestamp);

      if (formCallError) {
        console.warn('Error fetching form calls:', formCallError);
        setGelenCallNotificationCount(0);
        setFormCallNotificationCount(0);
        setListeCallNotificationCount(0);
        return;
      }

      // Count new liste calls
      const { count: listeCallCount, error: listeCallError } = await supabase
        .from('arama_kayit')
        .select('*', { count: 'exact', head: true })
        .eq('arama_tipi', 'liste')
        .gt('kayit_tarihi', listeCallsTimestamp);

      if (listeCallError) {
        console.warn('Error fetching liste calls:', listeCallError);
        setGelenCallNotificationCount(0);
        setFormCallNotificationCount(0);
        setListeCallNotificationCount(0);
        return;
      }

      setGelenCallNotificationCount(gelenCallCount || 0);
      setFormCallNotificationCount(formCallCount || 0);
      setListeCallNotificationCount(listeCallCount || 0);
    } catch (error) {
      console.warn('Could not fetch notification counts - Supabase may not be configured:', error);
      // Set counts to 0 when there's a connection error
      setGelenCallNotificationCount(0);
      setFormCallNotificationCount(0);
      setListeCallNotificationCount(0);
    }
  };

  const handleClearCallNotifications = (callType: 'gelen' | 'form' | 'liste') => {
    const currentTimestamp = new Date().toISOString();
    
    switch (callType) {
      case 'gelen':
        setLastSeenGelenCallsTimestamp(currentTimestamp);
        localStorage.setItem('lastSeenGelenCallsTimestamp', currentTimestamp);
        setGelenCallNotificationCount(0);
        break;
      case 'form':
        setLastSeenFormCallsTimestamp(currentTimestamp);
        localStorage.setItem('lastSeenFormCallsTimestamp', currentTimestamp);
        setFormCallNotificationCount(0);
        break;
      case 'liste':
        setLastSeenListeCallsTimestamp(currentTimestamp);
        localStorage.setItem('lastSeenListeCallsTimestamp', currentTimestamp);
        setListeCallNotificationCount(0);
        break;
    }
  };

  const handleMenuItemClick = (menuId: string) => {
    // Handle notification clearing
    if (menuId === 'calls') {
      const currentTimestamp = new Date().toISOString();
      setLastSeenGelenCallsTimestamp(currentTimestamp);
      setLastSeenFormCallsTimestamp(currentTimestamp);
      setLastSeenListeCallsTimestamp(currentTimestamp);
    }
    
    setActiveMenuItem(menuId);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setDoktorId(null);
    setDoctorInfo(null);
    // Clear notification counts
    setGelenCallNotificationCount(0);
    setFormCallNotificationCount(0);
    setListeCallNotificationCount(0);
  };
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const totalCallNotificationCount = gelenCallNotificationCount + formCallNotificationCount + listeCallNotificationCount;

  const handleLoginSuccess = (role: 'admin' | 'doctor', dId?: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setDoktorId(dId || null);
    
    // Set default page based on role
    if (role === 'admin') {
      setActiveMenuItem('dashboard');
    } else if (role === 'doctor') {
      setActiveMenuItem('appointments');
    }
    
    // If doctor login, fetch doctor info immediately
    if (role === 'doctor' && dId) {
      fetchDoctorInfo(dId);
    } else {
      setDoctorInfo(null);
    }
    
    setAuthLoading(false);
  };

  const fetchDoctorInfo = async (doctorId: string) => {
    try {
      const { data: doctorData, error } = await supabase
        .from('doktor')
        .select('ad, soyad, email')
        .eq('id', doctorId)
        .single();
      
      if (!error && doctorData) {
        setDoctorInfo(doctorData);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-700">Yükleniyor...</span>
      </div>
    );
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main application if logged in
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeMenuItem={activeMenuItem}
        onMenuItemClick={handleMenuItemClick}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        callNotificationCount={totalCallNotificationCount}
        userRole={userRole}
        onLogout={handleLogout}
        doctorInfo={doctorInfo}
      />
      <MainContent 
        activeMenuItem={activeMenuItem} 
        onMenuItemClick={handleMenuItemClick}
        gelenCallNotificationCount={gelenCallNotificationCount}
        formCallNotificationCount={formCallNotificationCount}
        listeCallNotificationCount={listeCallNotificationCount}
        onClearCallNotifications={handleClearCallNotifications}
        userRole={userRole}
        doktorId={doktorId}
      />
    </div>
  );
}

export default App;