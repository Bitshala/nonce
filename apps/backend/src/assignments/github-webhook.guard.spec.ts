import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { GitHubWebhookGuard } from '@/assignments/github-webhook.guard';

// A forged workflow_run could mark any student's run as passing, so this guard
// is the only thing standing between an unauthenticated public route and the
// score table.
describe('GitHubWebhookGuard', () => {
    const secret = 'a'.repeat(32);
    const body = Buffer.from(JSON.stringify({ action: 'completed' }));

    const sign = (payload: Buffer, withSecret = secret) =>
        `sha256=${createHmac('sha256', withSecret).update(payload).digest('hex')}`;

    const buildGuard = (configured = secret) =>
        new GitHubWebhookGuard({
            get: () => configured,
        } as unknown as ConfigService);

    const buildContext = (request: unknown): ExecutionContext =>
        ({
            switchToHttp: () => ({ getRequest: () => request }),
        }) as unknown as ExecutionContext;

    it('accepts a correctly signed delivery', () => {
        const context = buildContext({
            headers: { 'x-hub-signature-256': sign(body) },
            rawBody: body,
        });

        expect(buildGuard().canActivate(context)).toBe(true);
    });

    it('rejects a signature computed with the wrong secret', () => {
        const context = buildContext({
            headers: { 'x-hub-signature-256': sign(body, 'wrong-secret') },
            rawBody: body,
        });

        expect(() => buildGuard().canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects when the body has been altered after signing', () => {
        const context = buildContext({
            headers: { 'x-hub-signature-256': sign(body) },
            rawBody: Buffer.from(JSON.stringify({ action: 'tampered' })),
        });

        expect(() => buildGuard().canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects a delivery with no signature at all', () => {
        const context = buildContext({ headers: {}, rawBody: body });

        expect(() => buildGuard().canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects a signature of a different length instead of crashing', () => {
        // timingSafeEqual throws on mismatched lengths, so the length check has
        // to come first or a short signature becomes a 500 rather than a 401.
        const context = buildContext({
            headers: { 'x-hub-signature-256': 'sha256=short' },
            rawBody: body,
        });

        expect(() => buildGuard().canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects when the raw body is missing', () => {
        // Signing covers the exact bytes GitHub sent; a re-serialised body can
        // never match, so this means rawBody was not enabled in main.ts.
        const context = buildContext({
            headers: { 'x-hub-signature-256': sign(body) },
            rawBody: undefined,
        });

        expect(() => buildGuard().canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });

    it('refuses every delivery when no secret is configured', () => {
        // Failing closed matters: an unset secret must not mean "accept all".
        const context = buildContext({
            headers: { 'x-hub-signature-256': sign(body) },
            rawBody: body,
        });

        expect(() => buildGuard('').canActivate(context)).toThrow(
            UnauthorizedException,
        );
    });
});
