import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE } from '../config';

export const FRIENDLY_NETWORK = '😕 Something went wrong.\n\nPlease check your internet connection and try again.';
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function handle(res) {
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(data.message || (res.status >= 500 ? 'Server error. Please try again.' : 'Request failed.'), res.status);
  }
  return data;
}

async function request(method, path, { body, form } = {}) {
  const token = await AsyncStorage.getItem('token');
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(BASE + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
    return await handle(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(FRIENDLY_NETWORK, 0);
  }
}

/** Multipart upload with progress callback (0..1). */
export async function upload(method, path, form, onProgress) {
  const token = await AsyncStorage.getItem('token');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, BASE + path);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.message || 'Upload failed. Please try again.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('📵 Upload failed. Check your connection and try again.', 0));
    xhr.send(form);
  });
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, { body: body || {} }),
  put: (p, body) => request('PUT', p, { body }),
  del: (p) => request('DELETE', p),
  form: (method, p, form) => request(method, p, { form }),
};

/** Turn an expo-image-picker asset into a FormData file. */
export const fileFromAsset = (asset, fallbackName = 'upload') => {
  const uri = asset.uri;
  const ext = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
  const isVideo = asset.type === 'video' || ['mp4', 'mov', 'm4v'].includes(ext);
  return { uri, name: `${fallbackName}.${ext}`, type: isVideo ? `video/${ext === 'mov' ? 'quicktime' : 'mp4'}` : `image/${ext === 'jpg' ? 'jpeg' : ext}` };
};
