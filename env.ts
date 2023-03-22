import "dotenv/config";

const DEFAULT = "";

const ENV = {
    FRONTEND_LOGIN_URL: process.env.FRONTEND_LOGIN_URL || "http://localhost:3000",
    VERIFIED_CLAIMS_SECRET: process.env.VERIFIED_CLAIMS_SECRET || "secret",
};

for (const [k, v] of Object.entries(ENV)) {
  if (v === DEFAULT) {
    console.error(`${k} UNAVAILABLE`);
    process.exit(1)
  }
}

export default ENV;