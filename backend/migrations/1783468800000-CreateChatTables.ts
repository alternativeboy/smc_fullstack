import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates conversations, messages, audit_logs exactly per erd.md §§2/3/5.
 * - conversations.user_id → users(id) ON DELETE CASCADE
 * - messages.conversation_id → conversations(id) ON DELETE CASCADE
 * - audit_logs.user_id → users(id) ON DELETE SET NULL (audit rows are retained)
 * Native gen_random_uuid() (PG15) for UUID defaults; numeric(10,6) for cost.
 */
export class CreateChatTables1783468800000 implements MigrationInterface {
  name = 'CreateChatTables1783468800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id"         uuid          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    uuid          NOT NULL,
        "title"      character varying(255) NOT NULL DEFAULT 'New Chat',
        "created_at" TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_user_id" ON "conversations" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_updated_at" ON "conversations" ("updated_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id"                uuid          NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id"   uuid          NOT NULL,
        "role"              character varying(20) NOT NULL,
        "content"           text,
        "tool_calls"        jsonb,
        "tool_results"      jsonb,
        "prompt_tokens"     integer       NOT NULL DEFAULT 0,
        "completion_tokens" integer       NOT NULL DEFAULT 0,
        "cost"              numeric(10,6) NOT NULL DEFAULT 0,
        "is_partial"        boolean       NOT NULL DEFAULT false,
        "created_at"        TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id")
          REFERENCES "conversations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     uuid,
        "action"      character varying(50) NOT NULL,
        "resource"    character varying(50) NOT NULL,
        "metadata"    jsonb,
        "ip_address"  character varying(45),
        "duration_ms" integer,
        "status_code" integer,
        "created_at"  TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_user_id" ON "audit_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_created_at" ON "audit_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
