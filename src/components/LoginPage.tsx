import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: 'admin' | 'doctor', doktorId?: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Seçilen role göre kullanıcının yetkisini kontrol et
      let userRole: 'admin' | 'doctor' | null = null;
      let doktorId: string | undefined;
      let userId: string | undefined;

      if (selectedRole === 'admin') {
        // Admin seçildiyse admin tablosunu kullanıcı adı ile kontrol et
        const { data: adminDataArray, error: adminError } = await supabase
          .from('admin')
          .select('id, kullanici_adi, sifre')
          .eq('kullanici_adi', username)
          .eq('sifre', password)
          .limit(1);

        if (adminError) {
          console.error('Admin kontrolünde hata:', adminError);
          throw new Error('Giriş kontrolü yapılırken bir hata oluştu.');
        }

        if (adminDataArray && adminDataArray.length > 0) {
          const adminData = adminDataArray[0];
          userRole = 'admin';
          userId = adminData.id;
        } else {
          throw new Error('Kullanıcı adı veya parola hatalı.');
        }
      } else {
        // Doktor seçildiyse doktor_giris tablosunu kullanıcı adı ile kontrol et
        const { data: doktorGirisDataArray, error: doktorGirisError } = await supabase
          .from('doktor_giris')
          .select('id, doktor_id, kullanici_adi, sifre')
          .eq('kullanici_adi', username)
          .eq('sifre', password)
          .limit(1);

        if (doktorGirisError) {
          console.error('Doktor girişi kontrolünde hata:', doktorGirisError);
          throw new Error('Giriş kontrolü yapılırken bir hata oluştu.');
        }

        if (doktorGirisDataArray && doktorGirisDataArray.length > 0) {
          const doktorGirisData = doktorGirisDataArray[0];
          userRole = 'doctor';
          doktorId = doktorGirisData.doktor_id;
          userId = doktorGirisData.id;
        } else {
          throw new Error('Kullanıcı adı veya parola hatalı.');
        }
      }

      if (!userRole) {
        throw new Error('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }

      // 2. Başarılı giriş ve rolü üst bileşene bildir
      onLoginSuccess(userRole, doktorId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
      console.error('Giriş hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
          <LogIn className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Yönetim Paneli Girişi</h2>

        {/* Rol Seçimi */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Giriş Türü
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all ${
                selectedRole === 'admin'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold">👨‍💼</div>
                <div className="text-sm font-medium">Yönetici</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('doctor')}
              className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all ${
                selectedRole === 'doctor'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold">👨‍⚕️</div>
                <div className="text-sm font-medium">Doktor</div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="kullaniciadi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Parola
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;