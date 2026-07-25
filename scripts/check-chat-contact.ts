/**
 * Exercises the chat contact extraction against the shapes customers actually
 * send. There's no test runner in this repo, so this is the proof:
 *   npx tsx scripts/check-chat-contact.ts
 * Exits non-zero on the first mismatch.
 */

import { extractContact } from "../src/lib/chatContact";

type Case = {
  name: string;
  messages: { role: string; content: string }[];
  expect: { firstName: string | null; lastName: string | null; phone: string | null; email: string | null };
};

const u = (content: string) => ({ role: "user", content });
const a = (content: string) => ({ role: "assistant", content });

const CASES: Case[] = [
  {
    // Ryan's exact scenario: the trigger fires on the opener, the details
    // arrive in the NEXT message. Reading only the last message lost the name.
    name: "details arrive after the opening financing question",
    messages: [
      u("I'd like to get pre-approved for financing."),
      a("I can get that started — what's your name, best phone, email, and which vehicle?"),
      u("Mee Maw, 757-555-0134, meemaw@gmail.com, the Acura MDX"),
    ],
    expect: { firstName: "Mee", lastName: "Maw", phone: "757-555-0134", email: "meemaw@gmail.com" },
  },
  {
    name: "my name is",
    messages: [u("my name is Dawn Reed and my number is (757) 555-0199")],
    expect: { firstName: "Dawn", lastName: "Reed", phone: "(757) 555-0199", email: null },
  },
  {
    name: "name on its own line before the digits",
    messages: [u("Bernard Browder\n17578144549\nteambrowder1@msn.com")],
    expect: { firstName: "Bernard", lastName: "Browder", phone: "17578144549", email: "teambrowder1@msn.com" },
  },
  {
    name: "no name given — stays null rather than guessing",
    messages: [u("I'd like to get pre-approved for financing.")],
    expect: { firstName: null, lastName: null, phone: null, email: null },
  },
  {
    // The trap: "I'm interested in the Camry" must not produce "Interested".
    name: "I'm + a non-name is rejected",
    messages: [u("I'm interested in the Camry, call me at 7575550111")],
    expect: { firstName: null, lastName: null, phone: "7575550111", email: null },
  },
  {
    name: "email only",
    messages: [u("financing please"), u("ryan@rydetimeauto.com")],
    expect: { firstName: null, lastName: null, phone: null, email: "ryan@rydetimeauto.com" },
  },
];

let failures = 0;
for (const c of CASES) {
  const got = extractContact(c.messages);
  const keys = ["firstName", "lastName", "phone", "email"] as const;
  const bad = keys.filter((k) => got[k] !== c.expect[k]);
  if (bad.length === 0) {
    console.log(`  PASS  ${c.name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${c.name}`);
    for (const k of bad) console.log(`          ${k}: got ${JSON.stringify(got[k])}, expected ${JSON.stringify(c.expect[k])}`);
  }
}

console.log(failures === 0 ? `\nAll ${CASES.length} cases pass.` : `\n${failures} of ${CASES.length} failed.`);
process.exit(failures === 0 ? 0 : 1);
