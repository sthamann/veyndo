"""Reproduce original extension acceptance in disposable Docker cells; never reuse a merchant database."""
import argparse, json, os, secrets, socket, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKAGE = ROOT / 'extensions/apps/shopware-compat'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--docker-context', help='Use an explicit context without changing the global default')
parser.add_argument('--cell-image', help='Reuse an already built image; resolved to its immutable ID')
args = parser.parse_args()
# The response-policy assertion exercises the real Studio document, not an API stub.
# Fail before building/starting any cell if a clean checkout has not built its UI.
required = ['frontend/dist/index.html', 'target/debug/veyndo', 'target/debug/shopware-compat']
missing = [p for p in required if not (ROOT / p).is_file()]
if missing:
    parser.error('Build the Rust binaries and Studio first (see app README); missing: ' + ', '.join(missing))
docker = ['docker'] + (['--context', args.docker_context] if args.docker_context else [])
name = 'veyndo-compat-test-' + secrets.token_hex(5)

def run(argv, quiet=False, **kwargs):
    return subprocess.run(argv, cwd=ROOT, check=True, text=True,
                          stdout=subprocess.PIPE if quiet else None, **kwargs)

def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

with tempfile.TemporaryDirectory(prefix=name) as temp:
    env_file = Path(temp) / 'cell.env'
    cell_port, db_port = port(), port()
    db_password, app_secret, pg_password = (secrets.token_hex(32) for _ in range(3))
    image = args.cell_image or name
    if not args.cell_image:
        run(docker + ['build', '-f', str(PACKAGE / 'deploy/Cell.Dockerfile'), '-t', image, '.'])
    image = run(docker + ['image', 'inspect', image, '--format', '{{.Id}}'], quiet=True).stdout.strip()
    env_file.write_text(f'CELL_IMAGE={image}\nCELL_URL=http://localhost:{cell_port}\nCELL_PORT={cell_port}\nCELL_SECRET={app_secret}\nCELL_DB_PASSWORD={db_password}\nCELL_INGRESS_IMAGE={name}-ingress\n')
    env_file.chmod(0o600)
    compose = docker + ['compose', '--env-file', str(env_file), '-p', name, '-f', str(PACKAGE / 'deploy/compose.yaml')]
    pg_name = name + '-pg'
    try:
        run(docker + ['run', '-d', '--name', pg_name, '-p', f'127.0.0.1:{db_port}:5432',
                      '-e', 'POSTGRES_USER=commerce', '-e', 'POSTGRES_DB=commerce',
                      '-e', 'POSTGRES_PASSWORD', 'postgres:17-alpine'], quiet=True,
            env={**os.environ, 'POSTGRES_PASSWORD': pg_password})
        for _ in range(60):
            if subprocess.run(docker + ['exec', pg_name, 'pg_isready', '-U', 'commerce'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('Isolated PostgreSQL did not become ready')
        run(compose + ['--profile', 'setup', 'run', '--rm', 'setup'])
        run(compose + ['up', '-d', '--build', 'ingress', 'web', 'worker', 'scheduler'])
        cli = compose + ['exec', '-T', 'web', 'php', 'bin/console']
        for extension, target in [('VeyndoCompatibilityFixture', 'plugins'), ('VeyndoCompatibilityApp', 'apps')]:
            run(compose + ['cp', str(PACKAGE / 'tests/fixtures' / extension), f'web:/var/www/html/custom/{target}/{extension}'])
        run(cli + ['plugin:refresh', '--no-interaction'])
        run(cli + ['app:install', 'VeyndoCompatibilityApp', '--force', '--no-interaction'])
        run(cli + ['assets:install', '--no-interaction'])
        run(cli + ['theme:compile', '--no-interaction'])
        client, secret = 'SWIA' + secrets.token_hex(14).upper(), secrets.token_hex(32)
        run(cli + ['integration:create', 'Synthetic compatibility acceptance', '--admin', '--access-key', client, '--secret-access-key', secret, '--no-interaction'], quiet=True)
        url = f'http://localhost:{cell_port}'
        for _ in range(60):
            try:
                with urllib.request.urlopen(url + '/admin', timeout=3) as response:
                    assert response.status == 200
                break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError('Original Shopware administration did not become ready')
        run([sys.executable, str(PACKAGE / 'tests/integration.py')], env={
            **os.environ, 'DATABASE_URL': f'postgres://commerce:{pg_password}@127.0.0.1:{db_port}/commerce',
            'SHOPWARE_TEST_URL': url, 'SHOPWARE_TEST_CLIENT': client, 'SHOPWARE_TEST_SECRET': secret,
            'SHOPWARE_TEST_KEEP_RUNNING': '0',
        })
        # The same source package executes unchanged in original Shopware and native Veyndo.
        run(compose + ['cp', str(PACKAGE / 'native/tests/fixture'), 'web:/var/www/html/custom/plugins/NativeDiscountReference'])
        run(cli + ['plugin:refresh', '--no-interaction'])
        run(cli + ['plugin:install', '--activate', 'NativeDiscountReference', '--no-interaction'])
        auth_request=urllib.request.Request(url+'/api/oauth/token',data=json.dumps({'grant_type':'client_credentials','client_id':client,'client_secret':secret}).encode(),headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(auth_request,timeout=30) as response:
            token=json.load(response)['access_token']
        from original_checkout import verify
        original=verify(url,{'Authorization':'Bearer '+token},price=24.9,discount_minor=249,expect_fixture=False)
        (ROOT/'artifacts/shopware-native-original-result.json').write_text(json.dumps(original,indent=2)+'\n')
        run([sys.executable,str(PACKAGE/'tests/native.py')],env={**os.environ,'DATABASE_URL':f'postgres://commerce:{pg_password}@127.0.0.1:{db_port}/commerce','DB_RLS_REQUIRED':'false','DB_STRICT_ROLE_SEPARATION':'false'})
        native=json.loads((ROOT/'artifacts/shopware-native-result.json').read_text())
        for field in ['positionPrice','emptyCart','stock']:
            assert original[field]==native[field],(field,original[field],native[field])
        print('PASS identical plugin source: original/native discounted goods total, stock and empty active cart',flush=True)
        # Uninstall must preserve migration data, not merely acknowledge the API call.
        preserved = run(compose + ['exec', '-T', 'database', 'sh', '-c',
                        'mariadb -ushopware -p"$MARIADB_PASSWORD" shopware -Nse "SELECT value FROM veyndo_compat_fixture WHERE id=1"'], quiet=True).stdout.strip()
        assert preserved == 'installed', preserved
        runtime = json.loads(run(docker + ['inspect', name + '-web-1'], quiet=True).stdout)[0]
        assert runtime['Config']['User'] == 'www-data'
        assert runtime['HostConfig']['ReadonlyRootfs']
        assert 'ALL' in runtime['HostConfig']['CapDrop']
        assert len(runtime['NetworkSettings']['Networks']) == 1
        network = next(iter(runtime['NetworkSettings']['Networks']))
        assert json.loads(run(docker + ['network', 'inspect', network], quiet=True).stdout)[0]['Internal']
        print('PASS original administration, preserved plugin data and container identity/root/network isolation', flush=True)
    finally:
        # Only names generated by this invocation are removed. No shared or live resources.
        subprocess.run(compose + ['--profile', 'setup', 'down', '--volumes', '--remove-orphans'], check=False)
        subprocess.run(docker + ['rm', '-f', '-v', pg_name], check=False, stdout=subprocess.DEVNULL)
