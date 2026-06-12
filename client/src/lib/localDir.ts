// File System Access API — 로컬 폴더 핸들 저장/복원 (Chrome/Edge 전용).
// 사용자가 한 번 지정한 videoflow 폴더를 IndexedDB에 기억해 두고 재사용한다.
const DB_NAME = 'mf-local';
const STORE = 'handles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await (window as unknown as {
      showDirectoryPicker: (o: { mode: string }) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return null; // 사용자가 취소
  }
}

export async function saveDirHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** 저장된 핸들의 읽기/쓰기 권한 확인(필요 시 재요청). */
export async function ensureRWPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as unknown as {
    queryPermission: (o: { mode: string }) => Promise<string>;
    requestPermission: (o: { mode: string }) => Promise<string>;
  };
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
}

/** 핸들 하위에 상대경로(media/abc.jpg 등)로 파일 기록. 중간 폴더 자동 생성. */
export async function writeFileAt(
  root: FileSystemDirectoryHandle,
  relPath: string,
  data: Blob | string,
): Promise<void> {
  const parts = relPath.split('/').filter(Boolean);
  let dir = root;
  for (const seg of parts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(seg, { create: true });
  }
  const fh = await dir.getFileHandle(parts[parts.length - 1]!, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}
