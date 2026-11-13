import { createSkillSyncTracking } from './tracking';

describe('system skill sync tracking', () => {
  it('reports an unchanged run without emitting per-skill events or user/session identity', () => {
    const track = jest.fn();
    const tracking = createSkillSyncTracking(track, { id: 'private source', tenantId: 'tenant-1' });
    tracking.unchanged();
    tracking.unchanged();
    tracking.finish('succeeded', { skippedSkillCount: 0, skippedFileCount: 0 });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'librechat.skills.sync.finished',
        status: 'succeeded',
        unchanged: true,
        unchangedSkillCount: 2,
        changedSkillCount: 0,
        sourceId: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      { actor: 'system', tenantId: 'tenant-1' },
    );
    expect(JSON.stringify(track.mock.calls)).not.toContain('private source');
  });

  it('keeps changes from a partial run connected to its summary', () => {
    const track = jest.fn();
    const tracking = createSkillSyncTracking(track, { id: 'source' });
    tracking.changed('skill-1', 'updated', 3);
    tracking.changed('skill-2', 'removed', 1);
    tracking.finish('partial', { skippedSkillCount: 1, skippedFileCount: 2 });

    const [updated, removed, summary] = track.mock.calls.map(([fact]) => fact);
    expect(updated.syncRunId).toBe(summary.syncRunId);
    expect(removed.syncRunId).toBe(summary.syncRunId);
    expect(summary).toMatchObject({
      status: 'partial',
      unchanged: false,
      changedSkillCount: 1,
      deletedSkillCount: 1,
      skippedSkillCount: 1,
      skippedFileCount: 2,
    });
  });

  it('isolates rejected host delivery from sync', async () => {
    const tracking = createSkillSyncTracking(() => Promise.reject(new Error('offline')), {
      id: 'source',
    });
    expect(() => tracking.changed('skill-1', 'added')).not.toThrow();
    expect(() =>
      tracking.finish('failed', { skippedSkillCount: 1, skippedFileCount: 0 }),
    ).not.toThrow();
    await Promise.resolve();
  });
});
