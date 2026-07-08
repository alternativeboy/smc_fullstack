/* eslint-disable no-console */
/**
 * Phase 4b.3 driver — runs the S1/S2 grounding scenarios against a RUNNING
 * server (npm run start:dev) using the real OpenAI API. Prints a transcript
 * (prompt → generated SQL → rows → final answer → cost) per scenario.
 *
 * Usage (with the docker stack up, a real OPENAI_API_KEY, and the server running):
 *   npx ts-node scripts/live-grounding.ts
 *   API_URL=http://localhost:3000 npx ts-node scripts/live-grounding.ts
 *
 * Switch models by setting OPENAI_MODEL in .env and restarting the server
 * (gpt-4o-mini to iterate, gpt-4o for the final pass).
 */
const API = process.env.API_URL ?? 'http://localhost:3000';

const SCENARIOS: { label: string; prompt: string }[] = [
  { label: 'S1 single value', prompt: "What was Apple's net income in 2023?" },
  { label: 'S1 table', prompt: 'Compare the revenue of all technology companies in 2024, sorted by highest revenue.' },
  { label: 'S2 unknown company', prompt: "What was Toyota's revenue last year?" },
  { label: 'S2 out-of-range year', prompt: "What was Apple's revenue in 2020?" },
  { label: 'S2 unavailable metric', prompt: "What is Apple's EBITDA?" },
  { label: 'missing-year (Shopify 2022)', prompt: "What was Shopify's revenue in 2022?" },
];

async function main() {
  const email = `live_${Date.now()}@example.com`;
  const password = 'password123';

  const reg = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: 'Live Check' }),
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.status} ${await reg.text()}`);
  const token: string = (await reg.json()).accessToken;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  let totalCost = 0;

  for (const sc of SCENARIOS) {
    const conv = await fetch(`${API}/api/conversations`, { method: 'POST', headers: auth });
    const conversationId: string = (await conv.json()).id;

    const res = await fetch(`${API}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ content: sc.prompt }),
    });

    const sqls: string[] = [];
    let rowsPreview = '';
    let answer = '';
    let usage: any = null;
    let errored = '';

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const evLine = frame.split('\n').find((l) => l.startsWith('event: '));
        const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
        if (!evLine || !dataLine) continue;
        const type = evLine.slice(7).trim();
        const data = JSON.parse(dataLine.slice(6));
        if (type === 'tool_call') sqls.push(data.arguments);
        if (type === 'tool_result') rowsPreview = JSON.stringify(data.rows).slice(0, 400);
        if (type === 'token') answer += data.content;
        if (type === 'usage') usage = data;
        if (type === 'error') errored = data.message;
      }
    }

    if (usage?.cost) totalCost += usage.cost;

    console.log('\n' + '='.repeat(72));
    console.log(`▶ ${sc.label}`);
    console.log(`  prompt : ${sc.prompt}`);
    console.log(`  SQL    : ${sqls.length ? sqls.join(' | ') : '(none)'}`);
    console.log(`  rows   : ${rowsPreview || '(none)'}`);
    console.log(`  answer : ${errored ? `[error] ${errored}` : answer.trim() || '(empty)'}`);
    console.log(`  usage  : prompt=${usage?.promptTokens} completion=${usage?.completionTokens} cost=$${usage?.cost?.toFixed(6)}`);
  }

  console.log('\n' + '='.repeat(72));
  console.log(`MODEL: set via OPENAI_MODEL in .env (check the server log at boot)`);
  console.log(`TOTAL COST THIS RUN: $${totalCost.toFixed(6)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
