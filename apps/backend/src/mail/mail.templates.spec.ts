import { join } from 'path';
import { Eta } from 'eta';
import { MailTemplate } from '@/mail/mail.enum';

// Every template is dark by design. Clients with forced dark mode re-transform
// emails that don't declare a color scheme, so each one must declare dark-only
// and carry bgcolor attributes next to its inline backgrounds.
describe('mail templates — dark scheme declaration', () => {
    // same options as MailService; the Eta types are not usable here either
    const eta: any = new (Eta as any)({
        views: join(__dirname, '..', '..', 'assets', 'mail-templates'),
    });

    // templates only interpolate `it.<field>`, so any string will do
    const context = new Proxy({}, { get: () => 'x' });

    it.each(Object.values(MailTemplate))('%s', (template) => {
        const html: string = eta.render(`${template}.html.eta`, context);

        expect(html).toContain('<meta name="color-scheme" content="dark" />');
        expect(html).toContain(
            '<meta name="supported-color-schemes" content="dark" />',
        );
        expect(html).toContain('color-scheme: dark');

        const tagsMissingBgcolor = (
            html.match(/<(?:body|table|td|th)\b[^>]*>/g) ?? []
        ).filter(
            (tag) =>
                tag.includes('background-color:') && !tag.includes('bgcolor='),
        );
        expect(tagsMissingBgcolor).toEqual([]);
    });
});
