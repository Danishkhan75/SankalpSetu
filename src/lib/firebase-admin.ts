import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  initializeApp(projectId ? { projectId } : {});
}

export const adminAuth = getAuth();
