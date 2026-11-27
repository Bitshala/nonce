import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from bbr_grade import report_results


class RustReportTest(unittest.TestCase):
    def report(self, output, status=0, timed_out=False):
        with patch('bbr_grade.write') as write_report:
            report_results('report.json', output, status, timed_out, {'first', 'second'})
        _, passed, tests = write_report.call_args.args
        return passed, {test['name']: test for test in tests}

    def test_complete_run_can_have_an_ignored_test(self):
        passed, tests = self.report(
            'running 2 tests\ntest first ... ok\ntest second ... ignored, reason\n'
            'test result: ok. 1 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out\n'
        )
        self.assertTrue(passed)
        self.assertEqual(tests['second']['status'], 'skipped')

    def test_zero_exit_requires_the_expected_names_and_matching_summary(self):
        summary = 'test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\n'
        for results, final_line in [
            ('test first ... ok\n', summary),
            ('test first ... ok\ntest first ... ok\n', summary),
            ('test first ... ok\ntest other ... ok\n', summary),
            ('test first ... ok\ntest second ... ok\n', ''),
            ('test first ... ok\ntest second ... ok\n', summary.replace('2 passed', '1 passed')),
        ]:
            with self.subTest(results=results, final_line=final_line):
                passed, tests = self.report('running 2 tests\n' + results + final_line)
                self.assertFalse(passed)
                self.assertEqual(tests['Every test reported a result']['status'], 'failed')

    def test_failed_test_gets_its_panic_message(self):
        passed, tests = self.report(
            'running 2 tests\ntest first ... FAILED\ntest second ... ok\n\n'
            'failures:\n\n---- first stdout ----\nassertion failed\n\n'
            'failures:\n    first\n\n'
            'test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out\n'
            'error: test failed\n',
            status=101,
        )
        self.assertFalse(passed)
        self.assertEqual(tests['first']['message'], 'assertion failed')
        self.assertCountEqual(tests, ['first', 'second'])

    def test_timeout_names_the_test_still_running(self):
        passed, tests = self.report(
            'running 2 tests\ntest first ... ok\n'
            'test second has been running for over 60 seconds\n',
            status=-9,
            timed_out=True,
        )
        self.assertFalse(passed)
        self.assertEqual(tests['first']['status'], 'passed')
        self.assertIn('8-minute limit', tests['second']['message'])

    def test_cargo_build_error_is_reported(self):
        passed, tests = self.report('error: could not compile the crate', status=101)
        self.assertFalse(passed)
        self.assertIn('could not compile', tests['Cargo tests ran']['message'])
