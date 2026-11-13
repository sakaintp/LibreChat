import { z } from 'zod';
import { chatBrowserFacts, chatServerFacts } from './chat';

const browser = z.discriminatedUnion('name', chatBrowserFacts);
const server = z.discriminatedUnion('name', chatServerFacts);

describe('chat facts', () => {
  it('requires explicit submission identity and kind', () => {
    const fact = {
      name: 'librechat.chat.message.submitted',
      feature: 'chat',
      submissionId: 'aef33490-7e1a-4786-9ac6-d45dd28ca281',
      kind: 'retry',
    };
    expect(browser.safeParse(fact).success).toBe(true);
    expect(browser.safeParse({ ...fact, submissionId: undefined }).success).toBe(false);
    expect(browser.safeParse({ ...fact, text: 'private prompt' }).success).toBe(false);
  });
  it('preserves unknown usage separately from zero and rejects payload content', () => {
    const fact = {
      name: 'librechat.chat.model.usage.recorded',
      feature: 'chat',
      callId: 'call',
      outcome: 'completed',
    };
    expect(server.parse(fact)).not.toHaveProperty('input_tokens');
    expect(server.safeParse({ ...fact, input_tokens: 0 }).success).toBe(true);
    expect(server.safeParse({ ...fact, input_tokens: -1 }).success).toBe(false);
    expect(server.safeParse({ ...fact, completion: 'private' }).success).toBe(false);
  });
  it('keeps server outcomes off the browser contract', () => {
    expect(
      browser.safeParse({
        name: 'librechat.chat.response.finished',
        feature: 'chat',
        runId: 'run',
        outcome: 'completed',
        durationMs: 1,
      }).success,
    ).toBe(false);
  });
});
