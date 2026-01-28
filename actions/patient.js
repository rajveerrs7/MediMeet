import { db } from "@/lib/prisma";
import redis from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";

/**
 * Get all appointments for the authenticated patient
 */
export async function getPatientAppointments() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  try {
    const cacheKey = `patient:appointments:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Doctors fetched from cache");
      return { appointments: JSON.parse(cached), fromCache: true };
    }
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "PATIENT",
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("Patient not found");
    }

    const appointments = await db.appointment.findMany({
      where: {
        patientId: user.id,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });
    await redis.set(cacheKey, JSON.stringify(appointments), {
      EX: 300,
    });

    return { appointments };
  } catch (error) {
    console.error("Failed to get patient appointments:", error);
    return { error: "Failed to fetch appointments" };
  }
}
