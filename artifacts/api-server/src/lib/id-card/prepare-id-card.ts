import type { User } from "@workspace/db";
import { store } from "@workspace/db";
import { ensureUserVerifySlug } from "../credentials/slug";
import { getOrgCredentialSettings, buildVerifyUrl } from "../credentials/org-settings";
import { getSignatoryProfile } from "../credentials/signatory-store";
import { generateQrSvg } from "../credentials/qr-svg";
import { buildIdCardDataFromUser } from "./build-from-user";
import { renderIdCardPair } from "./render-svg";
import type { IdCardPair } from "./types";

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
  const slug = await ensureUserVerifySlug(user);
  const org = await getOrgCredentialSettings();
  const verifyUrl = buildVerifyUrl(org.verifyBaseUrl, slug);

  let signatoryName: string | null = null;
  let signatoryDesignation: string | null = null;
  let signatorySignatureDataUrl: string | null = null;

  if (org.defaultIdCardSignatoryUserId != null) {
    const signatoryUser = await store.findUserById(org.defaultIdCardSignatoryUserId);
    const profile = await getSignatoryProfile(org.defaultIdCardSignatoryUserId);
    if (signatoryUser) {
      signatoryName = signatoryUser.fullName;
      signatoryDesignation = profile?.documentDesignation ?? signatoryUser.jobTitle ?? null;
      signatorySignatureDataUrl = profile?.signatureDataUrl ?? null;
    }
  }

  const qrSvg = await generateQrSvg(verifyUrl, 120);
  const cardData = await buildIdCardDataFromUser(user, {
    ...extras,
    verifyUrl,
    qrSvg,
    signatoryName,
    signatoryDesignation,
    signatorySignatureDataUrl,
  });
  return renderIdCardPair(cardData);
}
