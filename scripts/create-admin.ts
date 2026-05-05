/**
 * Create or update the dashboard admin user.
 *
 * Usage:
 *   npm run create-admin                                    # uses env vars
 *   npm run create-admin -- --email=foo@bar.de --password=geheim
 *   npm run create-admin -- --email=foo@bar.de              # prompts for password
 *
 * Reads from env when no flags are given:
 *   ADMIN_EMAIL    (default: admin@example.com)
 *   ADMIN_PASSWORD (no default – will refuse if missing)
 *   ADMIN_NAME     (default: Admin)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input, output, terminal: true });
  // Mute echo while typing the password
  const muted = (rl as unknown as { _writeToOutput: (s: string) => void });
  const original = muted._writeToOutput?.bind(muted);
  if (original) {
    muted._writeToOutput = (s: string) => {
      if (s.includes(question)) original(s);
      else original("");
    };
  }
  const value = await rl.question(question);
  rl.close();
  console.log();
  return value;
}

async function main() {
  const args = parseArgs(process.argv);

  const email = (args.email ?? process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const name = args.name ?? process.env.ADMIN_NAME ?? "Admin";
  let password = args.password ?? process.env.ADMIN_PASSWORD ?? "";

  if (!password) {
    password = await promptHidden(`Passwort für ${email}: `);
  }
  if (!password || password.length < 8) {
    console.error("❌ Passwort muss mindestens 8 Zeichen lang sein.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log(
    `✅ ${existing ? "Admin aktualisiert" : "Admin angelegt"}: ${user.email} (id ${user.id})`
  );
  console.log(`   → Login auf /login mit dieser E-Mail + dem gesetzten Passwort.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
