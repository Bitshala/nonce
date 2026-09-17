"""
Authoritative tests for programming-bitcoin week 5 (Jupyter chapter 8).

These are the same assertions the book ships, lifted out of `op.py`, `helper.py`
and `tx.py` so they no longer live in the files the student edits. In the
template they sit a few hundred lines below the function being exercised, in the
same file, which means "make the test pass" and "change the test" are the same
edit.

Copied into the chapter directory at grade time and driven by
lib/unittest_json.py, which — unlike the notebook's own `run()` — reports a
failure instead of discarding it.

Imports are deliberately inside the test methods: a student whose module does
not import cleanly should see that as the one test failing, not as a collection
error that takes the whole suite down with it.
"""

from unittest import TestCase


class Exercise1CheckMultisig(TestCase):
    """op.py: implement op_checkmultisig."""

    def test_op_checkmultisig(self):
        from op import decode_num, op_checkmultisig

        z = 0xE71BFA115715D6FD33796948126F40A8CDD39F187E4AFB03896795189FE1423C
        sig1 = bytes.fromhex(
            '3045022100dc92655fe37036f47756db8102e0d7d5e28b3beb83a8fef4f5dc0559'
            'bddfb94e02205a36d4e4e6c7fcd16658c50783e00c341609977aed3ad00937bf4e'
            'e942a8993701'
        )
        sig2 = bytes.fromhex(
            '3045022100da6bee3c93766232079a01639d07fa869598749729ae323eab8eef53'
            '577d611b02207bef15429dcadce2121ea07f233115c6f09034c0be68db99980b9a'
            '6c5e75402201'
        )
        sec1 = bytes.fromhex(
            '022626e955ea6ea6d98850c994f9107b036b1334f18ca8830bfff1295d21cfdb70'
        )
        sec2 = bytes.fromhex(
            '03b287eaf122eea69030a0e9feed096bed8045c8b98bec453e1ffac7fbdbd4bb71'
        )
        stack = [b'', sig1, sig2, b'\x02', sec1, sec2, b'\x02']

        self.assertTrue(op_checkmultisig(stack, z))
        self.assertEqual(decode_num(stack[0]), 1)


class Exercise2P2pkhAddress(TestCase):
    """helper.py: implement h160_to_p2pkh_address."""

    def test_p2pkh_address(self):
        from helper import h160_to_p2pkh_address

        h160 = bytes.fromhex('74d691da1574e6b3c192ecfb52cc8984ee7b6c56')
        self.assertEqual(
            h160_to_p2pkh_address(h160, testnet=False),
            '1BenRpVUFK65JFWcQSuHnJKzc4M8ZP8Eqa',
        )
        self.assertEqual(
            h160_to_p2pkh_address(h160, testnet=True),
            'mrAjisaT4LXL5MzE81sfcDYKU3wqWSvf9q',
        )


class Exercise3P2shAddress(TestCase):
    """helper.py: implement h160_to_p2sh_address."""

    def test_p2sh_address(self):
        from helper import h160_to_p2sh_address

        h160 = bytes.fromhex('74d691da1574e6b3c192ecfb52cc8984ee7b6c56')
        self.assertEqual(
            h160_to_p2sh_address(h160, testnet=False),
            '3CLoMMyuoDQTPRD3XYZtCvgvkadrAdvdXh',
        )
        self.assertEqual(
            h160_to_p2sh_address(h160, testnet=True),
            '2N3u1R6uwQfuobCqbCgBkpsgBxvr1tZpe7B',
        )


class Exercise5VerifyP2sh(TestCase):
    """tx.py: extend sig_hash and verify_input to handle p2sh."""

    def test_verify_p2sh(self):
        from tx import TxFetcher

        # The transaction is served from the repository's tx.cache, so this
        # needs no network — and must not acquire one, or a wrong answer could
        # come back as a fetch failure.
        TxFetcher.load_cache('../tx.cache')
        tx = TxFetcher.fetch(
            '46df1a9484d0a81d03ce0ee543ab6e1a23ed06175c104a178268fad381216c2b'
        )
        self.assertTrue(tx.verify())
