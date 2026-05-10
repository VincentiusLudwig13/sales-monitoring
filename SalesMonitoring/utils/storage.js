export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000';
console.log('API_BASE_URL:', API_BASE_URL);
export const USERS_KEY = 'sales_users';

export const initDummyData = async () => {
};

export const loginUser = async (nik, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik, password })
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (e) {
    console.error('Login error:', e);
    return null;
  }
};

export const getStores = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stores`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error('Fetch stores error:', e);
    return [];
  }
};

export const getProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error('Fetch products error:', e);
    return [];
  }
};

export const getVisits = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/visits`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error('Fetch visits error:', e);
    return [];
  }
};

export const getVisitsByStore = async (storeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visits/store/${storeId}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error('Fetch store visits error:', e);
    return [];
  }
};

export const saveVisit = async (visit, photoUri) => {
  try {
    const form = new FormData();
    form.append('salesmanId', visit.salesmanId);
    form.append('storeId', visit.storeId);
    form.append('checkInTime', visit.checkInTime);
    form.append('checkOutTime', visit.checkOutTime);
    form.append('orderAmount', String(visit.orderAmount));
    form.append('returAmount', String(visit.returAmount));
    form.append('tagihanAmount', String(visit.tagihanAmount));

    if (visit.items) form.append('items', JSON.stringify(visit.items));
    if (visit.returns) form.append('returns', JSON.stringify(visit.returns));

    if (photoUri) {
      const filename = photoUri.split('/').pop();
      const ext = filename.split('.').pop();
      form.append('attachment', {
        uri: photoUri,
        name: filename,
        type: `image/${ext}`,
      });
    }

    const response = await fetch(`${API_BASE_URL}/visits`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      console.error('Failed to save visit to backend');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Save visit error:', e);
    return false;
  }
};

export const registerStore = async (name, lat, lon, photoUri, salesmanId) => {
  try {
    const form = new FormData();
    form.append('name', name);
    form.append('lat', String(lat));
    form.append('lon', String(lon));
    form.append('salesmanId', salesmanId ? String(salesmanId) : 'unknown');

    const filename = photoUri.split('/').pop();
    const ext = filename.split('.').pop();
    form.append('photo', {
      uri: photoUri,
      name: filename,
      type: `image/${ext}`,
    });

    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      console.error('Store registration failed', await response.text());
      return null;
    }
    const data = await response.json();
    return data.store;
  } catch (e) {
    console.error('Register store error:', e);
    return null;
  }
};

export const updateVisit = async (visitId, visitData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitData)
    });

    if (!response.ok) {
      console.error('Failed to update visit on backend');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Update visit error:', e);
    return false;
  }
};
