import bcrypt from "bcrypt";
import { DocumentData, Firestore } from "@google-cloud/firestore";
import { User, UserRole } from "cmpt474-mm-jwt-middleware";
import ENV from "../../env";
import { UserResult } from "./UserResult";

const firestore: Firestore = new Firestore({
  projectId: ENV.PROJECT_ID,
  timestampsInSnapshots: true,
});

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 13);
}

async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

function getUserCollection(): FirebaseFirestore.CollectionReference<DocumentData> {
  return firestore.collection(ENV.DB_COLLECTION_NAME);
}

async function getDBUser(username: string) {
  return getUserCollection().where("username", "==", username).get();
}

export async function getUser(username: string): Promise<UserResult> {
  const results = await getDBUser(username);

  if (results.empty) {
    return {
      found: false,
    };
  }

  const data = results.docs[0].data();

  return {
    found: true,
    user: {
      username,
      authHash: data.authHash,
      role: data.role as UserRole,
    },
  };
}

export async function findUser(
  username: string,
  candidatePassword: string
): Promise<UserResult> {
  const userData = await getUser(username);

  if (!userData.found) {
    return {
      found: false,
    };
  }

  if (await comparePassword(candidatePassword, userData.user!.authHash)) {
    return userData;
  }

  return {
    found: false,
  };
}

export async function doesUserExist(username: string): Promise<boolean> {
  return (await getUser(username)).found;
}

export async function registerUser(
  username: string,
  password: string
): Promise<boolean> {
  if (await doesUserExist(username)) {
    return false;
  }

  const passwordHash = await hashPassword(password);

  const user: User = {
    username,
    authHash: passwordHash,
    role: "student",
  };

  return await addUser(user);
}

async function addUser(user: User) {
  if (await doesUserExist(user.username)) {
    return false;
  }

  try {
    const result = await getUserCollection().add(user);
    console.log(`ADD USER DB: (${result.id}): ${user}`);
    return true;
  } catch (e: any) {
    console.error(JSON.stringify(e));
    return false;
  }
}

export async function updateUser(user: Partial<User>): Promise<boolean> {
  const dbData = await getDBUser(user.username!);

  if (dbData.empty) {
    return false;
  }

  const dbUser = dbData.docs[0];
  const dbID = dbUser.id;

  try {
    await getUserCollection()
      .doc(dbID)
      .update({ ...user });
    return true;
  } catch (e: any) {
    console.error(JSON.stringify(e));
    return false;
  }
}
