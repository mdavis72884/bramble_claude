import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateClassesToCourseOfferings() {
  console.log('Starting migration: Class → Course + Offering + OfferingClass\n');

  const classes = await prisma.class.findMany({
    include: {
      sessions: true,
      instructor: true,
      registrations: true,
    },
  });

  console.log(`Found ${classes.length} existing classes to migrate.\n`);

  for (const cls of classes) {
    console.log(`Migrating: "${cls.title}" (${cls.id})`);

    // 1. Create Course from the Class template data
    const course = await prisma.course.create({
      data: {
        tenantId: cls.tenantId,
        title: cls.title,
        description: cls.description,
        prerequisites: cls.prerequisites,
        ageMin: cls.ageMin,
        ageMax: cls.ageMax,
        imageUrl: cls.imageUrl,
        isArchived: cls.isArchived,
      },
    });
    console.log(`  Created Course: ${course.id}`);

    // 2. Determine season label from first session date
    let seasonLabel = null;
    if (cls.sessions && cls.sessions.length > 0) {
      const firstSession = cls.sessions[0];
      const date = new Date(firstSession.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month >= 0 && month <= 1) seasonLabel = `Spring ${year}`;
      else if (month >= 2 && month <= 4) seasonLabel = `Spring ${year}`;
      else if (month >= 5 && month <= 7) seasonLabel = `Summer ${year}`;
      else if (month >= 8 && month <= 10) seasonLabel = `Fall ${year}`;
      else seasonLabel = `Winter ${year}`;
    }

    // 3. Create Offering from the Class run-specific data
    const offering = await prisma.offering.create({
      data: {
        tenantId: cls.tenantId,
        courseId: course.id,
        instructorId: cls.instructorId,
        seasonLabel,
        price: cls.price,
        capacity: cls.capacity,
        status: cls.status,
        isArchived: cls.isArchived,
        materialsUrl: cls.materialsUrl,
      },
    });
    console.log(`  Created Offering: ${offering.id} (${seasonLabel || 'No season'})`);

    // 4. Convert ClassSession records to OfferingClass
    let classCount = 0;
    for (const session of cls.sessions || []) {
      await prisma.offeringClass.create({
        data: {
          offeringId: offering.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          locationDetails: session.locationDetails,
          isCancelled: session.isCancelled,
        },
      });
      classCount++;
    }
    console.log(`  Created ${classCount} OfferingClass records`);

    // 5. Migrate registrations to OfferingRegistration
    let regCount = 0;
    for (const reg of cls.registrations || []) {
      await prisma.offeringRegistration.create({
        data: {
          tenantId: reg.tenantId,
          userId: reg.userId,
          childId: reg.childId,
          offeringId: offering.id,
          status: reg.status,
          paymentId: reg.paymentId,
        },
      });
      regCount++;
    }
    console.log(`  Migrated ${regCount} registrations\n`);
  }

  console.log('Migration complete!');
  console.log(`Migrated ${classes.length} classes to Course + Offering structure.`);
}

migrateClassesToCourseOfferings()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Migration failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
