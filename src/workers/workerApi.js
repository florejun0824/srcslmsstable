// src/workers/workerApi.js
// Lazy-initializing Comlink wrapper for the data processor worker.
// Components import the `getWorker()` function instead of managing Worker instances directly.
import { wrap } from 'comlink';

let workerInstance = null;
let workerProxy = null;

/**
 * Returns a Comlink-wrapped proxy to the data processor worker.
 * Lazily creates the worker on first call.
 * The `?worker` suffix tells Vite to bundle this as a Web Worker.
 */
export function getWorker() {
  if (!workerProxy) {
    workerInstance = new Worker(
      new URL('./dataProcessor.worker.js', import.meta.url),
      { type: 'module' }
    );
    workerProxy = wrap(workerInstance);
  }
  return workerProxy;
}

/**
 * Terminates the worker. Call on logout or unmount if needed.
 */
export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerProxy = null;
  }
}
