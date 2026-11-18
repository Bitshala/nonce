import { ConfigService } from '@nestjs/config';
import { DiscordClient } from '@/discord-client/discord.client';
import { GuildMember } from '@/discord-client/response';

const config = {
    get: jest.fn().mockReturnValue('https://discord.example/api'),
    getOrThrow: jest.fn((key: string) =>
        key === 'app.baseUrl'
            ? 'http://localhost:3000'
            : key === 'app.auth.callbackPath'
              ? '/auth/discord/callback'
              : key === 'discord.guildId'
                ? 'guild-1'
                : 'secret',
    ),
} as unknown as ConfigService;

const member = (id: string): GuildMember => ({
    user: { id, username: `user-${id}` },
    roles: [],
});

describe('DiscordClient.listGuildMembers', () => {
    it('pages by the last user id until a short page comes back', async () => {
        const client = new DiscordClient(config);
        const fullPage = Array.from({ length: 1000 }, (_, i) =>
            member(String(i + 1)),
        );
        const request = jest
            .spyOn(client as any, 'executeRequest')
            .mockResolvedValueOnce(fullPage)
            .mockResolvedValueOnce([member('1001')]);

        const members = await client.listGuildMembers();

        expect(members).toHaveLength(1001);
        expect(request).toHaveBeenCalledTimes(2);
        expect(request.mock.calls[0][0]).toMatchObject({
            method: 'GET',
            url: '/guilds/guild-1/members',
            params: { limit: 1000, after: '0' },
        });
        expect(request.mock.calls[1][0]).toMatchObject({
            params: { limit: 1000, after: '1000' },
        });
    });

    it('stops after one request when the guild fits in a page', async () => {
        const client = new DiscordClient(config);
        const request = jest
            .spyOn(client as any, 'executeRequest')
            .mockResolvedValueOnce([member('1'), member('2')]);

        await expect(client.listGuildMembers()).resolves.toHaveLength(2);
        expect(request).toHaveBeenCalledTimes(1);
    });
});

describe('DiscordClient.removeRoleFromMember', () => {
    it('sends a bot-authenticated DELETE for the member role', async () => {
        const client = new DiscordClient(config);
        const request = jest
            .spyOn(client as any, 'executeRequest')
            .mockResolvedValueOnce(undefined);

        await client.removeRoleFromMember('user-1', 'role-1');

        expect(request).toHaveBeenCalledWith({
            method: 'DELETE',
            url: '/guilds/guild-1/members/user-1/roles/role-1',
            headers: { Authorization: 'Bot secret' },
        });
    });
});
