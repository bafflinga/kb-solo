import type { LanguageContent, LessonContent } from '../domain/lessons/types'
import type { ContentLanguage } from '../domain/types'

export interface StoredLanguage {
  language: ContentLanguage
  document: LanguageContent
  hash: string
  updatedAt: number
}

export interface StoredOverride {
  id: string
  document: LessonContent
  updatedAt: number
}

export interface LessonsDb {
  getLanguage(language: ContentLanguage): Promise<StoredLanguage | undefined>
  allLanguages(): Promise<StoredLanguage[]>
  putLanguage(record: StoredLanguage): Promise<void>
  getOverride(id: string): Promise<StoredOverride | undefined>
  allOverrides(): Promise<StoredOverride[]>
  putOverride(record: StoredOverride): Promise<void>
  removeOverride(id: string): Promise<void>
}

const DB_NAME = 'kb-solo-lessons'
const DB_VERSION = 1
const LANGUAGE_STORE = 'languages'
const OVERRIDE_STORE = 'overrides'

function createMemoryDb(): LessonsDb {
  const languages = new Map<string, StoredLanguage>()
  const overrides = new Map<string, StoredOverride>()
  return {
    async getLanguage(language) {
      return languages.get(language)
    },
    async allLanguages() {
      return [...languages.values()]
    },
    async putLanguage(record) {
      languages.set(record.language, record)
    },
    async getOverride(id) {
      return overrides.get(id)
    },
    async allOverrides() {
      return [...overrides.values()]
    },
    async putOverride(record) {
      overrides.set(record.id, record)
    },
    async removeOverride(id) {
      overrides.delete(id)
    },
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LANGUAGE_STORE)) {
        db.createObjectStore(LANGUAGE_STORE, { keyPath: 'language' })
      }
      if (!db.objectStoreNames.contains(OVERRIDE_STORE)) {
        db.createObjectStore(OVERRIDE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createIdbDb(): LessonsDb {
  let database: Promise<IDBDatabase> | undefined

  function db(): Promise<IDBDatabase> {
    if (!database) {
      database = openDatabase().catch((error: unknown) => {
        database = undefined
        throw error
      })
    }
    return database
  }

  function request<T>(
    storeName: string,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return db().then(
      (connection) =>
        new Promise<T>((resolve, reject) => {
          const transaction = connection.transaction(storeName, 'readonly')
          const pending = run(transaction.objectStore(storeName))
          pending.onsuccess = () => resolve(pending.result)
          pending.onerror = () => reject(pending.error)
          transaction.onerror = () => reject(transaction.error)
        }),
    )
  }

  function write(
    storeName: string,
    run: (store: IDBObjectStore) => void,
  ): Promise<void> {
    return db().then(
      (connection) =>
        new Promise<void>((resolve, reject) => {
          const transaction = connection.transaction(storeName, 'readwrite')
          run(transaction.objectStore(storeName))
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
        }),
    )
  }

  return {
    getLanguage(language) {
      return request<StoredLanguage | undefined>(LANGUAGE_STORE, (store) =>
        store.get(language),
      )
    },
    allLanguages() {
      return request<StoredLanguage[]>(LANGUAGE_STORE, (store) =>
        store.getAll(),
      )
    },
    putLanguage(record) {
      return write(LANGUAGE_STORE, (store) => {
        store.put(record)
      })
    },
    getOverride(id) {
      return request<StoredOverride | undefined>(OVERRIDE_STORE, (store) =>
        store.get(id),
      )
    },
    allOverrides() {
      return request<StoredOverride[]>(OVERRIDE_STORE, (store) =>
        store.getAll(),
      )
    },
    putOverride(record) {
      return write(OVERRIDE_STORE, (store) => {
        store.put(record)
      })
    },
    removeOverride(id) {
      return write(OVERRIDE_STORE, (store) => {
        store.delete(id)
      })
    },
  }
}

export const lessonsDb: LessonsDb =
  typeof indexedDB === 'undefined' ? createMemoryDb() : createIdbDb()
