import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

const SIGNATURE_HEADER = 'x-hub-signature-256';

/**
 * Verifies that an inbound webhook really came from GitHub.
 *
 * The signature covers the *raw* body, so `NestFactory.create` must be given
 * `rawBody: true` — a re-serialised body will not match. Comparison is
 * constant-time; a forged `workflow_run` could otherwise mark any student's run
 * as passing.
 */
@Injectable()
export class GitHubWebhookGuard implements CanActivate {
    private readonly logger = new Logger(GitHubWebhookGuard.name);
    private readonly secret: string;

    constructor(configService: ConfigService) {
        this.secret =
            configService.get<string>('githubApp.webhookSecret') ?? '';
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<RawBodyRequest<Request>>();

        if (!this.secret) {
            this.logger.error(
                'githubApp.webhookSecret is not configured; rejecting webhook',
            );
            throw new UnauthorizedException('Webhooks are not configured');
        }

        const provided = request.headers[SIGNATURE_HEADER];
        if (typeof provided !== 'string') {
            throw new UnauthorizedException('Missing webhook signature');
        }

        const raw = request.rawBody;
        if (!raw) {
            this.logger.error(
                'Raw body unavailable; NestFactory.create needs { rawBody: true }',
            );
            throw new UnauthorizedException('Cannot verify webhook signature');
        }

        const expected = `sha256=${createHmac('sha256', this.secret)
            .update(raw)
            .digest('hex')}`;

        const providedBuffer = Buffer.from(provided, 'utf8');
        const expectedBuffer = Buffer.from(expected, 'utf8');
        // timingSafeEqual throws on a length mismatch, so check that first.
        if (
            providedBuffer.length !== expectedBuffer.length ||
            !timingSafeEqual(providedBuffer, expectedBuffer)
        ) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }
}
