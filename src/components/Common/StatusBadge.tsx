interface StatusBadgeProps {
  status: string;
  type?: 'djc' | 'certificate' | 'sent' | 'general';
}

export function StatusBadge({ status, type = 'general' }: StatusBadgeProps) {
  const getStatusColor = () => {
    const normalizedStatus = status.toLowerCase();
    
    if (type === 'djc') {
      switch (normalizedStatus) {
        case 'no generada':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'generada pendiente de firma':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'firmada':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    
    if (type === 'certificate') {
      switch (normalizedStatus) {
        case 'pendiente subida':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'subido':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    
    if (type === 'sent') {
      switch (normalizedStatus) {
        case 'pendiente':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'enviado':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    
    // General status colors
    switch (normalizedStatus) {
      case 'activo':
      case 'active':
      case 'vigente':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'vencido':
      case 'expired':
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendiente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
      {status}
    </span>
  );
}