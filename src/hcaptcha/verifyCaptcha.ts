import axios from "axios";
import ENV from "../../env";

const TEST_CLIENT_RESPONSE = "10000000-aaaa-bbbb-cccc-000000000001";
const LOCALHOST_CLIENT = "http://localhost:3000";

export async function verifyCaptcha(clientResponse: string, referrer: string) {
  if (
    clientResponse === TEST_CLIENT_RESPONSE &&
    referrer.startsWith(LOCALHOST_CLIENT)
  ) {
    console.warn("USERS: ACCEPTING CAPTCHA TEST RESPONSE");
    return true;
  }

  if (referrer.length === 0 || !referrer.startsWith(ENV.WEBAPP_DOMAIN)) {
    console.warn("USERS: Wrong captcha referrer", referrer);
    return false;
  }

  try {
    const params = new URLSearchParams({
      response: clientResponse,
      secret: ENV.HCAPTCHA_VERIFY_KEY,
      sitekey: ENV.HCAPTCHA_SITE_KEY,
    });
    const response = await axios.post(
      "https://hcaptcha.com/siteverify",
      params
    );

    const { success } = response.data;
    const successfulCaptcha = success === true;

    console.log(
      successfulCaptcha ? "USERS: Captcha verified" : "USERS: Captcha failed"
    );

    return successfulCaptcha;
  } catch (e) {
    console.log("CAPTCHA ERROR", e);
    return false;
  }
}
