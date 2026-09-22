import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/token.js';

async function main() {
  console.log('🌱 Seeding permanent users into PostgreSQL...');

  const seedUsers = [
    {
      username: 'anant',
      email: 'anant@virexo.com',
      password: 'anant123',
      displayName: 'Anant',
    },
    {
      username: 'shubham',
      email: 'shubham@virexo.com',
      password: 'shubham123',
      displayName: 'Shubham',
    },
  ];

  const createdUsers = [];

  for (const u of seedUsers) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { username: u.username.toLowerCase() },
      update: {
        email: u.email.toLowerCase(),
        passwordHash,
        displayName: u.displayName,
        isEmailVerified: true,
      },
      create: {
        username: u.username.toLowerCase(),
        email: u.email.toLowerCase(),
        passwordHash,
        displayName: u.displayName,
        isEmailVerified: true,
        privacySettings: { readReceipts: 'everyone', showOnlineStatus: true, allowDirectMessages: 'everyone' },
        notificationSettings: { soundEnabled: true, desktopNotifications: true, emailNotifications: true },
      },
    });
    createdUsers.push(user);
    console.log(`  - User: ${user.username} (${user.email})`);
  }

  // Ensure DM exists between anant and shubham
  const [userA, userB] = createdUsers;
  const directKey = [userA.id, userB.id].sort().join(':');

  let conversation = await prisma.conversation.findFirst({
    where: { directKey }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'direct',
        directKey,
        members: {
          create: [
            { userId: userA.id, role: 'member' },
            { userId: userB.id, role: 'member' },
          ]
        }
      }
    });
    console.log(`  - Direct conversation created ID: ${conversation.id}`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
