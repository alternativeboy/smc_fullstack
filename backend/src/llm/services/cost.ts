// Pricing per docs/prompt_spec.md §5 (CLAUDE.md §3 rule 8): gpt-4o
// $2.50 / 1M input tokens, $10.00 / 1M output tokens.
const INPUT_COST_PER_TOKEN = 2.5 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 10 / 1_000_000;

export function calculateCost(promptTokens: number, completionTokens: number): number {
  return promptTokens * INPUT_COST_PER_TOKEN + completionTokens * OUTPUT_COST_PER_TOKEN;
}
