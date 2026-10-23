"""Keep domain proof imports, theorem inventory and module sizes closed and reviewable."""
import re
from modules import KERNEL_MODULES


def check_layout(root, manifest):
    folder = root / 'proof/Commerce/Claims'
    names = [module.title() for module in KERNEL_MODULES]
    expected = {name + '.lean' for name in names}
    actual = {path.name for path in folder.glob('*.lean')}
    if actual != expected:
        raise ValueError('Unclassified proof domain: ' + str(actual ^ expected))
    entry = (root / 'proof/Commerce/Claims.lean').read_text()
    imports = re.findall(r'^import (.+)$', entry, re.M)
    if imports != ['Commerce.Claims.' + name for name in names]:
        raise ValueError('Proof entry must import every reviewed domain exactly once')
    declarations = []
    maximum = 0
    for name in names:
        text = (folder / (name + '.lean')).read_text()
        maximum = max(maximum, len(text.splitlines()))
        if len(text.splitlines()) > 320:
            raise ValueError('Proof domain exceeds 320 lines: ' + name)
        if re.findall(r'^import (.+)$', text, re.M) != ['Commerce.Generated']:
            raise ValueError('Domain claims must independently import the extracted model: ' + name)
        declarations += re.findall(r'^theorem ([A-Za-z_0-9]+)\b', text, re.M)
    registered = [t for row in manifest['policies'].values() for t in row['theorems']]
    if len(set(declarations)) != len(declarations) or sorted(declarations) != sorted(registered):
        raise ValueError('Unregistered, duplicate or missing theorem in domain proofs')
    return {'domainModules': len(names), 'maximumClaimModuleLines': maximum,
            'allDeclarationsRegistered': True}
