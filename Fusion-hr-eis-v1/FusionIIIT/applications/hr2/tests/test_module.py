from applications.hr2 import selectors, services
from applications.hr2.tests.conftest import BaseModuleTestCase


class RegistrySmokeTest(BaseModuleTestCase):
    def test_form_model_registry_contains_all_expected_forms(self):
        self.mark_case(
            "SMOKE-01",
            "Registry contains all expected form models",
            "Inspect the selector registry entries",
            "All expected form models are present",
            category="SMOKE",
        )
        expected = {"LTC", "CPDAAdvance", "CPDAReimbursement", "Leave", "Appraisal"}
        self.assertEqual(set(selectors.FORM_MODEL_REGISTRY.keys()), expected)

    def test_form_type_filetracking_contains_all_expected_forms(self):
        self.mark_case(
            "SMOKE-02",
            "File tracking mapping contains all expected forms",
            "Inspect the service form-type mapping",
            "All expected form type mappings are present",
            category="SMOKE",
        )
        expected = {"LTC", "CPDAAdvance", "CPDAReimbursement", "Leave", "Appraisal"}
        self.assertEqual(set(services.FORM_TYPE_FILETRACKING.keys()), expected)
