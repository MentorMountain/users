import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export interface SFUValidation {
  computingID?: string;
  success: boolean;
  error?: string;
}

const courseRegex = new RegExp(
  "^(?:[a-zA-Z]+-\\d{3})$|^(?:[a-zA-Z]+\\d{3}(?:-\\w+)?)$"
);

function isCourse(membership: string) {
  return courseRegex.test(membership);
}

export async function validateSFUTicket(
  referrer: string,
  ticket: string
): Promise<SFUValidation> {
  const serviceResponseKey = "cas:serviceResponse";
  const authSuccessKey = "cas:authenticationSuccess";
  const casUserKey = "cas:user";

  try {
    const response = await axios.get("https://cas.sfu.ca/cas/serviceValidate", {
      params: { service: referrer, ticket: ticket },
    });

    const parser = new XMLParser();
    const sfuData = parser.parse(response.data);

    let isAuthSuccess =
      serviceResponseKey in sfuData &&
      authSuccessKey in sfuData[serviceResponseKey];

    if (!isAuthSuccess) {
      return {
        success: false,
        error: "Invalid SFU login",
      };
    }

    const authData = sfuData[serviceResponseKey][authSuccessKey];

    return {
      success: true,
      computingID: authData[casUserKey],
    };
  } catch (e) {
    console.error("SFU CAS Verify error", e);

    return {
      success: false,
      error: JSON.stringify(e),
    };
  }
}
