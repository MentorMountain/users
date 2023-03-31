import axios from "axios";
import ENV from "../../env";

const TEST_CLIENT_RESPONSE = "10000000-aaaa-bbbb-cccc-000000000001";

export async function verifyCaptcha(clientResponse: string, source: string) {
  if (clientResponse === TEST_CLIENT_RESPONSE) {
    // TODO check source
    return true;
  }

  try {
    const response = await axios.post("https://hcaptcha.com/siteverify", {
      response: clientResponse,
      secret: ENV.HCAPTCHA_VERIFY_KEY,
    });

    return response.data?.success === true;
  } catch (e) {
    return false;
  }
}
