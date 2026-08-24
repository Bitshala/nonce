import { MigrationInterface, QueryRunner } from 'typeorm';

// Recreates the four `user` search indexes from the previous migration as pg_trgm
// GIN indexes. They are declared as plain `@Index` on the entity because TypeORM
// cannot express an operator class, so the previous migration emits them as btree
// and this one swaps them — keeping TypeORM's generated names so `migration:generate`
// stays quiet (its diff compares name, columns and uniqueness, never the access
// method). Split out because CREATE EXTENSION needs superuser / rds_superuser.
export class Migrations1787570617754 implements MigrationInterface {
    name = 'Migrations1787570617754';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

        await queryRunner.query(
            `DROP INDEX "public"."IDX_065d4d8f3b5adb4a08841eae3c"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "user" USING gin ("name" gin_trgm_ops)`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" USING gin ("email" gin_trgm_ops)`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_a09bffa83e18bd1fc46fc1c60f"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a09bffa83e18bd1fc46fc1c60f" ON "user" USING gin ("discordUserName" gin_trgm_ops)`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_fef0dc4d49315c7f8052c5c129"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_fef0dc4d49315c7f8052c5c129" ON "user" USING gin ("discordGlobalName" gin_trgm_ops)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."IDX_fef0dc4d49315c7f8052c5c129"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_fef0dc4d49315c7f8052c5c129" ON "user" ("discordGlobalName")`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_a09bffa83e18bd1fc46fc1c60f"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a09bffa83e18bd1fc46fc1c60f" ON "user" ("discordUserName")`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email")`,
        );

        await queryRunner.query(
            `DROP INDEX "public"."IDX_065d4d8f3b5adb4a08841eae3c"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "user" ("name")`,
        );
        // The extension is left in place: dropping it would invalidate any other
        // trigram index and it is harmless when unused.
    }
}
