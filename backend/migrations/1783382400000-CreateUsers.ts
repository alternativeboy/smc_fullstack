import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `users` table exactly per erd.md §1. UUID default via native
 * gen_random_uuid() (core in PostgreSQL 15 — no extension needed). Uniqueness on
 * email is enforced by the idx_users_email unique index.
 */
export class CreateUsers1783382400000 implements MigrationInterface {
  name = 'CreateUsers1783382400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid          NOT NULL DEFAULT gen_random_uuid(),
        "email"         character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "display_name"  character varying(100) NOT NULL,
        "created_at"    TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMP,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
