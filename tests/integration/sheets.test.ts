import fs from "fs";
import path from "path";
import { appendBooking, getLatestBookingByUserId } from "@/server/repo/bookings";

const BOOKINGS_CSV = path.join(process.cwd(), "data", "bookings.csv");
const ORIGINAL_SHEET_ID = process.env.SHEET_ID;
const ORIGINAL_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT;

function resetEnv() {
  if (ORIGINAL_SHEET_ID === undefined) delete process.env.SHEET_ID;
  else process.env.SHEET_ID = ORIGINAL_SHEET_ID;

  if (ORIGINAL_SERVICE_ACCOUNT === undefined)
    delete process.env.GOOGLE_SERVICE_ACCOUNT;
  else process.env.GOOGLE_SERVICE_ACCOUNT = ORIGINAL_SERVICE_ACCOUNT;
}

describe("Integration: bookings repository CSV fallback", () => {
  beforeEach(() => {
    delete process.env.SHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT;
  });

  afterEach(() => {
    resetEnv();
    if (fs.existsSync(BOOKINGS_CSV)) {
      fs.unlinkSync(BOOKINGS_CSV);
    }
    const dataDir = path.join(process.cwd(), "data");
    if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length === 0) {
      fs.rmdirSync(dataDir);
    }
  });

  it("writes bookings to local CSV when Google Sheets is not configured", async () => {
    await appendBooking({
      userId: "user-123",
      bookingDate: "2025-09-20",
      datePreference: "2025-09-20T09:00:00Z",
      address: "123 Hospital Road, Bangkok",
      note: "first request",
      status: "pending",
    });

    expect(fs.existsSync(BOOKINGS_CSV)).toBe(true);
    const csvContents = fs.readFileSync(BOOKINGS_CSV, "utf8");
    expect(csvContents).toContain("user-123");
    expect(csvContents).toContain("pending");
  });

  it("returns the latest booking for a user from the CSV store", async () => {
    await appendBooking({
      userId: "user-789",
      bookingDate: "2025-10-01",
      datePreference: "2025-10-01T08:30:00Z",
      address: "456 Clinic Avenue, Chiang Mai",
      note: "first slot",
      status: "pending",
    });

    await appendBooking({
      userId: "user-789",
      bookingDate: "2025-10-02",
      datePreference: "2025-10-02T13:00:00Z",
      address: "456 Clinic Avenue, Chiang Mai",
      note: "latest slot",
      status: "pending",
    });

    const latest = await getLatestBookingByUserId("user-789");
    expect(latest).not.toBeNull();
    expect(latest?.bookingDate).toBe("2025-10-02");
    expect(latest?.note).toBe("latest slot");
  });
});
