import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1789000000000 implements MigrationInterface {
    name = 'Migrations1789000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "assignment" ALTER COLUMN "protectedPaths" SET DEFAULT '[".github/**", "test/**", "jest.config.ts", "tsconfig.json", "package.json", "package-lock.json"]'`,
        );
        await queryRunner.query(
            `UPDATE "assignment" SET "protectedPaths" = '[".github/**", "test/**", "jest.config.ts", "tsconfig.json", "package.json", "package-lock.json"]' WHERE "protectedPaths" = '[".github/**"]'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "assignment" SET "protectedPaths" = '[".github/**"]' WHERE "protectedPaths" = '[".github/**", "test/**", "jest.config.ts", "tsconfig.json", "package.json", "package-lock.json"]'`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment" ALTER COLUMN "protectedPaths" SET DEFAULT '[".github/**"]'`,
        );
    }
}
