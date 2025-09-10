const { getStore } = require('@netlify/blobs');

const setBuildStatus = async () => {
  try {
    // 'build_status_store' matches the name in netlify.toml
    const store = getStore('build_status_store'); 
    // Set a key named 'current_status' to the value 'building'
    await store.set('current_status', 'building');
    console.log('✅ Set BUILD_STATUS to building in blob store');
  } catch (error) {
    console.error('Error setting build status:', error);
  }
};

setBuildStatus();