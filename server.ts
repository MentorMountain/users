import cors from "cors";
import express, { Application, Request, Response } from "express";
import { LoginValidationResponse as LoginResponse } from "./src/LoginValidationResponse";

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
  findUser,
  getUser,
  registerUser,
  updateUser,
} from "./src/users/UserDB";
import { UserToken } from "cmpt474-mm-jwt-middleware/src/User";
import { verifyCaptcha } from "./src/hcaptcha/verifyCaptcha";

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

app.post("/api/login", async (req: Request, res: Response) => {
  console.log("USERS: Processing login request from", req.header('X-Forwarded-Proto'));
  const { username, password, captchaResponse } = req.body;

  if (!username || !password || !captchaResponse) {
    return res.status(400).send({
      success: false,
      error: "Invalid login request",
    } as LoginResponse);
  }

  if (!(await verifyCaptcha(captchaResponse, "TODO"))) {
    return res
      .status(400)
      .send({ success: false, error: "Invalid captcha" } as LoginResponse);
  }

  const userData = await findUser(username, password);
  if (!userData.found) {
    return res.status(401).send({
      success: false,
      error: "Invalid login credentials",
    } as LoginResponse);
  }

  const userTokenData: UserToken = {
    username: username,
    role: userData.user!.role!,
  };
  const token = loginTokenGenerator(userTokenData);

  console.log(`USERS: ${username} successfully logged in`);

  return res.json({
    success: true,
    token: token,
  } as LoginResponse);
});

app.post("/api/login/signup", async (req: Request, res: Response) => {
  const { username, password, captchaResponse } = req.body;

  if (!username || !password || !captchaResponse) {
    return res.status(400).json({
      success: false,
      error: "Invalid sign up request",
    } as LoginResponse);
  }

  if (!(await verifyCaptcha(captchaResponse, "TODO"))) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid captcha" } as LoginResponse);
  }

  if (await doesUserExist(username)) {
    return res.status(400).json({
      success: false,
      error: "User already exists",
    } as LoginResponse);
  }

  if (await registerUser(username, password)) {
    const userData = await findUser(username, password);
    const userTokenData: UserToken = {
      username: username,
      role: userData.user!.role!,
    };
    const token = loginTokenGenerator(userTokenData);

    return res.status(200).json({
      success: true,
      token: token,
    } as LoginResponse);
  }

  return res.status(500).json({
    success: false,
    error: "Failed to sign up",
  } as LoginResponse);
});

const loginValidator = validateLoginToken(LOGIN_TOKEN_VALIDATION_PARAMETERS);

app.get(
  "/api/login/introspection",
  loginValidator,
  async (request: Request, response: Response) => {
    const systemRequest = request as LoginTokenizedRequest;
    const userToken = systemRequest.user;
    const failedResponse = () => response.status(401).json({ status: false });

    // Check user still exists
    const userData = await getUser(userToken.username);
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
        error: `Missing mentor application code. Got \"${applicationCode}\"`,
      } as LoginResponse);
    }

    if (applicationCode !== ENV.MENTOR_APPLICATION_PASSWORD) {
      return res.status(400).send({
        success: false,
        error: `Incorrect mentor application code. Got \"${applicationCode}\"`,
      } as LoginResponse);
    }

    const username = systemRequest.user.username;
    const userData = await getUser(username);

    if (userData.user!.role === "mentor") {
      return res.status(400).send({
        success: false,
        error: "Already a mentor",
      } as LoginResponse);
    }

    const mentorRole: UserRole = "mentor";
    const updateSuccess = await updateUser({ username, role: mentorRole });

    if (!updateSuccess) {
      return res.status(500).send({
        success: false,
        error: `Failed to give ${username} mentor role`,
      } as LoginResponse);
    }

    const token = loginTokenGenerator({ username, role: mentorRole });
    return res.status(200).json({
      success: true,
      token: token,
    } as LoginResponse);
  }
);

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
