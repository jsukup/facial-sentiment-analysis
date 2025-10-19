import * as faceapi from "face-api.js";
import { logger } from "./logger";

// Global state to track model loading
let modelsLoadedPromise: Promise<void> | null = null;
let modelsLoaded = false;
let isInitialized = false;

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
      throw error;
    }
  })();

  return modelsLoadedPromise;
}

export function areFaceApiModelsLoaded(): boolean {
  return modelsLoaded && isInitialized;
}
