import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { Family } from '../types'

const CREATE_FAMILY_TIMEOUT_MS = 8000

type FirestoreLikeError = Error & {
  code?: string
}

function normalizeCreateFamilyError(error: unknown): Error {
  const firestoreError = error as FirestoreLikeError
  const errorCode = firestoreError?.code ?? ''
  const errorMessage = firestoreError?.message ?? ''

  if (
    errorCode === 'firestore/offline' ||
    errorCode === 'firestore/unavailable' ||
    errorCode === 'unavailable' ||
    errorCode === 'create-family-timeout' ||
    errorMessage.toLowerCase().includes('offline')
  ) {
    return new Error(
      'Nao foi possivel criar a familia porque o Firestore esta offline ou indisponivel.',
    )
  }

  if (errorCode === 'firestore/permission-denied' || errorCode === 'permission-denied') {
    return new Error('Sem permissao para criar a familia no Firestore.')
  }

  return new Error('Falha ao criar a familia no Firestore.')
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const timeoutError = new Error(
        `createFamily excedeu ${timeoutMs}ms aguardando o Firestore.`,
      ) as FirestoreLikeError
      timeoutError.code = 'create-family-timeout'
      reject(timeoutError)
    }, timeoutMs)

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

export async function getFamily(familyId: string): Promise<Family | null> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }
  const snap = await getDoc(doc(db, 'families', familyId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Family
}

export async function createFamily(family: Family): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }

  const startedAt = Date.now()
  const familyRef = doc(db, 'families', family.id)

  console.log('[FAMILIES] createFamily:before-setDoc', {
    familyId: family.id,
    familyName: family.familyName,
    parentIds: family.parentIds,
    hasDb: Boolean(db),
    timeoutMs: CREATE_FAMILY_TIMEOUT_MS,
  })

  try {
    await withTimeout(setDoc(familyRef, family), CREATE_FAMILY_TIMEOUT_MS)

    console.log('[FAMILIES] createFamily:after-setDoc', {
      familyId: family.id,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const firestoreError = error as FirestoreLikeError

    console.error('[FAMILIES] createFamily:catch', {
      familyId: family.id,
      durationMs: Date.now() - startedAt,
      code: firestoreError?.code ?? null,
      message: firestoreError?.message ?? String(error),
    })

    throw normalizeCreateFamilyError(error)
  } finally {
    console.log('[FAMILIES] createFamily:finally', {
      familyId: family.id,
      durationMs: Date.now() - startedAt,
    })
  }
}

export async function addChildToFamily(familyId: string, childId: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase nao configurado.')
  }
  await updateDoc(doc(db, 'families', familyId), {
    childrenIds: arrayUnion(childId),
  })
}
