import React from 'react';
import { LightBulbIcon } from '@heroicons/react/24/solid';

export default function TipCallout({ children }) {
  return (
    <div className="my-4 flex items-start gap-3 rounded-md border-l-4 border-green-500 bg-green-50 p-4">
      <LightBulbIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
      <div className="prose prose-sm max-w-none text-green-800">{children}</div>
    </div>
  );
}