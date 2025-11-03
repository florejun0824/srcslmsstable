import React from 'react';
// This is the correct import from the correct package
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';
import { X } from 'lucide-react'; // Using an icon from your package.json

/**
 * A responsive modal that displays the Ready Player Me avatar creator.
 * @param {string} subdomain - The RPM subdomain to load (e.g., 'srcs-lms').
 * @param {function} onAvatarExported - Callback function when an avatar URL is generated.
 * @param {function} onClose - Callback function to close the modal.
 */
export default function AvatarCreatorModal({ subdomain, onAvatarExported, onClose }) {
  
  /**
   * This handler is called by the RPM iframe when the user saves their avatar.
   * It receives an event with the .glb URL.
   */
  const handleOnAvatarExported = (event) => {
    console.log(`New Avatar URL: ${event.data.url}`);
    onAvatarExported(event.data.url); // Send the URL back to the profile page
  };

  return (
    // This is the modal overlay: fixed position, covers the screen, high z-index
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-75 flex items-center justify-center p-4">
      
      {/* This is the modal content container */}
      {/* It's responsive: full width/height on mobile, constrained on desktop */}
      <div className="relative w-full h-full md:w-4/5 md:h-5/6 lg:w-3/5" 
           style={{ maxWidth: '800px', maxHeight: '700px' }}>
        
        {/* This is the correct component name: <AvatarCreator> */}
        <AvatarCreator
          subdomain={subdomain} // Here is where we pass your dynamic subdomain
          onAvatarExported={handleOnAvatarExported}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none', 
            borderRadius: '16px' // Matches your app's rounded style
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-900 bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}