"""Registered migration verification; provider fixtures and runtime code remain under the app package."""
import runpy,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
subprocess.run(['cargo','build','--locked','--package','veyndo-migration','--bin','migration-assistant'],cwd=root,check=True)
for case in ['normalization.py','visibility.py','crm.py','transport.py','exports.py']:
    subprocess.run([sys.executable,str(root/'extensions/apps/migration/tests'/case)],cwd=root,check=True)
runpy.run_path(str(root/'extensions/apps/migration/tests/native_import.py'),run_name='__main__')
