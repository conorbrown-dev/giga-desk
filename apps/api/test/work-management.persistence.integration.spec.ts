import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';

const localDatabaseUrl = 'postgresql://giga_desk:giga_desk@127.0.0.1:5442/giga_desk?schema=public';
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? localDatabaseUrl }) });
const projectKey = `GD${randomUUID().slice(0, 6).toUpperCase()}`;

const removeFixture = async (): Promise<void> => {
  await database.workItemDependency.deleteMany({ where: {
    OR: [
      { workItem: { project: { key: projectKey } } },
      { prerequisite: { project: { key: projectKey } } },
    ],
  } });
  await database.project.deleteMany({ where: { key: projectKey } });
};

beforeAll(removeFixture);

afterAll(async () => {
  await removeFixture();
  await database.$disconnect();
});

describe('work-management persistence', () => {
  it('persists hierarchy, criteria, dependencies, and immutable activity', async () => {
    const project = await database.project.create({ data: {
      key: projectKey, name: 'Giga Desk', description: 'Orchestrator', businessGoal: 'Ship work',
      workItems: { create: [{ type: 'Feature', title: 'Foundation', description: 'Build domain', criteria: {
        create: [{ text: 'Project persists' }],
      } }] },
    }, include: { workItems: true } });
    const feature = project.workItems[0];
    if (feature === undefined) throw new Error('Expected the nested feature to be persisted');

    const task = await database.workItem.create({ data: {
      projectId: project.id, parentId: feature.id, type: 'Task', title: 'Migration', description: 'Verify SQL',
      dependencies: { create: { prerequisiteId: feature.id } },
    } });
    await database.activity.create({ data: {
      projectId: project.id, workItemId: task.id, actorId: 'integration-test', eventType: 'WorkItemCreated', metadata: { title: task.title },
    } });

    const stored = await database.project.findUniqueOrThrow({ where: { id: project.id }, include: {
      activities: true, workItems: { include: { criteria: true, dependencies: true } },
    } });
    expect(stored.workItems).toHaveLength(2);
    expect(stored.workItems.flatMap((item) => item.criteria)).toHaveLength(1);
    expect(stored.workItems.flatMap((item) => item.dependencies)).toHaveLength(1);
    expect(stored.activities[0]?.metadata).toEqual({ title: 'Migration' });
  });
});
