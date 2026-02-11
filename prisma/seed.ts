import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing seed data (but keep real user data)
  console.log('Cleaning up existing seed data...');
  const seedEmails = [
    'operator@bramble.co', 'admin@bramble.co',
    'admin@oakhollow.edu', 'director@oakhollow.edu',
    'jane.smith@oakhollow.edu', 'robert.wilson@oakhollow.edu',
    'parent@example.com', 'martinez@example.com'
  ];
  
  // Delete in order to respect foreign keys
  await prisma.payment.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.sessionNote.deleteMany({});
  await prisma.classSession.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.child.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { in: seedEmails } } });
  await prisma.tenant.deleteMany({ where: { slug: 'oak-hollow' } });
  await prisma.feeRule.deleteMany({});
  await prisma.emailTemplate.deleteMany({});
  await prisma.emailAutomation.deleteMany({});
  console.log('✅ Cleaned up existing seed data');

  // Create Bramble Operators (2)
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const operator = await prisma.user.create({
    data: {
      email: 'operator@bramble.co',
      passwordHash: operatorPassword,
      firstName: 'Platform',
      lastName: 'Operator',
      role: 'BRAMBLE_OPERATOR',
      tenantId: null,
    },
  });

  const operator2 = await prisma.user.create({
    data: {
      email: 'admin@bramble.co',
      passwordHash: operatorPassword,
      firstName: 'Alex',
      lastName: 'Bramble',
      role: 'BRAMBLE_OPERATOR',
      tenantId: null,
    },
  });
  console.log('✅ Created 2 Bramble Operators');

  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Oak Hollow Co-op',
      slug: 'oak-hollow',
      status: 'Active',
      contactEmail: 'admin@oakhollow.edu',
      directoryVisible: true,
    },
  });
  console.log('✅ Created Tenant: Oak Hollow Co-op');

  // Create Co-op Admins (2)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const coopAdmin = await prisma.user.create({
    data: {
      email: 'admin@oakhollow.edu',
      passwordHash: adminPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'COOP_ADMIN',
      tenantId: tenant.id,
    },
  });

  const coopAdmin2 = await prisma.user.create({
    data: {
      email: 'director@oakhollow.edu',
      passwordHash: adminPassword,
      firstName: 'Michael',
      lastName: 'Chen',
      role: 'COOP_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created 2 Co-op Admins');

  // Create Instructors (2)
  const instructorPassword = await bcrypt.hash('instructor123', 10);
  const instructor = await prisma.user.create({
    data: {
      email: 'jane.smith@oakhollow.edu',
      passwordHash: instructorPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'INSTRUCTOR',
      tenantId: tenant.id,
      applicationStatus: 'APPROVED',
      bio: 'Experienced biology educator with 10+ years teaching homeschool students.',
    },
  });

  const instructor2 = await prisma.user.create({
    data: {
      email: 'robert.wilson@oakhollow.edu',
      passwordHash: instructorPassword,
      firstName: 'Robert',
      lastName: 'Wilson',
      role: 'INSTRUCTOR',
      tenantId: tenant.id,
      applicationStatus: 'APPROVED',
      bio: 'Art teacher specializing in watercolor and oil painting techniques.',
    },
  });
  console.log('✅ Created 2 Instructors');

  // Create Families (2)
  const familyPassword = await bcrypt.hash('family123', 10);
  const family = await prisma.user.create({
    data: {
      email: 'parent@example.com',
      passwordHash: familyPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'FAMILY',
      tenantId: tenant.id,
      applicationStatus: 'APPROVED',
    },
  });

  const family2 = await prisma.user.create({
    data: {
      email: 'martinez@example.com',
      passwordHash: familyPassword,
      firstName: 'Maria',
      lastName: 'Martinez',
      role: 'FAMILY',
      tenantId: tenant.id,
      applicationStatus: 'APPROVED',
    },
  });
  console.log('✅ Created 2 Family Users');

  // Create Children for both families
  const child1 = await prisma.child.create({
    data: {
      firstName: 'Emma',
      lastName: 'Doe',
      dateOfBirth: new Date('2015-04-15'),
      parentId: family.id,
    },
  });

  const child2 = await prisma.child.create({
    data: {
      firstName: 'Liam',
      lastName: 'Doe',
      dateOfBirth: new Date('2013-08-22'),
      parentId: family.id,
    },
  });

  const child3 = await prisma.child.create({
    data: {
      firstName: 'Sofia',
      lastName: 'Martinez',
      dateOfBirth: new Date('2014-06-10'),
      parentId: family2.id,
    },
  });

  const child4 = await prisma.child.create({
    data: {
      firstName: 'Diego',
      lastName: 'Martinez',
      dateOfBirth: new Date('2016-11-25'),
      parentId: family2.id,
    },
  });
  console.log('✅ Created 4 Children');

  // Create Published Classes (2)
  const bioClass = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructor.id,
      title: 'Biology 101: Introduction to Life Sciences',
      description: 'An engaging introduction to biology covering cells, genetics, and ecosystems.',
      price: 150.00,
      capacity: 20,
      status: 'Published',
    },
  });

  const artClass = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructor2.id,
      title: 'Watercolor Painting for Beginners',
      description: 'Learn the basics of watercolor techniques, color mixing, and composition.',
      price: 125.00,
      capacity: 15,
      status: 'Published',
    },
  });

  // Create Class Sessions for Biology
  await prisma.classSession.createMany({
    data: [
      {
        classId: bioClass.id,
        date: new Date('2025-01-15'),
        startTime: '10:00',
        endTime: '11:30',
        location: 'Room 101',
      },
      {
        classId: bioClass.id,
        date: new Date('2025-01-22'),
        startTime: '10:00',
        endTime: '11:30',
        location: 'Room 101',
      },
      {
        classId: bioClass.id,
        date: new Date('2025-01-29'),
        startTime: '10:00',
        endTime: '11:30',
        location: 'Room 101',
      },
    ],
  });

  // Create Class Sessions for Art
  await prisma.classSession.createMany({
    data: [
      {
        classId: artClass.id,
        date: new Date('2025-01-16'),
        startTime: '14:00',
        endTime: '15:30',
        location: 'Art Studio',
      },
      {
        classId: artClass.id,
        date: new Date('2025-01-23'),
        startTime: '14:00',
        endTime: '15:30',
        location: 'Art Studio',
      },
      {
        classId: artClass.id,
        date: new Date('2025-01-30'),
        startTime: '14:00',
        endTime: '15:30',
        location: 'Art Studio',
      },
    ],
  });
  console.log('✅ Created 2 Published Classes with Sessions');

  // Create Registrations for children in classes
  const reg1 = await prisma.registration.create({
    data: {
      tenantId: tenant.id,
      userId: family.id,
      childId: child1.id,
      classId: bioClass.id,
      status: 'APPROVED',
    },
  });

  const reg2 = await prisma.registration.create({
    data: {
      tenantId: tenant.id,
      userId: family2.id,
      childId: child3.id,
      classId: artClass.id,
      status: 'APPROVED',
    },
  });
  console.log('✅ Created Class Registrations');

  // Create Sample Payments
  await prisma.payment.create({
    data: {
      tenant: { connect: { id: tenant.id } },
      user: { connect: { id: family.id } },
      registration: { connect: { id: reg1.id } },
      amount: 15000,
      status: 'SUCCEEDED',
    },
  });

  await prisma.payment.create({
    data: {
      tenant: { connect: { id: tenant.id } },
      user: { connect: { id: family2.id } },
      registration: { connect: { id: reg2.id } },
      amount: 12500,
      status: 'SUCCEEDED',
    },
  });
  console.log('✅ Created Sample Payments');

  // Create Published Event
  const event = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      title: 'Fall Festival & Harvest Celebration',
      description: 'Join us for a day of fun activities, games, and seasonal treats!',
      date: new Date('2025-10-15'),
      location: 'Main Pavilion',
      price: 25.00,
      capacity: 100,
      status: 'Published',
    },
  });
  console.log('✅ Created Published Event');

  // Create Main Co-op Chat
  const mainChat = await prisma.chat.create({
    data: {
      tenantId: tenant.id,
      name: 'General Discussion',
      isGeneral: true,
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatId: mainChat.id,
      userId: coopAdmin.id,
      content: 'Welcome to Oak Hollow Co-op! Feel free to introduce yourself.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatId: mainChat.id,
      userId: family.id,
      content: 'Hello everyone! Excited to be part of this community.',
    },
  });
  console.log('✅ Created Main Co-op Chat');

  // Create Class Chat
  const classChat = await prisma.chat.create({
    data: {
      tenantId: tenant.id,
      classId: bioClass.id,
      name: 'Biology 101 - Class Discussion',
      isGeneral: false,
    },
  });

  await prisma.chatMessage.create({
    data: {
      chatId: classChat.id,
      userId: instructor.id,
      content: 'Welcome to Biology 101! Please review the syllabus before our first session.',
    },
  });
  console.log('✅ Created Class Chat');

  // Create Fee Rules
  await prisma.feeRule.createMany({
    data: [
      {
        type: 'Platform Fee',
        value: '2.5%',
        effectiveDate: new Date('2024-01-01'),
        status: 'Active',
      },
      {
        type: 'Stripe Processing',
        value: '2.9% + $0.30',
        effectiveDate: new Date('2024-01-01'),
        status: 'Active',
      },
      {
        type: 'Instructor Payout Fee',
        value: '$2.00',
        effectiveDate: new Date('2024-06-01'),
        status: 'Active',
      },
    ],
  });
  console.log('✅ Created Fee Rules');

  // Create Global Email Templates
  await prisma.emailTemplate.createMany({
    data: [
      {
        key: 'platform_invite',
        name: 'Welcome to Bramble',
        subject: 'Welcome to {coop_name}',
        htmlContent: '<h1>Welcome, {first_name}!</h1><p>You have been invited to join <strong>{coop_name}</strong> on Bramble.</p>',
        textContent: 'Welcome, {first_name}! You have been invited to join {coop_name} on Bramble.',
        isGlobal: true,
      },
      {
        key: 'payout_summary',
        name: 'Weekly Payout Summary',
        subject: 'Your payout of {amount} is on the way',
        htmlContent: '<h2>Payout Scheduled</h2><p>Your payout of <strong>${amount}</strong> has been scheduled and will arrive soon.</p>',
        textContent: 'Your payout of ${amount} has been scheduled and will arrive soon.',
        isGlobal: true,
      },
      {
        key: 'admin_reg_alert',
        name: 'New Registration Alert',
        subject: 'New registration for {class_name}',
        htmlContent: '<p>A new student has registered for <strong>{class_name}</strong>.</p>',
        textContent: 'A new student has registered for {class_name}.',
        isGlobal: true,
      },
    ],
  });
  console.log('✅ Created Global Email Templates');

  // Create Sample Email Automations (skeleton)
  await prisma.emailAutomation.createMany({
    data: [
      {
        name: 'New Tenant Onboarding',
        trigger: 'TENANT_CREATED',
        status: 'Active',
        steps: JSON.stringify([
          { delay: 0, templateKey: 'platform_invite' },
          { delay: 24, templateKey: 'onboarding_step_2' },
          { delay: 72, templateKey: 'onboarding_complete' },
        ]),
      },
      {
        name: 'Instructor Welcome',
        trigger: 'INSTRUCTOR_ADDED',
        status: 'Active',
        steps: JSON.stringify([{ delay: 0, templateKey: 'instructor_welcome' }]),
      },
      {
        name: 'Failed Payment Recovery',
        trigger: 'PAYMENT_FAILED',
        status: 'Draft',
        steps: JSON.stringify([
          { delay: 24, templateKey: 'payment_failed_reminder' },
          { delay: 72, templateKey: 'payment_final_notice' },
        ]),
      },
    ],
  });
  console.log('✅ Created Email Automations');

  // Create Audit Log entries
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: operator.id,
        action: 'TENANT_CREATED',
        details: `Created new tenant: ${tenant.name}`,
        metadata: JSON.stringify({ tenantId: tenant.id }),
      },
      {
        tenantId: tenant.id,
        userId: coopAdmin.id,
        action: 'USER_LOGIN',
        details: 'Successful login',
        metadata: JSON.stringify({ role: 'COOP_ADMIN' }),
      },
      {
        userId: operator.id,
        action: 'FEE_RULE_CREATED',
        details: 'Created platform fee rule: 2.5%',
        metadata: JSON.stringify({ type: 'Platform Fee', value: '2.5%' }),
      },
    ],
  });
  console.log('✅ Created Audit Log Entries');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest Credentials (password is same for same role):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OPERATORS (password: operator123):');
  console.log('  • operator@bramble.co');
  console.log('  • admin@bramble.co');
  console.log('');
  console.log('CO-OP ADMINS (password: admin123):');
  console.log('  • admin@oakhollow.edu');
  console.log('  • director@oakhollow.edu');
  console.log('');
  console.log('INSTRUCTORS (password: instructor123):');
  console.log('  • jane.smith@oakhollow.edu');
  console.log('  • robert.wilson@oakhollow.edu');
  console.log('');
  console.log('FAMILIES (password: family123):');
  console.log('  • parent@example.com (Doe family - Emma & Liam)');
  console.log('  • martinez@example.com (Martinez family - Sofia & Diego)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
