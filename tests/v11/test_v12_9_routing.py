import json
from pathlib import Path
import unittest

from tools.ai_factory.curriculum.relation_engine import RelationAwareComplaintAnalyzer


class RoutingIntegrityTest(unittest.TestCase):
    def test_shared_regressions(self):
        for case in json.loads(Path(__file__).with_name('v12_9_routing_cases.json').read_text(encoding='utf-8')):
            with self.subTest(case=case['id']):
                actual = RelationAwareComplaintAnalyzer.analyze(case['text']).proposed_departments
                self.assertEqual(sorted(actual), case['expected'])
