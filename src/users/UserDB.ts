import { Firestore } from "@google-cloud/firestore";
import { User, UserRole } from "cmpt474-mm-jwt-middleware";
import ENV from "../../env";
import { UserResult } from "./UserResult";

const firestore: Firestore = new Firestore({
  projectId: ENV.PROJECT_ID,
  timestampsInSnapshots: true,
});

const GCLOUD_STRING_LENGTH_LIMIT: number = 750;
const DB_STR_LIMIT: number = GCLOUD_STRING_LENGTH_LIMIT - 50;

function isStringDataPermittable(content: string): boolean {
  return content.length <= DB_STR_LIMIT;
}

async function getUser(computingID: string): Promise<UserResult> {
  const doesUserExist = true;

  if (!doesUserExist) {
    return {
      found: false,
    };
  }

  let role: UserRole = "student"; // TODO get from DB

  return {
    found: true,
    user: {
      computingID,
      role,
    },
  };
}
