import importlib.util,json,pathlib,tempfile,unittest
from unittest.mock import patch
P=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('voice_common',P/'studio/common.py');common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
class SafetyTests(unittest.TestCase):
 def test_missing_consent(self):
  with self.assertRaises(PermissionError):common.require_consent({})
 def test_guardian_missing(self):
  with self.assertRaises(PermissionError):common.require_consent({'subject_agreed':True,'guardian_required':True,'guardian_agreed':False,'purpose':'classroom_voice','record_location':'local-test-record'})
 def test_scope_mismatch(self):
  with self.assertRaises(PermissionError):common.require_consent({'subject_agreed':True,'guardian_required':False,'purpose':'other','record_location':'local-test-record'})
 def test_authorized_test_record(self):
  self.assertTrue(common.require_consent({'subject_agreed':True,'guardian_required':True,'guardian_agreed':True,'purpose':'classroom_voice','record_location':'synthetic-test-fixture-not-real-consent'}))
 def test_private_path_escape(self):
  with self.assertRaises(ValueError):common.safe_path('../outside')
 def test_atomic_json(self):
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'record.json';common.write_json(p,{'ok':True});self.assertEqual(json.loads(p.read_text()),{'ok':True})
 def test_transient_replace_retry(self):
  with tempfile.TemporaryDirectory() as folder:
   original=common.os.replace;calls=[]
   def retry(src,dst):
    calls.append(1)
    if len(calls)==1:raise PermissionError('synthetic transient lock')
    return original(src,dst)
   with patch.object(common.os,'replace',side_effect=retry),patch.object(common.time,'sleep'):
    p=pathlib.Path(folder)/'record.json';common.write_json(p,{'ok':True});self.assertEqual(len(calls),2)
 def test_nan_parameter(self):
  item={'id':'test','stage':'sample','kind':'sfx','prompt':'Synthetic test','seconds':2,'variants':1,'steps':100,'cfg':4,'volume':float('nan'),'seed':1,'bus':'animals'}
  with self.assertRaises(ValueError):common.validate_item(item)
if __name__=='__main__':unittest.main()
