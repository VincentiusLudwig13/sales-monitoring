export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000';
export const SERVER_URL = API_BASE_URL.replace('/api', '');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('SERVER_URL:', SERVER_URL);
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

export const saveVisit = async (visit, attachmentUris = []) => {
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

    if (attachmentUris && attachmentUris.length > 0) {
      attachmentUris.forEach((uri, index) => {
        const filename = uri.split('/').pop();
        const ext = filename.split('.').pop();
        form.append('attachments', {
          uri: uri,
          name: filename,
          type: `image/${ext}`,
        });
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

export const registerStore = async (name, lat, lon, photoUris = [], salesmanId) => {
  try {
    const form = new FormData();
    form.append('name', name);
    form.append('lat', String(lat));
    form.append('lon', String(lon));
    form.append('salesmanId', salesmanId ? String(salesmanId) : 'unknown');

    const photosArray = Array.isArray(photoUris) ? photoUris : (photoUris ? [photoUris] : []);

    if (photosArray.length > 0) {
      photosArray.forEach((uri) => {
        const filename = uri.split('/').pop();
        const ext = filename.split('.').pop();
        form.append('photos', {
          uri: uri,
          name: filename,
          type: `image/${ext}`,
        });
      });
    }

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

export const updateStore = async (storeId, storeData, newPhotoUris = []) => {
  try {
    const form = new FormData();
    if (storeData.name) form.append('name', storeData.name);
    if (storeData.lat) form.append('lat', String(storeData.lat));
    if (storeData.lon) form.append('lon', String(storeData.lon));
    if (storeData.salesmanId) form.append('salesmanId', storeData.salesmanId);

    if (newPhotoUris && newPhotoUris.length > 0) {
      newPhotoUris.forEach((uri) => {
        const filename = uri.split('/').pop();
        const ext = filename.split('.').pop();
        form.append('new_photos', {
          uri: uri,
          name: filename,
          type: `image/${ext}`,
        });
      });
    }

    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      method: 'PUT',
      body: form,
    });

    if (!response.ok) {
      console.error('Update store failed');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Update store error:', e);
    return false;
  }
};

export const updateVisit = async (visitId, visitData, newAttachments = []) => {
  try {
    const form = new FormData();
    if (visitData.orderAmount !== undefined) form.append('orderAmount', String(visitData.orderAmount));
    if (visitData.returAmount !== undefined) form.append('returAmount', String(visitData.returAmount));
    if (visitData.tagihanAmount !== undefined) form.append('tagihanAmount', String(visitData.tagihanAmount));
    if (visitData.paymentStatus !== undefined) form.append('paymentStatus', visitData.paymentStatus);
    if (visitData.items) form.append('items', JSON.stringify(visitData.items));
    if (visitData.returns) form.append('returns', JSON.stringify(visitData.returns));

    if (newAttachments && newAttachments.length > 0) {
      newAttachments.forEach((uri) => {
        const filename = uri.split('/').pop();
        const ext = filename.split('.').pop();
        form.append('new_attachments', {
          uri: uri,
          name: filename,
          type: `image/${ext}`,
        });
      });
    }

    const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
      method: 'PUT',
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update visit on backend:', errorText);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Update visit error:', e);
    return false;
  }
};

export const deleteAttachment = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attachments/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (e) {
    console.error('Delete attachment error:', e);
    return false;
  }
};
