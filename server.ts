import cors from "cors";
import express, { Application, Request, Response } from "express";
import { LoginValidationResponse } from "./src/LoginValidationResponse";
import { validateSFUTicket } from "./src/sfu/sfuValidation";

import {
  generateLoginToken,
  LoginParameters,
  LoginTokenizedRequest,
  LoginTokenParameters,
  UserRole,
  validateLoginToken,
} from "cmpt474-mm-jwt-middleware";
import ENV from "./env";
import {
  doesUserExist,
  getUser,
  registerUser,
  updateUser,
} from "./src/users/UserDB";

const app: Application = express();
const port: number = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));
app.get("/api/health", (_: Request, res: Response) => {
  res.json({
    health: "OK",
  });
});

const LOGIN_TOKEN_VALIDATION_PARAMETERS: LoginTokenParameters = {
  JWT_SECRET: ENV.JWT_SECRET,
  GATEWAY_DOMAIN: ENV.GATEWAY_DOMAIN,
  WEBAPP_DOMAIN: ENV.WEBAPP_DOMAIN,
};

const loginTokenGenerator = (loginParameters: LoginParameters) =>
  generateLoginToken(loginParameters, LOGIN_TOKEN_VALIDATION_PARAMETERS);

app.post("/api/login-validate", async (req: Request, res: Response) => {
  const { referrer, sfuToken } = req.body;

  if (!referrer || !sfuToken) {
    return res.status(400).send({
      success: false,
      error: "Incomplete validation request",
    } as LoginValidationResponse);
  }

  const { success, computingID, error } = await validateSFUTicket(
    referrer,
    sfuToken
  );

  if (!success || !computingID) {
    return res
      .status(403)
      .send({ success: false, error: error } as LoginValidationResponse);
  }

  if (!(await doesUserExist(computingID))) {
    console.log(`USERS: Adding ${computingID} to the system`);
    await registerUser(computingID);
  }

  const userData = await getUser(computingID);
  if (!userData.found) {
    return res.status(500).send("Failed to register new SFU member");
  }

  const token = loginTokenGenerator(userData.user!);
  return res.json({
    success: true,
    token: token,
  } as LoginValidationResponse);
});

app.post(
  "/api/mentor-apply",
  validateLoginToken(LOGIN_TOKEN_VALIDATION_PARAMETERS),
  async (request: Request, res: Response) => {
    const systemRequest = request as LoginTokenizedRequest;
    const { applicationCode } = systemRequest.body;

    if (!applicationCode) {
      return res.status(400).send();
    }

    const computingID = systemRequest.user.computingID;
    const userData = await getUser(computingID);

    if (userData.user!.role === "mentor") {
      return res.status(400).send("Already a mentor");
    }

    const mentorRole: UserRole = "mentor";
    const updateSuccess = await updateUser({ computingID, role: mentorRole });

    if (!updateSuccess) {
      return res.status(500).send(`Failed to give ${computingID} mentor role`);
    }

    const token = loginTokenGenerator({ computingID, role: mentorRole });
    return res.status(204).json(token);
  }
);

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
