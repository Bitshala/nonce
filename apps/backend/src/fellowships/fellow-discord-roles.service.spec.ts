import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { FellowDiscordRolesService } from '@/fellowships/fellow-discord-roles.service';
import { Fellowship } from '@/entities/fellowship.entity';
import { DiscordClient } from '@/discord-client/discord.client';
import { GuildMember } from '@/discord-client/response';
import { FellowshipStatus, FellowshipType } from '@/common/enum';

const DEV_ROLE = '111';
const EDU_ROLE = '222';
const DESIGN_ROLE = '333';
const COHORT_ROLE = '999';

const ALL_ROLES: Record<string, string> = {
    'discord.roles.devFellow': DEV_ROLE,
    'discord.roles.eduFellow': EDU_ROLE,
    'discord.roles.designFellow': DESIGN_ROLE,
};

const fellowship = (type: FellowshipType, discordUserId: string) =>
    ({ type, user: { discordUserId } }) as Fellowship;

const member = (id: string, roles: string[]): GuildMember => ({
    user: { id, username: `user-${id}` },
    roles,
});

describe('FellowDiscordRolesService.syncFellowRoles', () => {
    let fellowshipRepository: { find: jest.Mock };
    let discordClient: {
        listGuildMembers: jest.Mock;
        attachRoleToMember: jest.Mock;
        removeRoleFromMember: jest.Mock;
    };

    const build = (roles: Record<string, string> = ALL_ROLES) =>
        new FellowDiscordRolesService(
            fellowshipRepository as unknown as Repository<Fellowship>,
            discordClient as unknown as DiscordClient,
            { get: (key: string) => roles[key] } as unknown as ConfigService,
        );

    beforeEach(() => {
        fellowshipRepository = { find: jest.fn().mockResolvedValue([]) };
        discordClient = {
            listGuildMembers: jest.fn().mockResolvedValue([]),
            attachRoleToMember: jest.fn().mockResolvedValue(undefined),
            removeRoleFromMember: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('reads only ACTIVE fellowships', async () => {
        await build().syncFellowRoles();

        expect(fellowshipRepository.find).toHaveBeenCalledWith({
            where: { status: FellowshipStatus.ACTIVE },
            relations: { user: true },
        });
    });

    it('grants each active fellow the role for their fellowship type', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DEVELOPER, 'dev'),
            fellowship(FellowshipType.EDUCATOR, 'edu'),
            fellowship(FellowshipType.DESIGNER, 'design'),
        ]);
        discordClient.listGuildMembers.mockResolvedValue([
            member('dev', []),
            member('edu', [COHORT_ROLE]),
            member('design', []),
        ]);

        const result = await build().syncFellowRoles();

        expect(discordClient.attachRoleToMember.mock.calls).toEqual([
            ['dev', DEV_ROLE],
            ['edu', EDU_ROLE],
            ['design', DESIGN_ROLE],
        ]);
        expect(discordClient.removeRoleFromMember).not.toHaveBeenCalled();
        expect(result).toEqual({
            granted: 3,
            removed: 0,
            failed: 0,
            notInGuild: 0,
        });
    });

    it('removes fellow roles from anyone without a matching active fellowship, including hand-granted ones', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DEVELOPER, 'dev'),
        ]);
        discordClient.listGuildMembers.mockResolvedValue([
            // Active developer who also holds a stale designer role.
            member('dev', [DEV_ROLE, DESIGN_ROLE]),
            // Never had a fellowship in the app; role given by hand.
            member('manual', [EDU_ROLE, COHORT_ROLE]),
        ]);

        const result = await build().syncFellowRoles();

        expect(discordClient.attachRoleToMember).not.toHaveBeenCalled();
        expect(discordClient.removeRoleFromMember.mock.calls).toEqual([
            ['dev', DESIGN_ROLE],
            ['manual', EDU_ROLE],
        ]);
        expect(result.removed).toBe(2);
    });

    it('never touches roles other than the fellow roles', async () => {
        discordClient.listGuildMembers.mockResolvedValue([
            member('student', [COHORT_ROLE]),
        ]);

        await build().syncFellowRoles();

        expect(discordClient.attachRoleToMember).not.toHaveBeenCalled();
        expect(discordClient.removeRoleFromMember).not.toHaveBeenCalled();
    });

    it('leaves an unconfigured role alone, holders included', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DESIGNER, 'design'),
        ]);
        discordClient.listGuildMembers.mockResolvedValue([
            member('design', []),
            member('old-dev', [DEV_ROLE]),
        ]);

        const result = await build({
            'discord.roles.devFellow': DEV_ROLE,
        }).syncFellowRoles();

        // Designer role unset: no grant. Dev role set: stale holder removed.
        expect(discordClient.attachRoleToMember).not.toHaveBeenCalled();
        expect(discordClient.removeRoleFromMember.mock.calls).toEqual([
            ['old-dev', DEV_ROLE],
        ]);
        expect(result.removed).toBe(1);
    });

    it('does nothing, not even reading Discord, when no fellow role is configured', async () => {
        const result = await build({}).syncFellowRoles();

        expect(fellowshipRepository.find).not.toHaveBeenCalled();
        expect(discordClient.listGuildMembers).not.toHaveBeenCalled();
        expect(result).toEqual({
            granted: 0,
            removed: 0,
            failed: 0,
            notInGuild: 0,
        });
    });

    it('changes nothing when the member list cannot be read', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DEVELOPER, 'dev'),
        ]);
        discordClient.listGuildMembers.mockRejectedValue(
            new Error('Missing Access'),
        );

        await expect(build().syncFellowRoles()).rejects.toThrow(
            'Missing Access',
        );
        expect(discordClient.attachRoleToMember).not.toHaveBeenCalled();
        expect(discordClient.removeRoleFromMember).not.toHaveBeenCalled();
    });

    it('keeps going past a failed change and counts it', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DEVELOPER, 'a'),
            fellowship(FellowshipType.DEVELOPER, 'b'),
        ]);
        discordClient.listGuildMembers.mockResolvedValue([
            member('a', []),
            member('b', []),
        ]);
        discordClient.attachRoleToMember
            .mockRejectedValueOnce(new Error('rate limited'))
            .mockResolvedValueOnce(undefined);

        const result = await build().syncFellowRoles();

        expect(discordClient.attachRoleToMember).toHaveBeenCalledTimes(2);
        expect(result).toMatchObject({ granted: 1, failed: 1 });
    });

    it('counts active fellows who are not in the guild, once each', async () => {
        fellowshipRepository.find.mockResolvedValue([
            fellowship(FellowshipType.DEVELOPER, 'gone'),
            fellowship(FellowshipType.EDUCATOR, 'gone'),
            fellowship(FellowshipType.DESIGNER, 'here'),
        ]);
        discordClient.listGuildMembers.mockResolvedValue([
            member('here', [DESIGN_ROLE]),
        ]);

        const result = await build().syncFellowRoles();

        expect(result).toEqual({
            granted: 0,
            removed: 0,
            failed: 0,
            notInGuild: 1,
        });
    });
});
