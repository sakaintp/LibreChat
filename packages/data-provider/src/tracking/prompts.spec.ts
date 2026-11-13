import { z } from 'zod';
import { promptBrowserFacts, promptServerFacts } from './prompts';

const browser = z.discriminatedUnion('name', promptBrowserFacts);
const server = z.discriminatedUnion('name', promptServerFacts);

describe('prompt product facts', () => {
  const resolved = {
    name: 'librechat.prompts.resolved',
    feature: 'prompts',
    entryPoint: 'picker',
    variables: true,
  };

  it('requires the matching native or Langfuse revision identity', () => {
    expect(
      browser.safeParse({ ...resolved, prompt: { source: 'native', groupId: 'g', promptId: 'p' } })
        .success,
    ).toBe(true);
    expect(
      browser.safeParse({ ...resolved, prompt: { source: 'langfuse', groupId: 'g', version: 2 } })
        .success,
    ).toBe(true);
    expect(
      browser.safeParse({
        ...resolved,
        prompt: { source: 'langfuse', groupId: 'g', promptId: 'p' },
      }).success,
    ).toBe(false);
    expect(
      browser.safeParse({ ...resolved, prompt: { source: 'native', groupId: 'g' } }).success,
    ).toBe(false);
  });

  it('rejects content and confines resolution to browser observations', () => {
    const fact = { ...resolved, prompt: { source: 'native', groupId: 'g', promptId: 'p' } };
    expect(browser.safeParse({ ...fact, text: 'private prompt' }).success).toBe(false);
    expect(
      browser.safeParse({ ...fact, prompt: { ...fact.prompt, text: 'private prompt' } }).success,
    ).toBe(false);
    expect(server.safeParse(fact).success).toBe(false);
  });

  it.each(['initial', 'explicit', 'automatic'])(
    'accepts %s deployment without content',
    (deployment) => {
      expect(
        server.safeParse({
          name: 'librechat.prompts.deployed',
          feature: 'prompts',
          source: 'native',
          groupId: 'g',
          promptId: 'p',
          deployment,
        }).success,
      ).toBe(true);
    },
  );
});
