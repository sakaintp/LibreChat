import { z } from 'zod';
import { skillBrowserFacts, skillServerFacts } from './skills';

const browser = z.discriminatedUnion('name', skillBrowserFacts);
const server = z.discriminatedUnion('name', skillServerFacts);

describe('skill product facts', () => {
  it('keeps catalog opens distinct from object opens', () => {
    const catalog = { name: 'librechat.skills.opened', feature: 'skills', entryPoint: 'route' };
    expect(browser.safeParse(catalog).success).toBe(true);
    expect(browser.safeParse({ ...catalog, skillId: 'skill-1' }).success).toBe(true);
    expect(server.safeParse(catalog).success).toBe(false);
  });

  it('requires persisted identity and rejects content on confirmed writes', () => {
    const added = {
      name: 'librechat.skills.added',
      feature: 'skills',
      skillId: 'skill-1',
      source: 'inline',
      version: 1,
    };
    expect(server.safeParse(added).success).toBe(true);
    expect(server.safeParse({ ...added, skillId: undefined }).success).toBe(false);
    expect(server.safeParse({ ...added, body: 'private instructions' }).success).toBe(false);
    expect(server.safeParse({ ...added, sourceMetadata: { token: 'secret' } }).success).toBe(false);
  });
});
