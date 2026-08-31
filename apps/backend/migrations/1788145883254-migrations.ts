import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds the `user.location` search index used by the admin user pool's city
// filter. Like the four columns swapped in 1787570617754, the filter is an
// ILIKE '%term%' whose leading wildcard rules out B-tree, so this is a pg_trgm
// GIN index. The entity declares it as a plain `@Index(['location'])` because
// TypeORM cannot express an operator class -- the name below is the one it
// generated, and its schema diff compares name, columns and uniqueness but
// never the access method, so writing the gin form here sticks. pg_trgm was
// already installed by 1787570617754.
export class Migrations1788145883254 implements MigrationInterface {
    name = 'Migrations1788145883254';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "IDX_af7cabf8e064aa7bad09c731ba" ON "user" USING gin ("location" gin_trgm_ops)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."IDX_af7cabf8e064aa7bad09c731ba"`,
        );
    }
}
