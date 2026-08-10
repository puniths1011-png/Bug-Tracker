import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User';
import Project from './src/models/Project';

dotenv.config();

const hash = async (plain: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const demoUsers = [
      { name: 'Olivia Stone', email: 'olivia@wizzytrack.io', role: 'admin' as const },
      { name: 'Ethan Cole', email: 'ethan@wizzytrack.io', role: 'developer' as const },
      { name: 'Maya Chen', email: 'maya@wizzytrack.io', role: 'tester' as const }
    ];

    const createdUsers: Record<string, any> = {};
    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          name: u.name,
          email: u.email,
          password: await hash('password123'),
          role: u.role,
          status: 'active'
        });
        console.log(`Created ${u.role} user: ${u.email} (password: password123)`);
      }
      createdUsers[u.role] = user;
    }

    const demoProjects = [
      { name: 'Storefront', key: 'STORE', description: 'Main e-commerce storefront' },
      { name: 'Mobile App', key: 'MOBL', description: 'iOS and Android companion app' }
    ];

    for (const p of demoProjects) {
      const existing = await Project.findOne({ name: p.name });
      if (!existing) {
        await Project.create({
          name: p.name,
          key: p.key,
          description: p.description,
          members: Object.values(createdUsers).map((u: any) => u._id),
          createdBy: createdUsers.admin?._id
        });
        console.log(`Created project: ${p.name}`);
      }
    }

    console.log('\nSeed complete. Demo logins (password: password123):');
    demoUsers.forEach(u => console.log(`  ${u.role.padEnd(10)} ${u.email}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
