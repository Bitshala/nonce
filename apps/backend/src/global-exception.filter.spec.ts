import {
    ArgumentsHost,
    ConflictException,
    InternalServerErrorException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '@/global-exception.filter';
import { DiscordAlertService } from '@/common/discord-alert.service';

// What reaches the client is the contract the frontend codes against, so these
// assert on the body and status the adapter is asked to send.
describe('AllExceptionsFilter', () => {
    const reply = jest.fn();
    const filter = new AllExceptionsFilter(
        {
            httpAdapter: { reply, isHeadersSent: () => false },
        } as unknown as HttpAdapterHost,
        {
            sendErrorAlert: jest.fn(async () => undefined),
        } as unknown as DiscordAlertService,
    );
    const host = {
        switchToHttp: () => ({
            getRequest: () => ({ method: 'POST', url: '/x' }),
        }),
        getArgByIndex: () => ({}),
    } as unknown as ArgumentsHost;

    const sent = () => {
        const [, body, status] = reply.mock.calls[0] as [
            unknown,
            Record<string, unknown>,
            number,
        ];
        return { body, status };
    };

    afterEach(() => jest.clearAllMocks());

    it("sends a save conflict's details as they were thrown", () => {
        // The editor reads these to show what changed under it.
        const conflict = {
            currentCommitSha: 'b'.repeat(40),
            baseCommitSha: 'a'.repeat(40),
            changedPaths: ['README.md'],
        };

        filter.catch(new ConflictException(conflict), host);

        expect(sent()).toEqual({ status: 409, body: conflict });
    });

    it("sends a save's rejected paths as they were thrown", () => {
        const rejected = {
            message: 'One or more paths were rejected',
            violations: [{ path: 'test', reason: 'protected' }],
        };

        filter.catch(new UnprocessableEntityException(rejected), host);

        expect(sent()).toEqual({ status: 422, body: rejected });
    });

    it('still normalises a 4xx thrown with a plain message', () => {
        filter.catch(new ConflictException('Not ready yet'), host);

        expect(sent()).toEqual({
            status: 409,
            body: expect.objectContaining({
                status: 409,
                message: 'Not ready yet',
                errorId: expect.any(String),
            }),
        });
    });

    it('never passes a 5xx body through', () => {
        filter.catch(
            new InternalServerErrorException({ secret: 'stack details' }),
            host,
        );

        const { body, status } = sent();
        expect(status).toBe(500);
        expect(body).not.toHaveProperty('secret');
    });
});
