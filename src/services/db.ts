import { PatientCase, MedicalImage } from '../types/medical';

const DB_NAME = 'NeuroER_CaseNotes_DB';
const DB_VERSION = 1;
const STORE_CASES = 'cases';
const STORE_IMAGES = 'images';
const STORE_SETTINGS = 'settings';

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cases Store
      if (!db.objectStoreNames.contains(STORE_CASES)) {
        db.createObjectStore(STORE_CASES, { keyPath: 'id' });
      }

      // Images Store
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imageStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        imageStore.createIndex('by_caseId', 'caseId', { unique: false });
      }

      // Settings / Meta Store
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ---------------- Cases Operations ----------------

export async function getAllCases(): Promise<PatientCase[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CASES, 'readonly');
    const store = tx.objectStore(STORE_CASES);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getCaseById(id: string): Promise<PatientCase | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CASES, 'readonly');
    const store = tx.objectStore(STORE_CASES);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveCase(patientCase: PatientCase): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CASES, 'readwrite');
    const store = tx.objectStore(STORE_CASES);
    const request = store.put(patientCase);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteCase(caseId: string): Promise<void> {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Delete associated images first
      const txImg = db.transaction(STORE_IMAGES, 'readwrite');
      const imgStore = txImg.objectStore(STORE_IMAGES);
      const index = imgStore.index('by_caseId');
      const req = index.getAllKeys(caseId);

      req.onsuccess = () => {
        const keys = req.result;
        keys.forEach((key) => {
          imgStore.delete(key);
        });
      };

      // 2. Delete the case itself
      const tx = db.transaction(STORE_CASES, 'readwrite');
      const store = tx.objectStore(STORE_CASES);
      const delReq = store.delete(caseId);

      delReq.onsuccess = () => {
        resolve();
      };
      delReq.onerror = () => {
        reject(delReq.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------- Images Operations ----------------

export async function getImagesForCase(caseId: string): Promise<MedicalImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const index = store.index('by_caseId');
    const request = index.getAll(caseId);

    request.onsuccess = () => {
      // Sort chronologically by study date or upload date
      const list = (request.result || []) as MedicalImage[];
      list.sort((a, b) => new Date(b.studyDate || b.uploadedAt).getTime() - new Date(a.studyDate || a.uploadedAt).getTime());
      resolve(list);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveImage(image: MedicalImage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    const store = tx.objectStore(STORE_IMAGES);
    const request = store.put(image);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteImage(imageId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    const store = tx.objectStore(STORE_IMAGES);
    const request = store.delete(imageId);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ---------------- Backup & Export ----------------

export async function exportAllDataJSON(): Promise<string> {
  const cases = await getAllCases();
  const db = await openDB();

  const images: MedicalImage[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const payload = {
    app: 'NeuroER_CaseNotes',
    version: '1.0',
    exportTimestamp: new Date().toISOString(),
    casesCount: cases.length,
    imagesCount: images.length,
    cases,
    images,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importBackupJSON(jsonString: string): Promise<{ success: boolean; casesCount: number; imagesCount: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.cases)) {
      return { success: false, casesCount: 0, imagesCount: 0, error: 'Invalid file format. Missing "cases" array.' };
    }

    const db = await openDB();

    // Import cases
    const txCases = db.transaction(STORE_CASES, 'readwrite');
    const casesStore = txCases.objectStore(STORE_CASES);
    for (const c of parsed.cases) {
      if (c && c.id) {
        casesStore.put(c);
      }
    }

    // Import images if available
    let imgCount = 0;
    if (Array.isArray(parsed.images) && parsed.images.length > 0) {
      const txImages = db.transaction(STORE_IMAGES, 'readwrite');
      const imgStore = txImages.objectStore(STORE_IMAGES);
      for (const img of parsed.images) {
        if (img && img.id && img.caseId) {
          imgStore.put(img);
          imgCount++;
        }
      }
    }

    return {
      success: true,
      casesCount: parsed.cases.length,
      imagesCount: imgCount,
    };
  } catch (err: any) {
    return { success: false, casesCount: 0, imagesCount: 0, error: err?.message || 'JSON parsing error' };
  }
}

// ---------------- Storage Quota & Stats ----------------

export async function getStorageStats(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  casesCount: number;
  imagesCount: number;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch (e) {
      console.warn('Storage estimate error:', e);
    }
  }

  const cases = await getAllCases();
  const db = await openDB();

  const imagesCount: number = await new Promise((resolve) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const store = tx.objectStore(STORE_IMAGES);
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => resolve(0);
  });

  return {
    usageBytes,
    quotaBytes,
    casesCount: cases.length,
    imagesCount,
  };
}
