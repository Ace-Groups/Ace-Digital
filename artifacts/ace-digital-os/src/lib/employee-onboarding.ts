import { validateBankDetails } from "@/lib/bank-details";
import { parseAadhaarDocuments } from "@/lib/employee-documents";

const AADHAAR_REGEX = /^\d{12}$/;
const PHONE_REGEX = /^[+]?[\d\s-]{10,15}$/;

export type HrOnboardingInput = {
  fullName?: string;
  dob?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  aadhaarNumber?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactRelationshipOther?: string;
  emergencyContactPhone?: string;
  highestQualification?: string;
  bloodGroup?: string;
  profilePhotoUrl?: string;
  aadhaarDocument?: string;
  workType?: string;
  bankAccountNumber?: string;
  confirmBankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  bankAccountHolderName?: string;
  panNumber?: string;
  bankAccountType?: string;
  upiId?: string;
};

export function validateHrOnboarding(
  input: HrOnboardingInput,
  options: { required?: boolean } = { required: true },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = options.required ?? true;
  const need = (value?: string) => required || !!value?.trim();

  if (need(input.fullName) && !input.fullName?.trim()) errors.fullName = "Full name required";
  if (need(input.dob) && !input.dob?.trim()) errors.dob = "Date of birth required";
  if (need(input.email) && !input.email?.trim()) errors.email = "Email required";
  if (need(input.phone)) {
    if (!input.phone?.trim()) errors.phone = "Phone number required";
    else if (!PHONE_REGEX.test(input.phone.trim())) errors.phone = "Enter a valid phone number";
  }
  if (need(input.address) && !input.address?.trim()) errors.address = "Residential address required";
  if (need(input.city) && !input.city?.trim()) errors.city = "City required";
  if (need(input.state) && !input.state?.trim()) errors.state = "State required";
  if (need(input.zipCode) && !input.zipCode?.trim()) errors.zipCode = "Zip code required";
  if (need(input.country) && !input.country?.trim()) errors.country = "Country required";
  if (need(input.gender) && !input.gender?.trim()) errors.gender = "Gender required";
  if (need(input.maritalStatus) && !input.maritalStatus?.trim()) {
    errors.maritalStatus = "Marital status required";
  }
  if (need(input.nationality) && !input.nationality?.trim()) errors.nationality = "Nationality required";

  const aadhaar = input.aadhaarNumber?.replace(/\s/g, "") ?? "";
  if (need(input.aadhaarNumber)) {
    if (!aadhaar) errors.aadhaarNumber = "Aadhaar number required";
    else if (!AADHAAR_REGEX.test(aadhaar)) errors.aadhaarNumber = "Enter 12-digit Aadhaar number";
  }

  if (need(input.emergencyContactName) && !input.emergencyContactName?.trim()) {
    errors.emergencyContactName = "Emergency contact name required";
  }
  const relationship = input.emergencyContactRelationship?.trim() ?? "";
  if (need(input.emergencyContactRelationship) && !relationship) {
    errors.emergencyContactRelationship = "Emergency contact relationship required";
  }
  if (relationship === "other" && !input.emergencyContactRelationshipOther?.trim()) {
    errors.emergencyContactRelationshipOther = "Specify relationship";
  }
  if (need(input.emergencyContactPhone)) {
    if (!input.emergencyContactPhone?.trim()) errors.emergencyContactPhone = "Emergency phone required";
    else if (!PHONE_REGEX.test(input.emergencyContactPhone.trim())) {
      errors.emergencyContactPhone = "Enter a valid phone number";
    }
  }
  if (need(input.highestQualification) && !input.highestQualification?.trim()) {
    errors.highestQualification = "Highest qualification required";
  }
  if (need(input.bloodGroup) && !input.bloodGroup?.trim()) errors.bloodGroup = "Blood group required";

  if (required && !input.profilePhotoUrl?.trim()) {
    errors.profilePhotoUrl = "Professional photo required";
  }
  if (required && !parseAadhaarDocuments(input.aadhaarDocument).length) {
    errors.aadhaarDocument = "Upload at least one Aadhaar copy";
  }

  Object.assign(errors, validateBankDetails(input, { required }));

  return errors;
}

export function resolveEmergencyRelationship(input: HrOnboardingInput): string | null {
  const base = input.emergencyContactRelationship?.trim() ?? "";
  if (!base) return null;
  if (base === "other") return input.emergencyContactRelationshipOther?.trim() || "Other";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function normalizeAadhaarNumber(value?: string): string | null {
  const digits = value?.replace(/\s/g, "") ?? "";
  return digits || null;
}
