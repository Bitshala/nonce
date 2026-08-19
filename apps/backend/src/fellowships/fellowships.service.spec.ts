import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FellowshipsService } from '@/fellowships/fellowships.service';
import { Fellowship } from '@/entities/fellowship.entity';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { FellowshipStatus } from '@/common/enum';

// Covers startContract's endDate handling: the submitted endDate must be
// after startDate, cannot be more than 24 months from today, and (now that
// the backend no longer derives it from a duration) the submitted endDate is
// what gets persisted verbatim.
describe('FellowshipsService — startContract', () => {
    let service: FellowshipsService;

    const fellowship = {
        id: 'fellowship-1',
        status: FellowshipStatus.DOCUMENTS_APPROVED,
        user: { id: 'user-1', displayName: 'Alice', location: 'Remote' },
        application: {
            id: 'app-1',
            mentorContact: 'mentor',
            projectName: 'Project',
            github: 'alice',
        },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
    };

    const manager = {
        findOne: jest.fn(),
        update: jest.fn(),
    };

    const dbTransactionService = {
        execute: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
            fn(manager as unknown as EntityManager),
        ),
    };

    const fellowshipRepository = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FellowshipsService,
                {
                    provide: getRepositoryToken(Fellowship),
                    useValue: fellowshipRepository,
                },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
            ],
        }).compile();

        service = module.get(FellowshipsService);

        dbTransactionService.execute.mockImplementation(
            (fn: (m: EntityManager) => Promise<unknown>) =>
                fn(manager as unknown as EntityManager),
        );
        fellowshipRepository.findOne.mockResolvedValue({ ...fellowship });
        manager.findOne.mockResolvedValue({ ...fellowship });
    });

    afterEach(() => jest.resetAllMocks());

    it('rejects an endDate that is not after startDate', async () => {
        await expect(
            service.startContract('fellowship-1', {
                startDate: '2026-01-01',
                endDate: '2026-01-01',
                amountUsd: 500,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.update).not.toHaveBeenCalled();
    });

    it('rejects an endDate more than 24 months from today', async () => {
        const start = new Date();
        const tooFar = new Date();
        tooFar.setUTCMonth(tooFar.getUTCMonth() + 25);
        await expect(
            service.startContract('fellowship-1', {
                startDate: start.toISOString().slice(0, 10),
                endDate: tooFar.toISOString().slice(0, 10),
                amountUsd: 500,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.update).not.toHaveBeenCalled();
    });

    it('persists the submitted startDate/endDate verbatim', async () => {
        await service.startContract('fellowship-1', {
            startDate: '2026-01-01',
            endDate: '2026-07-15',
            amountUsd: 500,
        });

        expect(manager.update).toHaveBeenCalledWith(
            Fellowship,
            'fellowship-1',
            expect.objectContaining({
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-07-15'),
                status: FellowshipStatus.ACTIVE,
            }),
        );
    });
});
