import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/solid';

export default function InfoCallout({ children }) {
  return (
    <div className="my-4 flex items-start gap-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-4">
      <InformationCircleIcon className="h-6 w-6 flex-shrink-0 text-blue-600" />
      <div className="prose prose-sm max-w-none text-blue-800">{children}</div>
    </div>
  );
}