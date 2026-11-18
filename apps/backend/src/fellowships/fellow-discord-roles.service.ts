import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fellowship } from '@/entities/fellowship.entity';
import { FellowshipStatus, FellowshipType } from '@/common/enum';
import { DiscordClient } from '@/discord-client/discord.client';

const FELLOW_ROLE_CONFIG_KEYS: Record<FellowshipType, string> = {
    [FellowshipType.DEVELOPER]: 'discord.roles.devFellow',
    [FellowshipType.EDUCATOR]: 'discord.roles.eduFellow',
    [FellowshipType.DESIGNER]: 'discord.roles.designFellow',
};

export interface FellowRoleSyncResult {
    granted: number;
    removed: number;
    failed: number;
    // Active fellows the bot could not find in the guild, so could not tag.
    notInGuild: number;
}

/**
 * Keeps the Discord fellow roles (dev-fellow, edu-fellows, design-fellow)
 * equal to the set of ACTIVE fellowships: an ACTIVE fellow holds the role of
 * their fellowship type, and every other guild member does not.
 *
 * The guild is the scope, not the app: anyone holding a fellow role without a
 * matching ACTIVE fellowship loses it, including roles granted by hand. That
 * is product policy (issue #46), so the app is the only source of truth.
 *
 * Desired state is recomputed from scratch on every run, so a failed or
 * skipped change is retried by the next run; nothing is persisted.
 */
@Injectable()
export class FellowDiscordRolesService {
    private readonly logger = new Logger(FellowDiscordRolesService.name);
    private readonly roleIdByType: Partial<Record<FellowshipType, string>>;

    constructor(
        @InjectRepository(Fellowship)
        private readonly fellowshipRepository: Repository<Fellowship>,
        private readonly discordClient: DiscordClient,
        configService: ConfigService,
    ) {
        this.roleIdByType = {};
        for (const type of Object.values(FellowshipType)) {
            const roleId = configService.get<string>(
                FELLOW_ROLE_CONFIG_KEYS[type],
            );
            if (roleId) {
                this.roleIdByType[type] = roleId;
            }
        }
    }

    async syncFellowRoles(): Promise<FellowRoleSyncResult> {
        const result: FellowRoleSyncResult = {
            granted: 0,
            removed: 0,
            failed: 0,
            notInGuild: 0,
        };

        const unconfigured = Object.values(FellowshipType).filter(
            (type) => !this.roleIdByType[type],
        );
        if (unconfigured.length > 0) {
            this.logger.warn(
                `No Discord fellow role configured for ${unconfigured.join(', ')}; not syncing ${
                    unconfigured.length === 1 ? 'it' : 'them'
                }`,
            );
        }
        if (unconfigured.length === Object.values(FellowshipType).length) {
            return result;
        }

        // roleId -> Discord user ids that should hold it.
        const holdersByRoleId = new Map<string, Set<string>>(
            Object.values(this.roleIdByType).map((roleId) => [
                roleId,
                new Set<string>(),
            ]),
        );
        const activeFellowships = await this.fellowshipRepository.find({
            where: { status: FellowshipStatus.ACTIVE },
            relations: { user: true },
        });
        for (const fellowship of activeFellowships) {
            const roleId = this.roleIdByType[fellowship.type];
            if (roleId) {
                holdersByRoleId.get(roleId)?.add(fellowship.user.discordUserId);
            }
        }

        // Listed before any change: if listing fails the run throws having
        // touched nothing, rather than removing roles off a partial picture.
        const members = await this.discordClient.listGuildMembers();
        const memberIds = new Set<string>();

        for (const member of members) {
            const discordUserId = member.user?.id;
            if (!discordUserId) continue;
            memberIds.add(discordUserId);

            for (const [roleId, holders] of holdersByRoleId) {
                const hasRole = member.roles.includes(roleId);
                const shouldHaveRole = holders.has(discordUserId);
                if (hasRole === shouldHaveRole) continue;

                try {
                    if (shouldHaveRole) {
                        await this.discordClient.attachRoleToMember(
                            discordUserId,
                            roleId,
                        );
                        result.granted++;
                    } else {
                        await this.discordClient.removeRoleFromMember(
                            discordUserId,
                            roleId,
                        );
                        result.removed++;
                    }
                } catch (error) {
                    result.failed++;
                    this.logger.warn(
                        `Failed to ${shouldHaveRole ? 'grant' : 'remove'} fellow role ${roleId} for Discord user ${discordUserId}: ${error?.message}`,
                    );
                }
            }
        }

        const missing = new Set<string>();
        for (const holders of holdersByRoleId.values()) {
            for (const discordUserId of holders) {
                if (!memberIds.has(discordUserId)) missing.add(discordUserId);
            }
        }
        result.notInGuild = missing.size;

        return result;
    }
}
