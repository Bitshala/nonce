import { readFileSync } from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";

function aliceLnCli(command: string): any {
    const result = execSync(`docker exec alice lightning-cli --network=regtest ${command}`, {
        encoding: 'utf-8'
    });
    return JSON.parse(result);
}

function bobLnCli(command: string): any {
    const result = execSync(`docker exec bob lightning-cli --network=regtest ${command}`, {
        encoding: 'utf-8'
    });
    return JSON.parse(result);
}

function carolLnCli(command: string): any {
    const result = execSync(`docker exec carol lightning-cli --network=regtest ${command}`, {
        encoding: 'utf-8'
    });
    return JSON.parse(result);
}

describe('Evaluate submission', () => {
    let paymentHash: string;
    let bolt11: string;
    let paymentPreimage: string;
    let aliceBobBeforeLocal: number;
    let aliceBobAfterLocal: number;
    let bobCarolBeforeLocal: number;
    let bobCarolAfterLocal: number;
    let carolAliceBeforeLocal: number;
    let carolAliceAfterLocal: number;

    it('should read and parse out.txt', () => {
        const lines = readFileSync('out.txt', 'utf-8').trim().split('\n');
        expect(lines).toHaveLength(9);

        paymentHash = lines[0].trim();
        paymentPreimage = lines[1].trim();
        bolt11 = lines[2].trim();
        aliceBobBeforeLocal = parseInt(lines[3].trim(), 10);
        aliceBobAfterLocal = parseInt(lines[4].trim(), 10);
        bobCarolBeforeLocal = parseInt(lines[5].trim(), 10);
        bobCarolAfterLocal = parseInt(lines[6].trim(), 10);
        carolAliceBeforeLocal = parseInt(lines[7].trim(), 10);
        carolAliceAfterLocal = parseInt(lines[8].trim(), 10);

        expect(paymentHash).toBeTruthy();
        expect(paymentPreimage).toBeTruthy();
        expect(bolt11).toBeTruthy();
        expect(aliceBobBeforeLocal).toBeDefined();
        expect(aliceBobAfterLocal).toBeDefined();
        expect(bobCarolBeforeLocal).toBeDefined();
        expect(bobCarolAfterLocal).toBeDefined();
        expect(carolAliceBeforeLocal).toBeDefined();
        expect(carolAliceAfterLocal).toBeDefined();
    });

    it('should have valid payment hash format (64 hex characters)', () => {
        expect(paymentHash).toMatch(/^[a-f0-9]{64}$/);
        expect(paymentHash.length).toBe(64);
    });

    it('should have valid BOLT11 invoice format', () => {
        expect(bolt11).toMatch(/^lnbcrt[a-z0-9]+$/i);
        expect(bolt11.length).toBeGreaterThan(100);
    });

    it('should have valid payment preimage format (64 hex characters)', () => {
        expect(paymentPreimage).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should have preimage that hashes to payment hash', () => {
        const computed = createHash('sha256')
            .update(Buffer.from(paymentPreimage, 'hex'))
            .digest('hex');
        expect(computed).toBe(paymentHash);
    });

    it('should verify invoice details via decode', () => {
        const decoded = aliceLnCli(`decode ${bolt11}`);

        expect(decoded).toBeDefined();
        expect(decoded.payment_hash).toBe(paymentHash);
        expect(decoded.amount_msat).toBe(150000000);
        expect(decoded.description).toBe('Circular Rebalance');
    });

    it('should have invoice marked as paid on Alice node', () => {
        const invoices = aliceLnCli('listinvoices');

        expect(invoices.invoices).toBeDefined();
        expect(invoices.invoices.length).toBeGreaterThan(0);

        const invoice = invoices.invoices.find((inv: any) => inv.payment_hash === paymentHash);

        expect(invoice).toBeDefined();
        expect(invoice.status).toBe('paid');
    });

    it('should have circular topology with 3 channels', () => {
        const aliceChannels = aliceLnCli('listpeerchannels');
        const bobChannels = bobLnCli('listpeerchannels');

        const alicePeerIds = aliceChannels.channels.map((c: any) => c.peer_id);
        const bobInfo = bobLnCli('getinfo');
        const carolInfo = carolLnCli('getinfo');

        expect(alicePeerIds).toContain(bobInfo.id);
        expect(alicePeerIds).toContain(carolInfo.id);

        const bobPeerIds = bobChannels.channels.map((c: any) => c.peer_id);
        expect(bobPeerIds).toContain(carolInfo.id);
    });

    it('should have after-balances matching actual node state', () => {
        const aliceInfo = aliceLnCli('getinfo');
        const bobInfo = bobLnCli('getinfo');
        const carolInfo = carolLnCli('getinfo');

        const aliceChannels = aliceLnCli('listpeerchannels');
        const aliceBobChannel = aliceChannels.channels.find(
            (c: any) => c.peer_id === bobInfo.id
        );
        expect(aliceBobChannel).toBeDefined();
        expect(aliceBobAfterLocal).toBe(aliceBobChannel.to_us_msat);

        const bobChannels = bobLnCli('listpeerchannels');
        const bobCarolChannel = bobChannels.channels.find(
            (c: any) => c.peer_id === carolInfo.id
        );
        expect(bobCarolChannel).toBeDefined();
        expect(bobCarolAfterLocal).toBe(bobCarolChannel.to_us_msat);

        const carolChannels = carolLnCli('listpeerchannels');
        const carolAliceChannel = carolChannels.channels.find(
            (c: any) => c.peer_id === aliceInfo.id
        );
        expect(carolAliceChannel).toBeDefined();
        expect(carolAliceAfterLocal).toBe(carolAliceChannel.to_us_msat);
    });

    it('should show balance shift consistent with 150,000 sat payment', () => {
        const paymentMsat = 150000000;
        const feeTolerance = 5000000;

        const carolAliceDiff = carolAliceBeforeLocal - carolAliceAfterLocal;
        expect(carolAliceDiff).toBe(paymentMsat);

        const bobCarolDiff = bobCarolBeforeLocal - bobCarolAfterLocal;
        expect(bobCarolDiff).toBeGreaterThanOrEqual(paymentMsat);
        expect(bobCarolDiff).toBeLessThan(paymentMsat + feeTolerance);

        const aliceBobDiff = aliceBobBeforeLocal - aliceBobAfterLocal;
        expect(aliceBobDiff).toBeGreaterThanOrEqual(paymentMsat);
        expect(aliceBobDiff).toBeLessThan(paymentMsat + feeTolerance);
    });
});
