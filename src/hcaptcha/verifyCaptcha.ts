import axios from "axios";
import ENV from "../../env";

const TEST_CLIENT_RESPONSE = "10000000-aaaa-bbbb-cccc-000000000001";

export async function verifyCaptcha(clientResponse: string, source: string) {
  if (clientResponse === TEST_CLIENT_RESPONSE) {
    console.warn("ACCEPTING CAPTCHA TEST RESPONSE");
    // TODO check source
    return true;
  }

  try {
    const params = new URLSearchParams({
      response: clientResponse,
      secret: ENV.HCAPTCHA_VERIFY_KEY,
    });
    const response = await axios.post(
      "https://hcaptcha.com/siteverify",
      params
    );

    console.log("CAPTCHA RESPONSE", response.data?.success, response.data);

    return response.data?.success === true;
  } catch (e) {
    console.log("CAPTCHA ERROR", e);
    return false;
  }
}
