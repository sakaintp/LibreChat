import type {
  ProductPromptReference,
  TPromptGroup,
  TResolvedPromptResponse,
} from 'librechat-data-provider';

/** Keep the resolved revision identity, never the prompt content. */
export function getProductPromptReference(
  group: TPromptGroup | undefined,
  resolved?: TResolvedPromptResponse,
): ProductPromptReference | undefined {
  if (!group?._id) {
    return;
  }
  if (group.source === 'langfuse') {
    return resolved?.source === 'langfuse'
      ? { source: 'langfuse', groupId: group._id, version: resolved.version }
      : undefined;
  }
  const promptId = resolved?.source === 'native' ? resolved.promptId : group.productionId;
  return promptId ? { source: 'native', groupId: group._id, promptId } : undefined;
}
