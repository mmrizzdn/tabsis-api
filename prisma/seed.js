const bcrypt = require('bcrypt');
const prisma = require('../libs/prisma');

let main = async () => {
  console.log('Seeding started...');

  console.log('Seeding roles...');

  let superadminRole = await prisma.role.upsert({
    where: { name: 'Superadmin' },
    update: {},
    create: {
      name: 'Superadmin',
    },
  });

  await prisma.role.upsert({
    where: { name: 'Teacher' },
    update: {},
    create: {
      name: 'Teacher',
    },
  });

  await prisma.role.upsert({
    where: { name: 'Parent' },
    update: {},
    create: {
      name: 'Parent',
    },
  });

  console.log('Roles seeded');
  console.log('Seeding permissions...');

  const roles = [
    {
      name: 'Teacher',
      permissions: [
        { resource: 'student', action: 'read' },
        { resource: 'transaction', action: 'read' },
        { resource: 'transaction', action: 'update' },
        { resource: 'transaction', action: 'delete' },
        { resource: 'deposit', action: 'create' },
        { resource: 'withdrawal', action: 'approve' },
        { resource: 'parent', action: 'create' },
        { resource: 'parent', action: 'read' },
        { resource: 'parent', action: 'update' },
        { resource: 'parent', action: 'update' },
        { resource: 'parent', action: 'delete' },
        { resource: 'profile', action: 'read' },
        { resource: 'profile', action: 'update' },
        { resource: 'whatsapp-link', action: 'generate-transaction-receipt' },
      ],
    },
    {
      name: 'Parent',
      permissions: [
        { resource: 'student', action: 'read' },
        { resource: 'withdrawal', action: 'create' },
        { resource: 'transaction', action: 'read' },
        { resource: 'profile', action: 'read' },
        { resource: 'profile', action: 'update' },
        { resource: 'whatsapp-link', action: 'generate-withdrawal-request' },
      ],
    },
  ];

  for (let roleData of roles) {
    let role = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (!role) {
      console.warn(`Role ${roleData.name} not found, skipping permission seeding for this role`);
      continue;
    }

    for (let permData of roleData.permissions) {
      let permission = await prisma.permission.upsert({
        where: {
          resource_action: { resource: permData.resource, action: permData.action },
        },
        update: {},
        create: {
          resource: permData.resource,
          action: permData.action,
        },
      });

      try {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permission.id },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      } catch (e) {
        if (e && e.code) {
          let exists = await prisma.rolePermission.findUnique({
            where: {
              roleId_permissionId: { roleId: role.id, permissionId: permission.id },
            },
          });
          if (!exists) {
            await prisma.rolePermission.create({
              data: { roleId: role.id, permissionId: permission.id },
            });
          }
        } else {
          console.error('Failed to seed permission:', e);
        }
      }
    }
  }
  console.log('Permissions seeded');
  console.log('Seeding users...');

  let superadminPass = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { username: process.env.SUPERADMIN_USERNAME },
    update: {},
    create: {
      username: process.env.SUPERADMIN_USERNAME,
      email: process.env.SUPERADMIN_EMAIL,
      password: superadminPass,
      roleId: superadminRole.id,
      profile: { create: { name: 'Superadmin', phoneNumber: '6281234567890' } },
    },
  });

  for (let i = 1; i <= 6; i++) {
    await prisma.teacher.upsert({
      where: { grade: i },
      update: {},
      create: {
        grade: i,
      },
    });
  }

  console.log('User seeded');

  console.log('Seeding finished');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
