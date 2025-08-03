import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  X, 
  BarChart3, 
  Package, 
  Users, 
  CheckCircle, 
  FileText,
  Home,
  FileCheck
} from 'lucide-react';

const navigation = [
  { name: 'dashboard', href: '/', icon: Home },
  { name: 'productManagement', href: '/products', icon: Package },
  { name: 'clientManagement', href: '/clients', icon: Users },
  { name: 'informationValidation', href: '/validation', icon: CheckCircle },
  { name: 'djcManagement', href: '/djc', icon: FileText },
  { name: 'Generar DJC', href: '/djc-generator', icon: FileCheck },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40 md:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 flex z-40">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              </Transition.Child>
              
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <BarChart3 className="h-8 w-8 text-white" />
                  <span className="ml-2 text-white font-semibold text-lg">SGC-DJC</span>
                </div>
                
                <nav className="mt-5 px-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={`
                          group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors
                          ${isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }
                        `}
                      >
                        <item.icon
                          className={`
                            mr-4 flex-shrink-0 h-6 w-6 transition-colors
                            ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                          `}
                        />
                        {t(item.name)}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
          
          <div className="flex-shrink-0 w-14">
            {/* Force sidebar to shrink to fit close icon */}
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}