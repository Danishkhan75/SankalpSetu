import { db, postgresConfigured } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface UserRecord {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  category?: string;
  provider?: string;
  createdAt: Date;
}

const userMetaMap = new Map<
  string,
  {
    category: string;
    provider: string;
  }
>();

userMetaMap.set('khandanish0503@gmail.com', {
  category: 'All Categories',
  provider: 'email_jwt',
});
userMetaMap.set('rehan.donator@graminseva.in', {
  category: 'Freelancer & Startup',
  provider: 'google',
});
userMetaMap.set('rameshwar.village@graminseva.in', {
  category: 'Village & Rural',
  provider: 'email_jwt',
});

const deletedUserEmails = new Set<string>();

export const fallbackUsersStore: UserRecord[] = [
  {
    id: 1,
    uid: 'demo-admin-uid',
    email: 'khandanish0503@gmail.com',
    name: 'Danish Khan',
    role: 'admin',
    category: 'All Categories',
    provider: 'email_jwt',
    createdAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: 2,
    uid: 'donator-fundraiser-uid',
    email: 'rehan.donator@graminseva.in',
    name: 'Rehan Siddiqui',
    role: 'donor',
    category: 'Freelancer & Startup',
    provider: 'google',
    createdAt: new Date(Date.now() - 86400000 * 20),
  },
  {
    id: 3,
    uid: 'village-beneficiary-uid',
    email: 'rameshwar.village@graminseva.in',
    name: 'Rameshwar Patil',
    role: 'user',
    category: 'Village & Rural',
    provider: 'email_jwt',
    createdAt: new Date(Date.now() - 86400000 * 15),
  },
];

let dbSocketAvailable: boolean | null = postgresConfigured ? null : false;

function attachMeta(user: UserRecord): UserRecord {
  const key = (user.email || '').toLowerCase();
  const meta = userMetaMap.get(key);
  return {
    ...user,
    category: meta?.category || user.category || (user.role === 'admin' ? 'All Categories' : 'Personal & Family'),
    provider: meta?.provider || user.provider || 'email_jwt',
  };
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
  role?: string,
  category?: string,
  provider?: string
): Promise<UserRecord> {
  const cleanEmail = (email || 'member@sankalpsetu.org').trim().toLowerCase();
  const safeName = name || cleanEmail.split('@')[0] || 'Platform Member';
  const safeRole = cleanEmail === 'khandanish0503@gmail.com' ? 'admin' : role || 'donor';
  const existingMeta = userMetaMap.get(cleanEmail);
  const safeCategory =
    category ||
    existingMeta?.category ||
    (safeRole === 'admin' ? 'All Categories' : 'Freelancer & Startup');
  const safeProvider = provider || existingMeta?.provider || 'email_jwt';

  userMetaMap.set(cleanEmail, {
    category: safeCategory,
    provider: safeProvider,
  });
  deletedUserEmails.delete(cleanEmail);

  let dbRecord: UserRecord | null = null;

  if (dbSocketAvailable !== false) {
    try {
      // First check if user with this email already exists in PostgreSQL
      const byEmail = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (byEmail.length > 0) {
        const updated = await db
          .update(users)
          .set({
            name: safeName,
            role: safeRole,
          })
          .where(eq(users.email, cleanEmail))
          .returning();
        const rec = updated[0] || byEmail[0];
        dbRecord = attachMeta({
          ...rec,
          createdAt: rec.createdAt || new Date(),
        });
      } else {
        const inserted = await db
          .insert(users)
          .values({
            uid,
            email: cleanEmail,
            name: safeName,
            role: safeRole,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email: cleanEmail,
              name: safeName,
              role: safeRole,
            },
          })
          .returning();
        if (inserted[0]) {
          dbRecord = attachMeta({
            ...inserted[0],
            createdAt: inserted[0].createdAt || new Date(),
          });
        }
      }
      dbSocketAvailable = true;
    } catch {
      // Fallback to in-memory sync
    }
  }

  let existing = fallbackUsersStore.find(
    (u) => u.email.toLowerCase() === cleanEmail || u.uid === uid
  );
  if (existing) {
    existing.email = cleanEmail;
    existing.name = safeName;
    existing.role = safeRole;
    existing.category = safeCategory;
    existing.provider = safeProvider;
    return dbRecord || attachMeta(existing);
  }

  const created: UserRecord = {
    id:
      dbRecord?.id ||
      (fallbackUsersStore.length
        ? Math.max(...fallbackUsersStore.map((u) => Number(u.id) || 0)) + 1
        : 4),
    uid: dbRecord?.uid || uid,
    email: cleanEmail,
    name: safeName,
    role: safeRole,
    category: safeCategory,
    provider: safeProvider,
    createdAt: dbRecord?.createdAt || new Date(),
  };
  fallbackUsersStore.push(created);
  return dbRecord || attachMeta(created);
}

export async function getUserByUid(uid: string): Promise<UserRecord | null> {
  if (dbSocketAvailable !== false) {
    try {
      const rows = await db.select().from(users).where(eq(users.uid, uid));
      dbSocketAvailable = true;
      if (rows[0]) {
        return attachMeta({ ...rows[0], createdAt: rows[0].createdAt || new Date() });
      }
    } catch {
      dbSocketAvailable = false;
    }
  }
  const found = fallbackUsersStore.find((u) => u.uid === uid);
  return found ? attachMeta(found) : null;
}

export async function listRegisteredUsers(): Promise<UserRecord[]> {
  let dbUsers: UserRecord[] = [];
  if (dbSocketAvailable !== false) {
    try {
      const rows = await db.select().from(users);
      dbUsers = rows.map((r) =>
        attachMeta({
          ...r,
          createdAt: r.createdAt || new Date(),
        })
      );
    } catch {
      // fallback
    }
  }
  const merged = [...dbUsers, ...fallbackUsersStore.map(attachMeta)].filter(
    (u) => !deletedUserEmails.has(u.email.toLowerCase())
  );
  const seen = new Set<string>();
  const unique: UserRecord[] = [];
  for (const u of merged) {
    const key = u.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(u);
    }
  }
  return unique;
}

export async function deleteRegisteredUserByEmail(email: string): Promise<boolean> {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || clean === 'khandanish0503@gmail.com') {
    return false;
  }
  deletedUserEmails.add(clean);
  const idx = fallbackUsersStore.findIndex((u) => u.email.toLowerCase() === clean);
  if (idx !== -1) {
    fallbackUsersStore.splice(idx, 1);
  }
  return true;
}

