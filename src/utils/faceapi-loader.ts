import * as faceapi from "@vladmandic/face-api";
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { logger } from "./logger";

// Global state to track model loading
let modelsLoadedPromise: Promise<void> | null = null;
let modelsLoaded = false;
let isInitialized = false;
let backendsInitialized = false;

export async function loadFaceApiModels(): Promise<void> {
  // If models are already loaded, return immediately
  if (modelsLoaded && isInitialized) {
    return Promise.resolve();
  }

  // If loading is in progress, return the existing promise
  if (modelsLoadedPromise) {
    return modelsLoadedPromise;
  }

  // Start loading models
  modelsLoadedPromise = (async () => {
    try {
      // Initialize TensorFlow.js backends first
      if (!backendsInitialized) {
        logger.info("Initializing TensorFlow.js backends...", { component: "faceapi-loader" });
        
        // Import and set TensorFlow backends
        const tf = await import('@tensorflow/tfjs-core');
        
        // Try WebGL backend first (faster), fallback to CPU
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          logger.info("TensorFlow.js WebGL backend initialized", { component: "faceapi-loader" });
        } catch (webglError) {
          logger.warn("WebGL backend failed, falling back to CPU", webglError as Error, { component: "faceapi-loader" });
          await tf.setBackend('cpu');
          await tf.ready();
          logger.info("TensorFlow.js CPU backend initialized", { component: "faceapi-loader" });
        }
        
        backendsInitialized = true;
      }

      // Check if models are already loaded (e.g., from a previous hot reload)
      if (faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceExpressionNet.isLoaded) {
        modelsLoaded = true;
        isInitialized = true;
        logger.info("Face-api models already loaded", { component: "faceapi-loader" });
        return;
      }

      // Dynamic model loading to optimize bundle size
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      
      const loadPromises = [];
      
      // Load models only when needed
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        // Load tiny face detector first (smallest model)
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      }
      
      if (!faceapi.nets.faceExpressionNet.isLoaded) {
        // Load expression detection model second
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      }
      
      modelsLoaded = true;
      isInitialized = true;
      logger.info("Face-api models loaded successfully", { component: "faceapi-loader" });
    } catch (error) {
      logger.error("Error loading face-api models", error as Error, { component: "faceapi-loader" });
      modelsLoadedPromise = null; // Reset to allow retry
      backendsInitialized = false; // Reset backend state for retry
      throw error;
    }
  })();

  return modelsLoadedPromise;
}

export function areFaceApiModelsLoaded(): boolean {
  return modelsLoaded && isInitialized && backendsInitialized;
}

export async function checkTensorFlowBackend(): Promise<string> {
  try {
    const tf = await import('@tensorflow/tfjs-core');
    const backend = tf.getBackend();
    const ready = tf.engine().state.ready;
    return `Backend: ${backend}, Ready: ${ready}`;
  } catch (error) {
    return `Backend check failed: ${error.message}`;
  }
}
