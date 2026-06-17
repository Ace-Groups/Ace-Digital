import * as SecureStore from 'expo-secure-store';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';

const TOKEN_KEY = 'ace_auth_token';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://ace-digital-api.onrender.com';

// Configure the shared API client for mobile
export function initApiClient() {
  setBaseUrl(API_BASE);
  setAuthTokenGetter(() => getToken());
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function getApiBase() {
  return API_BASE;
}
