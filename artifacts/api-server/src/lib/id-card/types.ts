export type IdCardVariant = "employee" | "intern";

export type IdCardData = {
  variant: IdCardVariant;
  fullName: string;
  employeeCode: string;
  jobTitle: string | null;
  teamName: string | null;
  email: string;
  phone: string | null;
  bloodGroup: string | null;
  startDate: string | null;
  endDate?: string | null;
  photoDataUrl: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  university?: string | null;
  program?: string | null;
  mentorName?: string | null;
  role: string;
  verifyUrl?: string | null;
  qrSvg?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  signatorySignatureDataUrl?: string | null;
};

export type IdCardPair = {
  frontSvg: string;
  backSvg: string;
  variant: IdCardVariant;
};
