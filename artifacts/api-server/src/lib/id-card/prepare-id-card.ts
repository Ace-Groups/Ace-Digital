import type { User } from "@workspace/db";
import { store } from "@workspace/db";
import { employeeCodeFromUser } from "../credentials/employee-code";
import { getOrgCredentialSettings, buildVerifyUrl } from "../credentials/org-settings";
import { getSignatoryProfile } from "../credentials/signatory-store";
import { generateQrSvg } from "../credentials/qr-svg";
import { buildIdCardDataFromUser } from "./build-from-user";
import { renderIdCardPair } from "./render-svg";
import type { IdCardPair } from "./types";
import { DEFAULT_SIGNATURE_DATA_URL } from "../credentials/default-signature";

export async function prepareIdCardPair(
  user: User,
  extras?: {
    teamName?: string | null;
    university?: string | null;
    program?: string | null;
    mentorName?: string | null;
    endDate?: string | null;
  },
): Promise<IdCardPair> {
  const org = await getOrgCredentialSettings();
  const verifyUrl = buildVerifyUrl(org.verifyBaseUrl, employeeCodeFromUser(user));

  let signatoryName: string | null = null;
  let signatoryDesignation: string | null = null;
  let signatorySignatureDataUrl: string | null = null;

  const signatoryUserId = org.defaultIdCardSignatoryUserId ?? 1;
  const signatoryUser = await store.findUserById(signatoryUserId);
  const profile = await getSignatoryProfile(signatoryUserId);

  if (signatoryUser) {
    signatoryName = signatoryUser.fullName;
    signatoryDesignation = profile?.documentDesignation ?? signatoryUser.jobTitle ?? "Managing Director";
    signatorySignatureDataUrl = profile?.signatureDataUrl ?? DEFAULT_SIGNATURE_DATA_URL;
  } else {
    signatoryName = "Kavin Balaji";
    signatoryDesignation = "Managing Director";
    signatorySignatureDataUrl = DEFAULT_SIGNATURE_DATA_URL;
  }

  const qrSvg = await generateQrSvg(verifyUrl, 200);
  const cardData = await buildIdCardDataFromUser(user, {
    ...extras,
    verifyUrl,
    qrSvg,
    signatoryName,
    signatoryDesignation,
    signatorySignatureDataUrl,
    companyLegalName: org.companyLegalName,
  });
  return renderIdCardPair(cardData);
}

