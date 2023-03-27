import cors from "cors";
import express, { Application, Request, Response } from "express";
import { LoginValidationResponse } from "./src/LoginValidationResponse";
import { validateSFUTicket } from "./src/sfu/sfuValidation";

import {
  generateLoginToken,
  LoginTokenizedRequest,
  LoginTokenParameters,
  validateLoginToken,
} from "cmpt474-mm-jwt-middleware";
import ENV from "./env";

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

  const token = generateLoginToken(
    { computingID, role: "student" }, // TODO: Pull role from user DB
    {
      JWT_SECRET: ENV.JWT_SECRET,
      GATEWAY_DOMAIN: ENV.GATEWAY_DOMAIN,
      WEBAPP_DOMAIN: ENV.WEBAPP_DOMAIN,
    }
  );

  return res.json({
    success: true,
    token: token,
  } as LoginValidationResponse);
});

app.post(
  "/api/mentor-apply",
  validateLoginToken(LOGIN_TOKEN_VALIDATION_PARAMETERS),
  (request: Request, res: Response) => {
    const systemRequest = request as LoginTokenizedRequest;

    const { applicationCode } = systemRequest.body;
    if (!applicationCode) {
      return res.status(400).send();
    }

    // TODO: Update user DB
    return res
      .status(500)
      .send(
        `UNIMPLEMENTED\n${systemRequest.user.computingID}\n${systemRequest.user.role}\n${applicationCode}`
      );
  }
);

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
