import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { isFirebaseConfigured, storage } from '../lib/firebase'

export interface UploadTaskProofParams {
  familyId: string
  childId: string
  taskId: string
  file: File
}

export async function uploadTaskProof({
  familyId,
  childId,
  taskId,
  file,
}: UploadTaskProofParams): Promise<string> {
  if (!isFirebaseConfigured() || !storage) {
    throw new Error('Firebase Storage não configurado.')
  }

  const safeFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
  const path = `families/${familyId}/children/${childId}/tasks/${taskId}/${safeFileName}`
  const fileRef = ref(storage, path)

  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
