const { getStore } = require('@netlify/blobs');

const setBuildStatus = async () => {
  try {
    const store = getStore('build_status_store');
    // Set the same key to the value 'ready'
    await store.set('current_status', 'ready');
    console.log('✅ Set BUILD_STATUS to ready in blob store');
  } catch (error) {
    console.error('Error setting build status:', error);
  }
};

setBuildStatus();