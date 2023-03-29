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

app.get("/api/health", cors({ origin: "*" }), (_: Request, res: Response) => {
  res.json({
    health: "OK",
  });
});

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if ([ENV.WEBAPP_DOMAIN, "http://localhost:3000"].indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

const LOGIN_TOKEN_VALIDATION_PARAMETERS: LoginTokenParameters = {
  JWT_SECRET: ENV.JWT_SECRET,
  GATEWAY_DOMAIN: ENV.GATEWAY_DOMAIN,
  WEBAPP_DOMAIN: ENV.WEBAPP_DOMAIN,
};

const loginTokenGenerator = (loginParameters: LoginParameters) =>
  generateLoginToken(loginParameters, LOGIN_TOKEN_VALIDATION_PARAMETERS);

app.post("/api/login/validate", async (req: Request, res: Response) => {
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
    console.warn(
      `USERS: SFU validation failed. success: ${success}, computingID: ${computingID}, error: ${JSON.stringify(
        error
      )}`
    );
    return res
      .status(401)
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

  console.log(`USERS: ${computingID} successfully logged in`);

  return res.json({
    success: true,
    token: token,
  } as LoginValidationResponse);
});

const loginValidator = validateLoginToken(LOGIN_TOKEN_VALIDATION_PARAMETERS);

app.get(
  "/api/login/introspection",
  loginValidator,
  async (request: Request, response: Response) => {
    const systemRequest = request as LoginTokenizedRequest;
    const userToken = systemRequest.user;
    const userData = await getUser(userToken.computingID);

    const failedResponse = () => response.status(401).json({ status: false });

    // Check user still exists
    if (!userData.user) {
      return failedResponse();
    }

    const latestUser = userData.user;

    // Verify contents are up-to-date
    if (userToken.role !== latestUser.role) {
      return failedResponse();
    }

    return response.status(200).json({ status: true });
  }
);

app.post(
  "/api/login/apply-mentor",
  validateLoginToken(LOGIN_TOKEN_VALIDATION_PARAMETERS),
  async (request: Request, res: Response) => {
    const systemRequest = request as LoginTokenizedRequest;
    const { applicationCode } = systemRequest.body;

    if (!applicationCode) {
      return res.status(400).send({
        success: false,
        error: "Missing mentor application code",
      } as LoginValidationResponse);
    }

    if (applicationCode !== ENV.MENTOR_APPLICATION_PASSWORD) {
      return res.status(400).send({
        success: false,
        error: "Incorrect mentor application code",
      } as LoginValidationResponse);
    }

    const computingID = systemRequest.user.computingID;
    const userData = await getUser(computingID);

    if (userData.user!.role === "mentor") {
      return res.status(400).send({
        success: false,
        error: "Already a mentor",
      } as LoginValidationResponse);
    }

    const mentorRole: UserRole = "mentor";
    const updateSuccess = await updateUser({ computingID, role: mentorRole });

    if (!updateSuccess) {
      return res.status(500).send({
        success: false,
        error: `Failed to give ${computingID} mentor role`,
      } as LoginValidationResponse);
    }

    const token = loginTokenGenerator({ computingID, role: mentorRole });
    return res.status(200).json({
      success: true,
      token: token,
    } as LoginValidationResponse);
  }
);

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
