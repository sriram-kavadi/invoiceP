import React from 'react';

export default function Badge({ children, status, variant, className = '' }) {
  const getVariant = () => {
    if (variant) return variant;

    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return 'gray';
      case 'ISSUED':
        return 'blue';
      case 'PAID':
        return 'green';
      case 'PARTIALLY_PAID':
        return 'yellow';
      case 'OVERDUE':
        return 'red';
      case 'CANCELLED':
        return 'neutral';
      case 'ACTIVE':
        return 'green';
      case 'INACTIVE':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const variants = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-100 text-gray-500 line-through border-gray-200',
  };

  const activeVariant = variants[getVariant()] || variants.gray;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${activeVariant} ${className}`}
    >
      {children || status}
    </span>
  );
}

