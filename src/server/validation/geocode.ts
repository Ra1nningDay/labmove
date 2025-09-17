import { z } from "zod";

// Geocode endpoints may receive extra vendor fields; allow passthrough.
export const GeocodeQuerySchema = z
  .object({
    q: z.string().trim().min(1),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
  })
  .passthrough();

export type GeocodeQuery = z.infer<typeof GeocodeQuerySchema>;

