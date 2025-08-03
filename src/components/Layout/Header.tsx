import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, Globe, Menu } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export function Header({ onMobileMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden -ml-2 mr-2 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={onMobileMenuClick}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Gestión de Certificados y DJC
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-100"
            >
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>

              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}