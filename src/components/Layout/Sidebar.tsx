import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChartBar as BarChart3, Package, Users, CircleCheck as CheckCircle, FileText, Chrome as Home, FileCheck, Upload, Database } from 'lucide-react';

const navigation = [
  { name: 'dashboard', href: '/', icon: Home },
  { name: 'productManagement', href: '/products', icon: Package },
  { name: 'clientManagement', href: '/clients', icon: Users },
  { name: 'informationValidation', href: '/validation', icon: CheckCircle },
  { name: 'clientDataValidation', href: '/client-validation', icon: Upload },
  { name: 'dataUpload', href: '/data-upload', icon: Database },
  { name: 'djcManagement', href: '/djc', icon: FileText },
  { name: 'generateDJC', href: '/djc-generator', icon: FileCheck },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
          <BarChart3 className="h-8 w-8 text-white" />
          <span className="ml-2 text-white font-semibold text-lg">SGC-DJC</span>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 flex-shrink-0 h-6 w-6 transition-colors
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                    `}
                  />
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}