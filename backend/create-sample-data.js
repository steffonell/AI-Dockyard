const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    // Create a company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company'
      }
    });
    console.log('Created company:', company);

    // Create a tracker
    const tracker = await prisma.tracker.create({
      data: {
        companyId: company.id,
        type: 'jira',
        baseUrl: 'https://test.atlassian.net',
        authJson: { type: 'test' }
      }
    });
    console.log('Created tracker:', tracker);

    // Create some sample issues
    const issues = await Promise.all([
      prisma.issue.create({
        data: {
          trackerId: tracker.id,
          extKey: 'TEST-1',
          title: 'Sample Issue 1',
          description: 'This is a sample issue for testing',
          status: 'open',
          payloadJson: { source: 'sample' }
        }
      }),
      prisma.issue.create({
        data: {
          trackerId: tracker.id,
          extKey: 'TEST-2',
          title: 'Sample Issue 2',
          description: 'Another sample issue',
          status: 'in_progress',
          payloadJson: { source: 'sample' }
        }
      }),
      prisma.issue.create({
        data: {
          trackerId: tracker.id,
          extKey: 'TEST-3',
          title: 'Sample Issue 3',
          description: 'Third sample issue',
          status: 'done',
          payloadJson: { source: 'sample' }
        }
      })
    ]);

    console.log('Created issues:', issues);
    console.log('Sample data created successfully!');
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData(); 