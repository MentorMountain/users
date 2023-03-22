import express, { Express, Request, Response } from "express";
import cors from "cors";
import { validateSFUTicket } from "./src/sfu/sfuValidation";
import { LoginValidationResponse } from "./src/LoginValidationResponse";

import ENV from "./env";

const app: Express = express();
const port: number = (process.env.PORT && parseInt(process.env.PORT)) || 8080;
// https://www.npmjs.com/package/cors
const whitelist = [
  "https://mentormountain.ca",
  "https://www.mentormountain.ca",
  "https://www.sfu.ca",
];

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

//   app.use(cors(corsOptions));
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/login", (_: Request, res: Response) => {
  return res.redirect(
    `https://cas.sfu.ca/cas/login?service=${ENV.FRONTEND_LOGIN_URL}`
  );
});

app.post("/api/login-validate", async (req: Request, res: Response) => {
  const { referrer, sfuToken } = req.body;

  if (!referrer || !sfuToken) {
    return res.status(400).send({
      success: false,
      error: "Incomplete validation request",
    } as LoginValidationResponse);
  }

  const { success, computingID, courses, error } = await validateSFUTicket(
    referrer,
    sfuToken
  );

  if (!success) {
    return res
      .status(403)
      .send({ success: false, error: error } as LoginValidationResponse);
  }

  const token = ""; // TODO

  return res.json({
    success: true,
    token: token,
    courses: courses, // TODO: want to put the courses inside the JWT token to ensure integrity
    computingID: computingID,
  } as LoginValidationResponse);
});

app.get("/api/health", (_: Request, res: Response) => {
  res.json({
    health: "OK",
  });
});

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
