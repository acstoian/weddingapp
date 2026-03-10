import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    // Drop FK constraint and subscriptions table
    await sql`ALTER TABLE IF EXISTS subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_users_id_fk`;
    console.log("Dropped FK constraint");

    await sql`DROP TABLE IF EXISTS subscriptions`;
    console.log("Dropped subscriptions table");

    // Add stripe_customer_id to users
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text`;
    console.log("Added stripe_customer_id to users");

    // Create stripe_events table
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        stripe_event_id text NOT NULL,
        event_type text NOT NULL,
        user_id text,
        processed_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT stripe_events_stripe_event_id_unique UNIQUE(stripe_event_id)
      )
    `;
    console.log("Created stripe_events table");

    // Verify
    const colCheck = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id'`;
    console.log("Verify users.stripe_customer_id:", colCheck.length > 0 ? "EXISTS" : "MISSING");

    const eventsCheck = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'stripe_events'`;
    console.log("Verify stripe_events table:", eventsCheck.length > 0 ? "EXISTS" : "MISSING");

    const subCheck = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'subscriptions'`;
    console.log("Verify subscriptions table:", subCheck.length > 0 ? "STILL EXISTS" : "DROPPED");

    console.log("Migration complete!");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

run();
