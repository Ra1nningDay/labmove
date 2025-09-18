import { z } from "zod";
import { ISODateTimeString, NonEmptyString, ThaiPhone } from "./common";

// Strict schemas for LIFF submissions. Unknown keys are rejected.

export const SignupPayloadSchema = z
  .object({
    idToken: NonEmptyString, // validated server-side in liffAuth
    displayName: NonEmptyString.optional(),
    givenName: NonEmptyString,
    familyName: NonEmptyString,
    phone: ThaiPhone,
    address: NonEmptyString,
    consent: z.object({
      terms_accepted: z.boolean(),
      privacy_accepted: z.boolean(),
    }),
    // Optional household linking
    householdId: z.string().uuid().optional(),
  })
  .strict();

export type SignupPayload = z.infer<typeof SignupPayloadSchema>;

export const BookingPayloadSchema = z
  .object({
    idToken: NonEmptyString,
    // booking specifics
    datetime: ISODateTimeString,
    locationId: NonEmptyString.optional(),
    serviceCode: NonEmptyString.optional(),
    notes: z.string().trim().max(500).optional(),
    // optional member selection for multi-member households
    memberId: NonEmptyString.optional(),
  })
  .strict();

export type BookingPayload = z.infer<typeof BookingPayloadSchema>;
