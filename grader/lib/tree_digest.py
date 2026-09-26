#!/usr/bin/env python3
"""
One hash over a directory of files, for pinning data the tests trust.

    tree_digest.py <dir> [glob]        print the digest
    tree_digest.py <dir> [glob] --check <expected>

Some assignments ship a corpus the suite reads as its source of truth —
bitcoin-protocol-development week 3 gives the student 8,132 mempool
transactions and asks them to mine a block from it. The spec then checks the
block against that same corpus, so editing it is worth marks: add a txid to
`mempool.json` and any transaction passes the membership check, or set `weight`
to 0 and the block weight limit stops binding.

Restoring 63 MB through fixtures on every run would fix it and cost a minute of
artifact transfer each time. Pinning the digest costs 64 bytes.

Covers file names and contents, so an addition, a deletion, or an edit all move
the digest. Names are sorted, so the walk order of the filesystem does not.
"""

import hashlib
import pathlib
import sys


def digest(root, pattern='*'):
    root = pathlib.Path(root)
    if not root.is_dir():
        raise SystemExit(f'Not a directory: {root}')

    overall = hashlib.sha256()
    for path in sorted(root.glob(pattern)):
        if not path.is_file():
            continue
        # The name goes in alongside the contents: hashing contents alone would
        # let two files swap names without moving the digest.
        overall.update(path.name.encode())
        overall.update(b'\0')
        overall.update(hashlib.sha256(path.read_bytes()).digest())

    return overall.hexdigest()


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    root = argv[1]
    pattern = '*'
    expected = None

    rest = argv[2:]
    if rest and rest[0] != '--check':
        pattern = rest.pop(0)
    if rest:
        if rest[0] != '--check' or len(rest) < 2:
            print('usage: tree_digest.py <dir> [glob] --check <expected>', file=sys.stderr)
            return 2
        expected = rest[1]

    actual = digest(root, pattern)

    if expected is None:
        print(actual)
        return 0

    if actual == expected:
        return 0

    print(f'{root} does not match the digest this assignment pins.', file=sys.stderr)
    print(f'  expected {expected}', file=sys.stderr)
    print(f'  actual   {actual}', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
