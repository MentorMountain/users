import { DocumentData, Firestore } from "@google-cloud/firestore";
import { User, UserRole } from "cmpt474-mm-jwt-middleware";
import ENV from "../../env";
import { UserResult } from "./UserResult";

const firestore: Firestore = new Firestore({
  projectId: ENV.PROJECT_ID,
  timestampsInSnapshots: true,
});

function getUserCollection(): FirebaseFirestore.CollectionReference<DocumentData> {
  return firestore.collection(ENV.DB_COLLECTION_NAME);
}

export async function getUser(computingID: string): Promise<UserResult> {
  const results = await getUserCollection()
    .where("computingID", "==", computingID)
    .get();

  if (results.empty) {
    return {
      found: false,
    };
  }

  const data = results.docs[0].data();

  return {
    found: true,
    user: {
      computingID,
      role: data.role as UserRole,
    },
  };
}

export async function doesUserExist(computingID: string): Promise<boolean> {
  return (await getUser(computingID)).found;
}

export async function registerUser(computingID: string): Promise<boolean> {
  if (await doesUserExist(computingID)) {
    return false;
  }

  const user: User = {
    computingID,
    role: "student",
  };

  return await addUser(user);
}

async function addUser(user: User) {
  if (await doesUserExist(user.computingID)) {
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

export async function updateUser(user: User): Promise<boolean> {
  if (!(await doesUserExist(user.computingID))) {
    return false;
  }

  try {
    const result = await getUserCollection().add(user);
    console.log(`UPDATE USER DB: (${result.id}): ${user}`);
    return true;
  } catch (e: any) {
    console.error(JSON.stringify(e));
    return false;
  }
}
