"use server";

import redis from "@/lib/redis";
import { db } from "@/lib/prisma";

/**
 * Get doctors by specialty (cached)
 */
export async function getDoctorsBySpecialty(specialty) {
  try {
    const cacheKey = `doctors:specialty:${specialty}`;

    // 1. Check Redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Doctors fetched from cache");
      return { doctors: JSON.parse(cached), fromCache: true };
    }

    // 2. Query DB
    const doctors = await db.user.findMany({
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        specialty, // already decoded
      },
      orderBy: {
        name: "asc",
      },
    });

    // 3. Cache result (10 mins)
    await redis.set(cacheKey, JSON.stringify(doctors), {
      EX: 600,
    });

    return { doctors, fromCache: false };
  } catch (error) {
    console.error("Failed to fetch doctors by specialty:", error);
    return { error: "Failed to fetch doctors" };
  }
}
